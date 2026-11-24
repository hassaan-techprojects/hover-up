DO $$
BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'PASSWORD_RESET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OtpChallenge" (
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

CREATE INDEX IF NOT EXISTS "OtpChallenge_email_purpose_createdAt_idx"
  ON "OtpChallenge"("email", "purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "OtpChallenge_expiresAt_idx"
  ON "OtpChallenge"("expiresAt");
