import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to view customers." }, { status: 403 });
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    const customers = await prisma.customer.findMany({
      where: search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { id: { contains: search, mode: "insensitive" } },
        ],
      } : undefined,
      include: {
        user: { select: { isActive: true } },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            createdAt: true,
            items: { select: { productName: true, quantity: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = customers.map((customer) => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      email: customer.email,
      phone: customer.phone,
      hasAccount: Boolean(customer.userId),
      isActive: customer.user?.isActive ?? false,
      createdAt: customer.createdAt,
      totalOrders: customer.orders.length,
      totalSpent: customer.orders
        .filter((order) => order.paymentStatus === "PAID")
        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
      orders: customer.orders,
    }));

    return NextResponse.json({
      customers: mapped,
      stats: {
        totalCustomers: mapped.length,
        registeredCustomers: mapped.filter((customer) => customer.hasAccount).length,
        repeatCustomers: mapped.filter((customer) => customer.totalOrders > 1).length,
        paidRevenue: mapped.reduce((sum, customer) => sum + customer.totalSpent, 0),
      },
    });
  } catch (error) {
    console.error("Dashboard customers API error:", error);
    return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
  }
}
