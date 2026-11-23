import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ADMIN", "ANALYST"].includes(session.user.role)) {
      return NextResponse.json({ error: "You are not allowed to view orders." }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        shipment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ orders, canManage: session.user.role === "ADMIN" });
  } catch (error) {
    console.error("Dashboard orders API error:", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}
