import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";

export const runtime = "nodejs";

const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

export async function GET() {
  const auth = await getDashboardAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        shipment: true,
      },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Dashboard orders fetch failed:", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getDashboardAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const status = typeof body.status === "string" ? body.status : "";
    const carrier = typeof body.carrier === "string" ? body.carrier.trim().slice(0, 100) : "";
    const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim().slice(0, 120) : "";
    const trackingUrl = typeof body.trackingUrl === "string" ? body.trackingUrl.trim().slice(0, 500) : "";
    if (!orderId || !statuses.includes(status as typeof statuses[number])) {
      return NextResponse.json({ error: "Select a valid order status." }, { status: 400 });
    }
    const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, shipment: { select: { id: true } } } });
    if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const shipmentStatus = status === "SHIPPED" ? "SHIPPED" : status === "DELIVERED" ? "DELIVERED" : status === "CANCELLED" ? "CANCELLED" : status === "PROCESSING" ? "PACKED" : "PENDING";
    const now = new Date();
    const order = await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: status as typeof statuses[number] } });
      await tx.shipment.upsert({
        where: { orderId },
        create: { orderId, status: shipmentStatus, carrier: carrier || null, trackingNumber: trackingNumber || null, trackingUrl: trackingUrl || null, ...(status === "SHIPPED" ? { shippedAt: now } : {}), ...(status === "DELIVERED" ? { deliveredAt: now } : {}) },
        update: { status: shipmentStatus, carrier: carrier || undefined, trackingNumber: trackingNumber || undefined, trackingUrl: trackingUrl || undefined, ...(status === "SHIPPED" ? { shippedAt: now } : {}), ...(status === "DELIVERED" ? { deliveredAt: now } : {}) },
      });
      return tx.order.findUnique({ where: { id: orderId }, include: { customer: true, items: true, payment: true, shipment: true } });
    });
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Dashboard order update failed:", error);
    return NextResponse.json({ error: "Unable to update this order. Check that the tracking number is not already assigned." }, { status: 500 });
  }
}
