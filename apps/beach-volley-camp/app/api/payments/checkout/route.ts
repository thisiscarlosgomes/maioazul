import { NextRequest, NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";
import { CAMP_PACKAGES, isCampPackageId } from "@/lib/payments/config";
import { getStripeClient } from "@/lib/payments/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const packageId = String(body?.packageId || "").trim();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();

    if (!isCampPackageId(packageId) || !name || !email) {
      return NextResponse.json(
        { error: "Missing or invalid payment details." },
        { status: 400 }
      );
    }

    const selectedPackage = CAMP_PACKAGES[packageId];
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${siteUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/register/cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: selectedPackage.currency,
            unit_amount: selectedPackage.amountCents,
            product_data: {
              name: `${selectedPackage.name} · Maio Beach Volley Camp`,
              description: selectedPackage.description,
            },
          },
        },
      ],
      metadata: {
        participantName: name,
        participantEmail: email,
        packageId: selectedPackage.id,
      },
    });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const payments = db.collection("camp_payments");

    await payments.insertOne({
      checkoutSessionId: session.id,
      status: "created",
      participant: {
        name,
        email,
      },
      package: {
        id: selectedPackage.id,
        name: selectedPackage.name,
        amountCents: selectedPackage.amountCents,
        currency: selectedPackage.currency,
      },
      source: "website",
      createdAt: new Date(),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/payments/checkout failed", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error as Error)?.message || "Failed to create checkout session."
        : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
