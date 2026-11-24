import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/account-otp";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; resetToken?: string; password?: string };
    const email = body.email?.trim().toLowerCase(), resetToken = body.resetToken || "", password = body.password || "";
    if (!email || resetToken.length < 32 || password.length < 8 || password.length > 128) return NextResponse.json({ error: "Enter a new password with 8–128 characters." }, { status: 400 });
    const tokenHash = hashResetToken(resetToken);
    const challenge = await prisma.otpChallenge.findFirst({ where: { email, purpose: "PASSWORD_RESET", resetTokenHash: tokenHash, verifiedAt: { not: null }, consumedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!challenge) return NextResponse.json({ error: "Your password reset session has expired. Start again." }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async tx => {
      const claimed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, resetTokenHash: tokenHash, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date(), resetTokenHash: null } });
      if (claimed.count !== 1) throw new Error("This password reset session has already been used or expired.");
      const updated = await tx.user.updateMany({ where: { email }, data: { passwordHash } });
      if (updated.count !== 1) throw new Error("Account not found.");
    });
    return NextResponse.json({ success: true, message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already been used") || message.includes("Account not found")) return NextResponse.json({ error: message }, { status: 400 });
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 500 });
  }
}
