import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      orderNumber?: string;
      email?: string;
      phone?: string;
    };

    const orderNumber = body.orderNumber?.trim().toUpperCase() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";

    if (!orderNumber && !(email && phone)) {
      return NextResponse.json(
        { error: "Enter an order number, or enter both your checkout email and phone number." },
        { status: 400 }
      );
    }

    const include = {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      items: true,
      payment: true,
      shipment: true,
    } as const;

    if (orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include,
      });

      if (!order) {
        return NextResponse.json({ error: "We couldn't find an order with that order number." }, { status: 404 });
      }

      return NextResponse.json({ order });
    }

    const candidates = await prisma.order.findMany({
      where: {
        OR: [
          { customer: { is: { email: { equals: email, mode: "insensitive" } } } },
          { shippingAddress: { path: ["email"], string_contains: email } },
        ],
      },
      include,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const normalizedInputPhone = normalizePhone(phone);
    const matches = candidates.filter((order) => {
      const address = order.shippingAddress as Record<string, unknown> | null;
      const savedEmail = String(address?.email || order.customer.email || "").trim().toLowerCase();
      const savedPhone = String(address?.phone || order.customer.phone || "");
      return savedEmail === email && normalizePhone(savedPhone) === normalizedInputPhone;
    });

    if (matches.length === 0) {
      return NextResponse.json({ error: "We couldn't find an order matching that email and phone number." }, { status: 404 });
    }

    const ids = matches.map((order) => order.id);
    const history = await prisma.activityLog.findMany({
      where: { entity: "ORDER", entityId: { in: ids }, action: "ORDER_STATUS_UPDATED" },
      orderBy: { createdAt: "asc" },
      select: { entityId: true, description: true, metadata: true, createdAt: true },
    });

    const orders = matches.map((order) => ({
      ...order,
      statusHistory: history.filter((entry) => entry.entityId === order.id),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Guest order lookup error:", error);
    return NextResponse.json({ error: "Unable to look up this order." }, { status: 500 });
  }
}
