import { orderEmitter, type OrderEvent } from "@/lib/order-events";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      }

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat" }));
      }, 30000);

      function onEvent(event: OrderEvent) {
        send(JSON.stringify({
          type: event.type,
          status: (event.order as Record<string, unknown>).status,
          paymentStatus: (event.order as Record<string, unknown>).paymentStatus,
        }));
      }

      orderEmitter.on(`order:${orderId}`, onEvent);

      // Cleanup on close
      _req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        orderEmitter.off(`order:${orderId}`, onEvent);
      });

      // Initial ping
      send(JSON.stringify({ type: "connected" }));
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
