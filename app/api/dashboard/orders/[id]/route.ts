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
    const body = await request.json() as {
      status?: keyof typeof shipmentStatus;
      expectedDeliveryAt?: string | null;
      shippedAt?: string | null;
      deliveredAt?: string | null;
      carrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
    };
    const allowed = Object.keys(shipmentStatus);
    if (!body.status || !allowed.includes(body.status)) {
      return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
    }

    const current = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, orderNumber: true, shipment: true, payment: { select: { method: true, status: true } } },
    });
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const now = new Date();
    const nextStatus = body.status;
    const parseDate = (value: string | null | undefined) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const parsed = new Date(`${value}T12:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid shipment date.");
      return parsed;
    };
    const expectedDeliveryAt = parseDate(body.expectedDeliveryAt);
    const shippedAt = parseDate(body.shippedAt);
    const deliveredAt = parseDate(body.deliveredAt);
    const shipmentUpdate = {
      status: shipmentStatus[nextStatus],
      ...(body.expectedDeliveryAt !== undefined ? { expectedDeliveryAt } : {}),
      ...(body.shippedAt !== undefined ? { shippedAt } : nextStatus === "SHIPPED" ? { shippedAt: current.shipment?.shippedAt ?? now } : {}),
      ...(body.deliveredAt !== undefined ? { deliveredAt } : nextStatus === "DELIVERED" ? { deliveredAt: current.shipment?.deliveredAt ?? now } : {}),
      ...(body.carrier !== undefined ? { carrier: body.carrier?.trim() || null } : {}),
      ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber?.trim() || null } : {}),
      ...(body.trackingUrl !== undefined ? { trackingUrl: body.trackingUrl?.trim() || null } : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === "DELIVERED" && current.payment?.method === "COD" ? { paymentStatus: "PAID" as const } : {}),
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

      if (nextStatus === "DELIVERED" && current.payment?.method === "COD" && current.payment.status !== "PAID") {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: "PAID", paidAt: now },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: current.status === nextStatus ? "SHIPMENT_DETAILS_UPDATED" : "ORDER_STATUS_UPDATED",
          entity: "ORDER",
          entityId: id,
          description: current.status === nextStatus
            ? `Shipment details updated for order ${current.orderNumber}.`
            : `Order ${current.orderNumber} status changed from ${current.status} to ${nextStatus}.`,
          metadata: { previousStatus: current.status, status: nextStatus, expectedDeliveryAt: body.expectedDeliveryAt ?? null },
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
