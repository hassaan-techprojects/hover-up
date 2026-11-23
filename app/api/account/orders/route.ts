import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to view your orders." }, { status: 401 });
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, include: { items: true, payment: true, shipment: true } },
      },
    });
    if (!customer) return NextResponse.json({ customer: null, orders: [] });
    return NextResponse.json({ customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone }, orders: customer.orders });
  } catch (error) {
    console.error("Customer order history failed:", error);
    return NextResponse.json({ error: "Unable to load your order history." }, { status: 500 });
  }
}
