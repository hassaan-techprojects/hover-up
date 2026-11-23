import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Sign in to view your customer profile." }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          take: 5,
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });

    return NextResponse.json({
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName || "",
        email: customer.email,
        phone: customer.phone || "",
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    console.error("Customer profile API error:", error);
    return NextResponse.json({ error: "Unable to load your customer profile." }, { status: 500 });
  }
}
