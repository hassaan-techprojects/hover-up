# Hover Up email OTP setup

The account registration and forgot-password flows send email through the Hover Up Gmail sender using Gmail SMTP.

## 1. Prepare the sender Gmail account

1. Sign in to the Gmail account that Hover Up should send from.
2. Enable 2-Step Verification on that Google account.
3. Create a Google App Password for the Hover Up application.
4. Copy the generated App Password. Do not use the account's normal Gmail password.

## 2. Configure environment variables

Add these variables to the local `.env` file and to the Hover Up Vercel project's Production, Preview, and Development environments as needed:

- `GMAIL_USER`: the sender Gmail address.
- `GMAIL_APP_PASSWORD`: the Google App Password (spaces may be included or omitted).
- `GMAIL_FROM`: optional sender address; defaults to `GMAIL_USER`.
- `OTP_SECRET`: a unique random secret of at least 32 characters. Generate one with `openssl rand -base64 48`.
- `NEXTAUTH_SECRET`: the existing NextAuth secret. The OTP helper can fall back to this if `OTP_SECRET` is not set.

Never commit real credentials or put them in client-side variables.

## 3. Apply the database migration

After deploying the code, run:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration creates the `OtpChallenge` table and the separate `SIGNUP` / `PASSWORD_RESET` purposes.

## 4. Flow and safeguards

- Signup creates no account until the email OTP is verified.
- Forgot-password requests use a generic response to avoid revealing whether an email has an account.
- OTP codes expire after 10 minutes, allow at most 5 incorrect attempts, enforce a 60-second resend cooldown, and limit each address/purpose to 5 requests per hour.
- OTP values and reset tokens are stored as keyed hashes; reset tokens are single-use and expire.
- Signup and password-reset challenges are purpose-scoped and cannot be interchanged.

Email delivery still requires valid Gmail App Password and environment configuration in each deployed environment.
