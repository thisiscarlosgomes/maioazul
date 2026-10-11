export const EMERGENCY = [
  { id: "police", href: "tel:132", number: "132" },
  { id: "hospital", href: "tel:+2382551130", number: "+238 255 11 30" },
  { id: "medical", href: "tel:130", number: "130" },
] as const;

export const EMERGENCY_VERIFIED_AT = "2026-10-11";

export function humanContactUrl(): string {
  return process.env.NEXT_PUBLIC_HUMAN_CONTACT_URL?.trim() || "https://instagram.com/maio__azul";
}
