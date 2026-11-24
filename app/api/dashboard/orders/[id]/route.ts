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

const progression = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

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
    const nextStatus = body.status;
    if (!nextStatus || !Object.prototype.hasOwnProperty.call(shipmentStatus, nextStatus)) {
      return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
    }

    const current = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, orderNumber: true, payment: { select: { method: true, status: true } } },
    });
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (current.status === "CANCELLED" || current.status === "DELIVERED") {
      return NextResponse.json({ error: "This order is already closed and its status cannot be changed." }, { status: 409 });
    }

    if (nextStatus !== "CANCELLED" && nextStatus !== "REFUNDED") {
      const currentIndex = progression.indexOf(current.status as (typeof progression)[number]);
      const nextIndex = progression.indexOf(nextStatus as (typeof progression)[number]);
      if (nextIndex < 0 || nextIndex < currentIndex) {
        return NextResponse.json({ error: "Order status can only move forward. Use Cancelled if the order will not be fulfilled." }, { status: 409 });
      }
    }

    const now = new Date();
    const statusesToRecord: string[] = [];
    if (nextStatus === "CANCELLED" || nextStatus === "REFUNDED") {
      statusesToRecord.push(nextStatus);
    } else {
      const currentIndex = progression.indexOf(current.status as (typeof progression)[number]);
      const nextIndex = progression.indexOf(nextStatus as (typeof progression)[number]);
      for (let index = currentIndex + 1; index <= nextIndex; index += 1) {
        statusesToRecord.push(progression[index]);
      }
    }

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
          ...(nextStatus === "DELIVERED" && current.payment?.method === "COD" ? { paymentStatus: "PAID" as const } : {}),
          shipment: {
            upsert: {
              create: shipmentUpdate,
              update: shipmentUpdate,
            },
          },
        },
        include: {
          customer: { select: { id: true, userId: true, firstName: true, lastName: true, email: true, phone: true } },
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

      for (const status of statusesToRecord) {
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "ORDER_STATUS_UPDATED",
            entity: "ORDER",
            entityId: id,
            description: `Order ${current.orderNumber} status changed to ${status}.`,
            metadata: { previousStatus: current.status, status, recordedTogether: statusesToRecord.length > 1 },
            createdAt: now,
          },
        });
      }

      return order;
    });

    const statusHistory = await prisma.activityLog.findMany({
      where: { entity: "ORDER", entityId: id, action: "ORDER_STATUS_UPDATED" },
      orderBy: { createdAt: "asc" },
      select: { description: true, metadata: true, createdAt: true },
    });

    return NextResponse.json({
      order: {
        ...updated,
        customer: { ...updated.customer, hasAccount: Boolean(updated.customer.userId) },
        statusHistory,
      },
    });
  } catch (error) {
    console.error("Update order status API error:", error);
    return NextResponse.json({ error: "Unable to update this order." }, { status: 500 });
  }
}
