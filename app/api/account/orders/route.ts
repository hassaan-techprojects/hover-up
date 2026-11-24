import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Sign in to view your account orders." }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        orders: {
          include: { items: true, payment: true, shipment: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const orderIds = customer?.orders.map((order) => order.id) ?? [];
    const history = orderIds.length ? await prisma.activityLog.findMany({
      where: { entity: "ORDER", entityId: { in: orderIds }, action: "ORDER_STATUS_UPDATED" },
      orderBy: { createdAt: "asc" },
      select: { entityId: true, description: true, metadata: true, createdAt: true },
    }) : [];

    const orders = (customer?.orders ?? []).map((order) => ({
      ...order,
      statusHistory: history.filter((entry) => entry.entityId === order.id),
    }));

    return NextResponse.json({
      customer: customer ? {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      } : null,
      orders,
    });
  } catch (error) {
    console.error("Customer orders API error:", error);
    return NextResponse.json({ error: "Unable to load your orders." }, { status: 500 });
  }
}
