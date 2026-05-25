import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { orderEmitter, type OrderEvent } from "@/lib/order-events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return new Response("venueId is required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(": connected\n\n"));

      const handler = (event: OrderEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      orderEmitter.on(`venue:${venueId}`, handler);

      // Keepalive every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        orderEmitter.off(`venue:${venueId}`, handler);
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
