import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import clientPromise from "@/lib/mongodb";
import { getStripeClient } from "@/lib/payments/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook configuration." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature validation failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const payments = db.collection("camp_payments");

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await payments.updateOne(
        { checkoutSessionId: session.id },
        {
          $set: {
            status: "paid",
            paymentStatus: session.payment_status,
            paymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await payments.updateOne(
        { checkoutSessionId: session.id },
        {
          $set: {
            status: "expired",
            paymentStatus: session.payment_status,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await payments.updateOne(
        { paymentIntentId: intent.id },
        {
          $set: {
            status: "failed",
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
