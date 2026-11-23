import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["ADMIN", "ANALYST"];

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to view store analytics." }, { status: 403 });
    }

    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 29);
    start.setUTCHours(0, 0, 0, 0);

    const [
      totalOrders,
      deliveredOrders,
      processingOrders,
      shippedOrders,
      cancelledOrders,
      pendingOrders,
      totalProducts,
      publishedProducts,
      draftProducts,
      inactiveProducts,
      totalCustomers,
      paidRevenue,
      recentOrders,
      chartOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "PROCESSING" } }),
      prisma.order.count({ where: { status: "SHIPPED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: "ACTIVE", isActive: true } }),
      prisma.product.count({ where: { status: "DRAFT" } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.customer.count(),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const chart = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return {
        date: dayKey(date),
        label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }),
        orders: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };
    });
    const chartByDate = new Map(chart.map((item) => [item.date, item]));

    for (const order of chartOrders) {
      const bucket = chartByDate.get(dayKey(order.createdAt));
      if (!bucket) continue;
      bucket.orders += 1;
      if (order.status === "PROCESSING") bucket.processing += 1;
      if (order.status === "SHIPPED") bucket.shipped += 1;
      if (order.status === "DELIVERED") bucket.delivered += 1;
      if (order.status === "CANCELLED") bucket.cancelled += 1;
    }

    return NextResponse.json({
      stats: {
        totalOrders,
        deliveredOrders,
        processingOrders,
        shippedOrders,
        cancelledOrders,
        pendingOrders,
        totalProducts,
        publishedProducts,
        draftOrInactiveProducts: draftProducts + inactiveProducts,
        totalCustomers,
        totalRevenue: Number(paidRevenue._sum.totalAmount ?? 0),
      },
      chart,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
      })),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Dashboard overview API error:", error);
    return NextResponse.json({ error: "Unable to load dashboard overview." }, { status: 500 });
  }
}
