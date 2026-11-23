# Hover Up commerce setup

## Database changes

The commerce work adds:
- `OrderItem.customization` JSON for pack size, colour, size allocations, artwork URLs and customer instructions.
- `ReviewImage` for customer review photo URLs and storage keys.

After pulling the latest `main` branch, install dependencies and apply the committed Prisma migrations:

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

The migrations must be applied to the same Neon project and branch used by the deployed storefront. Do not run `prisma db push` as a substitute for the committed migrations.

## Required environment variables

The existing Neon database and object-storage variables must remain configured. Online checkout additionally needs:

- `RAZORPAY_KEY_ID` — public Razorpay key ID.
- `RAZORPAY_KEY_SECRET` — private Razorpay API secret. Server-side only.
- `RAZORPAY_WEBHOOK_SECRET` — webhook signing secret configured in the Razorpay dashboard.

Set these in the local environment and in Vercel Project Settings → Environment Variables. Never expose the secret values in client-side variables or commit them to Git.

## Razorpay webhook

Configure a webhook in the Razorpay dashboard with this endpoint:

```
https://YOUR_STORE_DOMAIN/api/payments/razorpay/webhook
```

Subscribe to `payment.captured` and `order.paid`. Set the webhook secret to the same value as `RAZORPAY_WEBHOOK_SECRET`.

## Checkout behaviour

- Guest checkout creates or reuses a Customer record by email, so the order is retained even without an account.
- Creating an account later with the same email links that guest Customer record to the account and exposes its previous orders.
- Cash on Delivery is available without Razorpay credentials.
- Online payment uses Razorpay Checkout and verifies the checkout signature and captured amount on the server.
- Product pack prices are validated on the server; the browser-submitted price is never trusted.
- Custom artwork URLs must belong to the configured Neon Object Storage bucket.

## Validation

After applying migrations and setting environment variables:

```bash
npm run lint
npm run build
```

Test both COD and online payments in Razorpay Test Mode before switching to live keys.
