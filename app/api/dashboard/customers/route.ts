import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "You are not allowed to view customers." }, { status: 403 });
    }

    const [totalCustomers, orderedCustomers, shippedCustomers, deliveredCustomers, customers] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { orders: { some: {} } } }),
      prisma.customer.count({ where: { orders: { some: { status: "SHIPPED" } } } }),
      prisma.customer.count({ where: { orders: { some: { status: "DELIVERED" } } } }),
      prisma.customer.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, isActive: true } },
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          orders: {
            orderBy: { createdAt: "desc" },
            include: {
              items: true,
              payment: true,
              shipment: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: { totalCustomers, orderedCustomers, shippedCustomers, deliveredCustomers },
      customers,
    });
  } catch (error) {
    console.error("Dashboard customers API error:", error);
    return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
  }
}
