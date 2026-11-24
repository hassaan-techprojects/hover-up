import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp, enforceOtpRateLimit, hashOtp, OTP_TTL_MS } from "@/lib/account-otp";
import { sendOtpEmail } from "@/lib/email";
const genericMessage = "If an account exists for that email, a verification code has been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) return NextResponse.json({ success: true, message: genericMessage });
    const limit = await enforceOtpRateLimit(email, "PASSWORD_RESET");
    if (!limit.allowed) return NextResponse.json({ success: true, message: genericMessage });
    const code = createOtp();
    await prisma.otpChallenge.updateMany({ where: { email, purpose: "PASSWORD_RESET", consumedAt: null }, data: { consumedAt: new Date() } });
    const challenge = await prisma.otpChallenge.create({ data: { email, purpose: "PASSWORD_RESET", codeHash: hashOtp(email, "PASSWORD_RESET", code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    try { await sendOtpEmail({ to: email, code, purpose: "PASSWORD_RESET" }); }
    catch (error) { await prisma.otpChallenge.delete({ where: { id: challenge.id } }); throw error; }
    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Password reset OTP request failed:", error);
    return NextResponse.json({ error: "We couldn't process your request right now. Please try again." }, { status: 500 });
  }
}
