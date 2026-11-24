-- Email OTP challenges for signup verification and password recovery.
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'PASSWORD_RESET');

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "OtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "payload" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP(3),
  "resetTokenHash" TEXT,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpChallenge_email_purpose_createdAt_idx" ON "OtpChallenge"("email", "purpose", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
