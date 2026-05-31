import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitOrderEvent } from "@/lib/order-events";
import { sendPushToVenueTeam } from "@/lib/push-notify";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { createPayment } from "@/lib/yookassa";
import { hasActiveSubscription } from "@/lib/plans";

const orderItemSchema = z.object({
  menuItemId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
});

const createOrderSchema = z.object({
  venueId: z.string(),
  tableNumber: z.string().min(1, "Укажите номер столика"),
  comment: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1, "Корзина пуста"),
});

export async function POST(req: Request) {
  try {
    // Rate limit: max 5 orders per IP per 10 minutes
    const ip = getClientIP(req);
    const limit = rateLimit(`order:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.allowed) {
      const retryMin = Math.ceil(limit.retryAfterMs / 60000);
      return NextResponse.json(
        { error: `Слишком много заказов. Попробуйте через ${retryMin} мин.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { venueId, tableNumber, comment, items } = result.data;

    // Verify venue exists + get payment credentials
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        isActive: true,
        name: true,
        slug: true,
        ownerId: true,
        yookassaShopId: true,
        yookassaSecretKey: true,
      },
    });

    if (!venue || !venue.isActive) {
      return NextResponse.json(
        { error: "Заведение не найдено" },
        { status: 404 }
      );
    }

    // Block orders if the owner's subscription is inactive (past grace)
    const ownerSub = await hasActiveSubscription(venue.ownerId);
    if (!ownerSub.active) {
      return NextResponse.json(
        { error: "Заведение временно не принимает заказы" },
        { status: 403 }
      );
    }

    // Fetch all menu items with variants to validate and snapshot prices
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
      include: { variants: true },
    });

    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        throw new Error(`Позиция не найдена: ${item.menuItemId}`);
      }
      if (menuItem.isStopped) {
        throw new Error(`"${menuItem.name}" сейчас недоступна`);
      }

      let price = menuItem.price;
      let variantLabel: string | null = null;

      if (item.variantId) {
        const variant = menuItem.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Вариант не найден для "${menuItem.name}"`);
        }
        price = variant.price;
        variantLabel = variant.label;
      }

      totalAmount += price * item.quantity;

      return {
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        priceAtOrder: price,
        itemName: menuItem.name,
        variantLabel,
      };
    });

    // Generate order number (max for venue today + 1)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrder = await prisma.order.findFirst({
      where: {
        venueId,
        createdAt: { gte: today },
      },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    // Determine if payment is available
    const hasPayment = !!(venue.yookassaShopId && venue.yookassaSecretKey);

    const order = await prisma.order.create({
      data: {
        venueId,
        orderNumber,
        tableNumber: tableNumber || null,
        comment: comment || null,
        totalAmount,
        paymentStatus: hasPayment ? "PENDING" : "UNPAID",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Create YooKassa payment if credentials exist
    let confirmationUrl: string | null = null;

    if (hasPayment) {
      try {
        const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
        const returnUrl = `${origin}/order/${order.id}`;

        const payment = await createPayment({
          shopId: venue.yookassaShopId!,
          secretKey: venue.yookassaSecretKey!,
          amount: totalAmount,
          description: `Заказ #${orderNumber} — ${venue.name}`,
          returnUrl,
          orderId: order.id,
          venueId,
        });

        // Save payment ID
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentId: payment.id },
        });

        confirmationUrl = payment.confirmation?.confirmation_url || null;
      } catch (err) {
        console.error("YooKassa payment creation failed:", err);
        // Order is created but payment failed — set back to UNPAID
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "UNPAID" },
        });
      }
    }

    // Emit SSE event for real-time updates
    emitOrderEvent({
      type: "new_order",
      venueId,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        comment: order.comment,
        createdAt: order.createdAt,
        items: order.items,
      },
    });

    // Send push notification to venue owner AND staff.
    // MUST await — on Vercel the serverless function is frozen right after
    // the response is returned, so fire-and-forget pushes often never reach
    // APNs/FCM (the "sometimes arrives" bug). Awaiting guarantees delivery;
    // a push failure must not break order creation, hence the try/catch.
    try {
      await sendPushToVenueTeam(venueId, {
        title: `Новый заказ #${order.orderNumber}`,
        body: order.tableNumber
          ? `Столик ${order.tableNumber} · ${order.items.length} позиций`
          : `${order.items.length} позиций`,
        tag: `order-${order.id}`,
        url: `/admin/venues/${venueId}/orders`,
      });
    } catch {
      // ignore push errors — order is already created
    }

    return NextResponse.json(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        confirmationUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
