import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitWaiterCall } from "@/lib/order-events";
import { z } from "zod";

const schema = z.object({
  tableNumber: z.string().min(1, "Укажите номер столика"),
});

// Simple in-memory rate limit: 1 call per table per 60 seconds
const callTimestamps = new Map<string, number>();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params;

  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tableNumber } = result.data;

    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, isActive: true },
    });

    if (!venue || !venue.isActive) {
      return NextResponse.json(
        { error: "Заведение не найдено" },
        { status: 404 }
      );
    }

    // Rate limit: 1 call per table per 60 seconds
    const key = `${venueId}:${tableNumber}`;
    const lastCall = callTimestamps.get(key);
    const now = Date.now();

    if (lastCall && now - lastCall < 60_000) {
      const secondsLeft = Math.ceil((60_000 - (now - lastCall)) / 1000);
      return NextResponse.json(
        { error: `Подождите ${secondsLeft} сек. перед повторным вызовом` },
        { status: 429 }
      );
    }

    callTimestamps.set(key, now);

    // Clean old entries every 100 calls
    if (callTimestamps.size > 500) {
      const cutoff = now - 120_000;
      for (const [k, v] of callTimestamps) {
        if (v < cutoff) callTimestamps.delete(k);
      }
    }

    // Emit SSE event to admin/waiter dashboard
    emitWaiterCall(venueId, tableNumber);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
