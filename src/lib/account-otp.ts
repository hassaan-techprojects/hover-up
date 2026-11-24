import { createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const HOURLY_LIMIT = 5;
const MAX_ATTEMPTS = 5;

function secret() {
  const value = process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("Set OTP_SECRET (at least 32 characters) or a strong NEXTAUTH_SECRET.");
  return value;
}

export function createOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(email: string, purpose: "SIGNUP" | "PASSWORD_RESET", code: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${email}:${code}`).digest("hex");
}

export function verifyOtpHash(expected: string, actual: string) {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return createHmac("sha256", secret()).update(`PASSWORD_RESET_TOKEN:${token}`).digest("hex");
}

export async function enforceOtpRateLimit(email: string, purpose: "SIGNUP" | "PASSWORD_RESET") {
  const latest = await prisma.otpChallenge.findFirst({ where: { email, purpose }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { allowed: false, retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000) };
  }
  const recentCount = await prisma.otpChallenge.count({ where: { email, purpose, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  return recentCount >= HOURLY_LIMIT ? { allowed: false, retryAfter: 3600 } : { allowed: true, retryAfter: 0 };
}

export async function findActiveChallenge(email: string, purpose: "SIGNUP" | "PASSWORD_RESET") {
  return prisma.otpChallenge.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function registerOtpAttempt(challengeId: string) {
  await prisma.otpChallenge.update({ where: { id: challengeId }, data: { attempts: { increment: 1 } } });
}

export const MAX_OTP_ATTEMPTS = MAX_ATTEMPTS;
