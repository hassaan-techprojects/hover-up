import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderNumber?: string; email?: string; phone?: string };
    const orderNumber = body.orderNumber?.trim().toUpperCase();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.replace(/\s+/g, "");

    if (!orderNumber || !email || !phone) {
      return NextResponse.json({ error: "Enter your order number, email, and contact number." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        shipment: true,
      },
    });

    const address = order?.shippingAddress as Record<string, unknown> | null;
    const savedEmail = (address?.email as string | undefined)?.toLowerCase() || order?.customer.email || "";
    const savedPhone = (address?.phone as string | undefined) || order?.customer.phone || "";
    const normalizedSavedPhone = savedPhone.replace(/\D/g, "");
    const normalizedInputPhone = phone.replace(/\D/g, "");
    if (!order || savedEmail.toLowerCase() !== email || normalizedSavedPhone !== normalizedInputPhone) {
      return NextResponse.json({ error: "We couldn't find an order matching those details." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Guest order lookup error:", error);
    return NextResponse.json({ error: "Unable to look up this order." }, { status: 500 });
  }
}
