import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to view orders." }, { status: 403 });
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    const phoneDigits = search.replace(/\D/g, "");
    const phoneSearchTail = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "";
    const orders = await prisma.order.findMany({
      ...(search ? {
        where: {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
            { shippingAddress: { path: ["email"], string_contains: search } },
            { shippingAddress: { path: ["phone"], string_contains: search } },
            ...(phoneSearchTail ? [
              { shippingAddress: { path: ["phone"], string_contains: phoneSearchTail } },
              { customer: { is: { phone: { contains: phoneSearchTail } } } },
            ] : []),
            {
              customer: {
                is: {
                  OR: [
                    { id: { contains: search, mode: "insensitive" } },
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search } },
                  ],
                },
              },
            },
          ],
        },
      } : {}),
      include: {
        customer: { select: { id: true, userId: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        shipment: true,
      },
      orderBy: { createdAt: "desc" },
      take: search ? 500 : 200,
    });

    const orderIds = orders.map((order) => order.id);
    const history = orderIds.length ? await prisma.activityLog.findMany({
      where: { entity: "ORDER", entityId: { in: orderIds }, action: "ORDER_STATUS_UPDATED" },
      orderBy: { createdAt: "asc" },
      select: { entityId: true, description: true, metadata: true, createdAt: true },
    }) : [];

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        customer: { ...order.customer, hasAccount: Boolean(order.customer.userId) },
        statusHistory: history.filter((entry) => entry.entityId === order.id),
      })),
      canManage: session.user.role === "ADMIN",
    });
  } catch (error) {
    console.error("Dashboard orders API error:", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}
