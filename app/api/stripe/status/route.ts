import { NextResponse } from "next/server";
import { isStripeConfigured, missingStripeEnvVars } from "@/lib/stripe";

export const runtime = "nodejs";

/** Diagnose: welche STRIPE_* Variablen die Live-App sieht (ohne Werte). */
export async function GET() {
  const missing = missingStripeEnvVars();

  return NextResponse.json({
    configured: isStripeConfigured(),
    missing,
    present: {
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      STRIPE_PAYMENT_LINK_PRO: Boolean(process.env.STRIPE_PAYMENT_LINK_PRO?.trim()),
      STRIPE_PAYMENT_LINK_ULTRA: Boolean(process.env.STRIPE_PAYMENT_LINK_ULTRA?.trim()),
      STRIPE_PRICE_PRO: Boolean(process.env.STRIPE_PRICE_PRO?.trim()),
      STRIPE_PRICE_ULTRA: Boolean(process.env.STRIPE_PRICE_ULTRA?.trim())
    }
  });
}
