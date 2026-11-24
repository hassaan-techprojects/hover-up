import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findActiveChallenge, hashOtp, MAX_OTP_ATTEMPTS, registerOtpAttempt, verifyOtpHash } from "@/lib/account-otp";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; code?: string };
    const email = body.email?.trim().toLowerCase(), code = body.code?.trim();
    if (!email || !/^\d{6}$/.test(code || "")) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
    const challenge = await findActiveChallenge(email, "SIGNUP");
    if (!challenge) return NextResponse.json({ error: "This code has expired. Request a new verification code." }, { status: 400 });
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
    if (!verifyOtpHash(challenge.codeHash, hashOtp(email, "SIGNUP", code))) {
      await registerOtpAttempt(challenge.id);
      return NextResponse.json({ error: "The verification code is incorrect." }, { status: 400 });
    }
    const payload = challenge.payload as { firstName: string; lastName: string; phone: string; passwordHash: string } | null;
    if (!payload?.firstName || !payload.passwordHash) return NextResponse.json({ error: "Registration details are unavailable. Please start again." }, { status: 400 });
    const result = await prisma.$transaction(async tx => {
      const claimed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (claimed.count !== 1) throw new Error("This verification code has already been used. Request a new code.");
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new Error("An account already exists with this email address. Please sign in.");
      const user = await tx.user.create({ data: { name: [payload.firstName, payload.lastName].filter(Boolean).join(" "), email, passwordHash: payload.passwordHash, role: "CUSTOMER", isActive: true }, select: { id: true } });
      const guest = await tx.customer.findUnique({ where: { email } });
      if (guest?.userId) throw new Error("An account already exists with this email address. Please sign in.");
      const customer = guest
        ? await tx.customer.update({ where: { id: guest.id }, data: { userId: user.id, firstName: payload.firstName, lastName: payload.lastName || null, phone: payload.phone } })
        : await tx.customer.create({ data: { userId: user.id, firstName: payload.firstName, lastName: payload.lastName || null, email, phone: payload.phone } });
      return { userId: user.id, customerId: customer.id };
    });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already exists") || message.includes("already been used")) return NextResponse.json({ error: message }, { status: 409 });
    console.error("Signup OTP verification failed:", error);
    return NextResponse.json({ error: "Unable to verify your email. Please request a new code and try again." }, { status: 500 });
  }
}
