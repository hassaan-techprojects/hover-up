import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "You are not allowed to view orders." }, { status: 403 });
    }

    const [orders, totalOrders, awaitingProcessing, inFulfilment, paidRevenue] = await Promise.all([
      prisma.order.findMany({
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          items: true,
          payment: true,
          shipment: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.order.count({ where: { status: { in: ["PROCESSING", "SHIPPED"] } } }),
      prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    ]);

    return NextResponse.json({
      orders,
      canManage: true,
      stats: {
        totalOrders,
        awaitingProcessing,
        inFulfilment,
        paidRevenue: Number(paidRevenue._sum.totalAmount ?? 0),
      },
    });
  } catch (error) {
    console.error("Dashboard orders API error:", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}
