import { NextResponse } from "next/server";

const AIRALO_BASE_URL =
  process.env.AIRALO_CHECKOUT_URL || "https://www.airalo.com/cape-verde-esim";

const PLAN_SLUGS: Record<string, string> = {
  "airalo-1gb-3d": "fogotel-in-3days-1gb",
  "airalo-3gb-3d": "fogotel-in-3days-3gb",
  "airalo-3gb-7d": "fogotel-in-7days-3gb",
  "airalo-5gb-7d": "fogotel-in-7days-5gb",
  "airalo-10gb-7d": "fogotel-in-7days-10gb",
  "airalo-5gb-15d": "fogotel-in-15days-5gb",
  "airalo-10gb-15d": "fogotel-in-15days-10gb",
  "airalo-5gb-30d": "fogotel-in-30days-5gb",
  "airalo-10gb-30d": "fogotel-in-30days-10gb",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider = "airalo";
    const requestedProvider = String(body?.provider || "").toLowerCase();
    const planId = String(body?.planId || "");
    const quantity = Number(body?.quantity || 1);
    const currency = String(body?.currency || "USD").toUpperCase();

    if (requestedProvider && requestedProvider !== "airalo") {
      return NextResponse.json(
        { error: "Only Airalo is enabled right now" },
        { status: 400 }
      );
    }
    if (!planId || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    const slug = PLAN_SLUGS[planId];
    if (!slug) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const base = AIRALO_BASE_URL.endsWith("/")
      ? AIRALO_BASE_URL.slice(0, -1)
      : AIRALO_BASE_URL;
    const checkout = new URL(`${base}/${slug}`);
    checkout.searchParams.set("utm_source", "maio-guide");
    checkout.searchParams.set("utm_medium", "app");
    checkout.searchParams.set("utm_campaign", "esim");
    checkout.searchParams.set("qty", String(Math.floor(quantity)));
    checkout.searchParams.set("currency", currency);

    return NextResponse.json({
      checkoutUrl: checkout.toString(),
      provider,
      planId,
    });
  } catch {
    return NextResponse.json({ error: "Checkout unavailable" }, { status: 500 });
  }
}
