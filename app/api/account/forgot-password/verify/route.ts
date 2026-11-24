import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResetToken, findActiveChallenge, hashOtp, hashResetToken, MAX_OTP_ATTEMPTS, registerOtpAttempt, verifyOtpHash, OTP_TTL_MS } from "@/lib/account-otp";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; code?: string };
    const email = body.email?.trim().toLowerCase(), code = body.code?.trim() ?? "";
    if (!email || !/^\d{6}$/.test(code || "")) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
    const challenge = await findActiveChallenge(email, "PASSWORD_RESET");
    if (!challenge) return NextResponse.json({ error: "This code has expired. Request a new verification code." }, { status: 400 });
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
    if (!verifyOtpHash(challenge.codeHash, hashOtp(email, "PASSWORD_RESET", code))) {
      await registerOtpAttempt(challenge.id);
      return NextResponse.json({ error: "The verification code is incorrect." }, { status: 400 });
    }
    const token = createResetToken();
    const updated = await prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, verifiedAt: null }, data: { verifiedAt: new Date(), resetTokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    if (updated.count !== 1) return NextResponse.json({ error: "This code has already been used. Request a new code." }, { status: 409 });
    return NextResponse.json({ success: true, resetToken: token });
  } catch (error) {
    console.error("Password reset OTP verification failed:", error);
    return NextResponse.json({ error: "Unable to verify your code. Please try again." }, { status: 500 });
  }
}
