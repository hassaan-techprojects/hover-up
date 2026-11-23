import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers.get("x-razorpay-signature");
    if (!webhookSecret || !signature) {
      return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 400 });
    }

    const rawBody = await request.text();
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
            amount?: number;
            currency?: string;
          };
        };
      };
    };

    if (!["payment.captured", "order.paid"].includes(event.event || "")) {
      return NextResponse.json({ received: true });
    }

    const gatewayPayment = event.payload?.payment?.entity;
    if (!gatewayPayment?.id || !gatewayPayment.order_id || gatewayPayment.status !== "captured") {
      return NextResponse.json({ received: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { gateway: "RAZORPAY", transactionId: gatewayPayment.order_id },
    });
    if (!payment) return NextResponse.json({ received: true });

    if (payment.status !== "PAID") {
      if (
        gatewayPayment.currency !== "INR" ||
        gatewayPayment.amount !== Math.round(Number(payment.amount) * 100)
      ) {
        return NextResponse.json({ error: "Captured amount does not match the order." }, { status: 409 });
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { orderId: payment.orderId },
          data: { status: "PAID", transactionId: gatewayPayment.id, paidAt: new Date() },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: "PAID", status: "CONFIRMED" },
        }),
      ]);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Unable to process payment webhook." }, { status: 500 });
  }
}
