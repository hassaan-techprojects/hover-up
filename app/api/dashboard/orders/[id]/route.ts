import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const shipmentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "PENDING",
  PROCESSING: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "RETURNED",
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can update order status." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { status?: keyof typeof shipmentStatus };
    const allowed = Object.keys(shipmentStatus);
    if (!body.status || !allowed.includes(body.status)) {
      return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
    }

    const current = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true, orderNumber: true } });
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const now = new Date();
    const nextStatus = body.status;
    const shipmentUpdate = {
      status: shipmentStatus[nextStatus],
      ...(nextStatus === "SHIPPED" ? { shippedAt: now } : {}),
      ...(nextStatus === "DELIVERED" ? { deliveredAt: now } : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
          shipment: {
            upsert: {
              create: shipmentUpdate,
              update: shipmentUpdate,
            },
          },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          items: true,
          payment: true,
          shipment: true,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "ORDER_STATUS_UPDATED",
          entity: "ORDER",
          entityId: id,
          description: `Order ${current.orderNumber} status changed from ${current.status} to ${nextStatus}.`,
          metadata: { previousStatus: current.status, status: nextStatus },
        },
      });

      return order;
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update order status API error:", error);
    return NextResponse.json({ error: "Unable to update this order." }, { status: 500 });
  }
}
