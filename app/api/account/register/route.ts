import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createOtp, enforceOtpRateLimit, hashOtp, OTP_TTL_MS } from "@/lib/account-otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string };
    const firstName = body.firstName?.trim(), lastName = body.lastName?.trim() || "";
    const email = body.email?.trim().toLowerCase(), phone = body.phone?.trim() || "", password = body.password || "";
    if (!firstName || !email || !phone || password.length < 8 || password.length > 128) return NextResponse.json({ error: "Enter your name, email, contact number and a password with 8–128 characters." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const [existingUser, existingCustomer] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.customer.findUnique({ where: { email }, select: { userId: true } }),
    ]);
    if (existingUser || existingCustomer?.userId) return NextResponse.json({ error: "An account already exists with this email address. Please sign in instead." }, { status: 409 });
    const limit = await enforceOtpRateLimit(email, "SIGNUP");
    if (!limit.allowed) return NextResponse.json({ error: `Please wait ${limit.retryAfter} seconds before requesting another code.` }, { status: 429 });
    const code = createOtp(), passwordHash = await bcrypt.hash(password, 12);
    await prisma.otpChallenge.updateMany({ where: { email, purpose: "SIGNUP", consumedAt: null }, data: { consumedAt: new Date() } });
    const challenge = await prisma.otpChallenge.create({ data: { email, purpose: "SIGNUP", codeHash: hashOtp(email, "SIGNUP", code), expiresAt: new Date(Date.now() + OTP_TTL_MS), payload: { firstName, lastName, phone, passwordHash } } });
    try { await sendOtpEmail({ to: email, code, purpose: "SIGNUP" }); }
    catch (error) { await prisma.otpChallenge.delete({ where: { id: challenge.id } }); throw error; }
    return NextResponse.json({ success: true, message: "A verification code has been sent to your email address." });
  } catch (error) {
    console.error("Signup OTP request failed:", error);
    return NextResponse.json({ error: "We couldn't send your verification code. Please check the email settings and try again." }, { status: 500 });
  }
}
