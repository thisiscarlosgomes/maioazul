# Stripe setup (MBV)

## 1) Install and configure

Required environment variables:

- `STRIPE_SECRET_KEY`: Stripe secret API key.
- `STRIPE_WEBHOOK_SECRET`: webhook signing secret from Stripe CLI/dashboard.
- `NEXT_PUBLIC_BASE_URL`: public app URL used for success/cancel redirects.
- `MONGODB_URI`: already required by the app.
- `MONGODB_DB`: optional, defaults to `maioazul`.

## 2) API routes implemented

- `POST /api/payments/checkout`
  - Creates a Stripe Checkout Session.
  - Supports packages:
    - `completo` => EUR 180.00
    - `essencial` => EUR 90.00
  - Stores a pending payment record in `camp_payments`.

- `POST /api/payments/webhook`
  - Validates Stripe signature.
  - Updates `camp_payments` status for:
    - `checkout.session.completed`
    - `checkout.session.expired`

## 3) Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Then copy the generated signing secret into `STRIPE_WEBHOOK_SECRET`.

## 4) UI

`/register` includes a `Pay` section with package selector and “Pagar com Stripe” button.

Success and cancel pages:

- `/register/success`
- `/register/cancel`
