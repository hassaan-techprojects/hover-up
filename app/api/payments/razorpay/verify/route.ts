import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      orderId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!body.orderId || !body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Online payment verification is not configured." }, { status: 503 });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId: body.orderId },
      include: { order: true },
    });

    if (!payment || payment.gateway !== "RAZORPAY" || payment.transactionId !== body.razorpay_order_id) {
      return NextResponse.json({ error: "This payment does not match the selected order." }, { status: 409 });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ verified: true, orderNumber: payment.order.orderNumber });
    }

    const expected = createHmac("sha256", secret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(body.razorpay_signature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      return NextResponse.json({ error: "Online payment verification is not configured." }, { status: 503 });
    }

    const gatewayResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpay_payment_id)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      },
      cache: "no-store",
    });
    const gatewayPayment = await gatewayResponse.json();
    if (
      !gatewayResponse.ok ||
      gatewayPayment.order_id !== body.razorpay_order_id ||
      gatewayPayment.currency !== "INR" ||
      gatewayPayment.amount !== Math.round(Number(payment.amount) * 100) ||
      gatewayPayment.status !== "captured"
    ) {
      return NextResponse.json({ error: "The payment is not captured for the expected order amount." }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId: body.orderId },
        data: {
          status: "PAID",
          transactionId: body.razorpay_payment_id,
          paidAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: body.orderId },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      }),
    ]);

    return NextResponse.json({ verified: true, orderNumber: payment.order.orderNumber });
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json({ error: "Unable to verify this payment." }, { status: 500 });
  }
}
