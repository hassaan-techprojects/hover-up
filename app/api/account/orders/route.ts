import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Sign in to view your account orders." }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        orders: {
          include: { items: true, payment: true, shipment: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ customer: customer ? { id: customer.id, firstName: customer.firstName, email: customer.email } : null, orders: customer?.orders ?? [] });
  } catch (error) {
    console.error("Customer orders API error:", error);
    return NextResponse.json({ error: "Unable to load your orders." }, { status: 500 });
  }
}
