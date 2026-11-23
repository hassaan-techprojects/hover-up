import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string };
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim() || "";
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || "";
    const password = body.password || "";

    if (!firstName || !email || !phone || password.length < 8) {
      return NextResponse.json({ error: "Enter your name, email, contact number and a password with at least 8 characters." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) throw new Error("An account already exists with this email address.");

      const existingCustomer = await tx.customer.findUnique({ where: { email } });
      if (existingCustomer?.userId) throw new Error("An account already exists with this email address.");

      const user = await tx.user.create({
        data: { name: [firstName, lastName].filter(Boolean).join(" "), email, passwordHash, role: "CUSTOMER" },
      });

      const customer = await tx.customer.upsert({
        where: { email },
        update: { userId: user.id, firstName, lastName: lastName || null, phone },
        create: { userId: user.id, firstName, lastName: lastName || null, email, phone },
      });

      return { userId: user.id, customerId: customer.id };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create your account.";
    const status = message.includes("already exists") ? 409 : 500;
    if (status === 500) console.error("Customer registration error:", error);
    return NextResponse.json({ error: status === 409 ? message : "Unable to create your account. Please try again." }, { status });
  }
}
