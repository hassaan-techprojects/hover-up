import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 160) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 24) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: "Enter your name, a valid email and a password with at least 8 characters." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account already exists with this email. Please sign in." }, { status: 409 });
    const [firstName, ...last] = fullName.split(/\s+/);
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: fullName, email, passwordHash, role: "CUSTOMER" }, select: { id: true, email: true } });
      const existingCustomer = await tx.customer.findUnique({ where: { email }, select: { id: true, userId: true } });
      if (existingCustomer) {
        if (existingCustomer.userId) throw new Error("This customer record is already connected to an account.");
        await tx.customer.update({ where: { id: existingCustomer.id }, data: { userId: user.id, firstName, lastName: last.join(" ") || null, phone: phone || undefined } });
      } else {
        await tx.customer.create({ data: { userId: user.id, firstName, lastName: last.join(" ") || null, email, phone: phone || null } });
      }
      return user;
    });
    return NextResponse.json({ success: true, user: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already connected")) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Customer registration failed:", error);
    return NextResponse.json({ error: "Unable to create your account. Please try again." }, { status: 500 });
  }
}
