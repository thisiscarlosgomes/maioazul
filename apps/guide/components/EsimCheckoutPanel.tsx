"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Drawer } from "vaul";
import { useLang } from "@/lib/lang";

type EsimPlan = {
  id: string;
  name: string;
  data: string;
  validityDays: number;
  priceEur: number;
};

const PLANS: EsimPlan[] = [
  { id: "airalo-1gb-3d", name: "Cabo Verde 1 GB", data: "1 GB", validityDays: 3, priceEur: 7.0 },
  { id: "airalo-3gb-3d", name: "Cabo Verde 3 GB", data: "3 GB", validityDays: 3, priceEur: 16.0 },
  { id: "airalo-3gb-7d", name: "Cabo Verde 3 GB", data: "3 GB", validityDays: 7, priceEur: 17.5 },
  { id: "airalo-5gb-7d", name: "Cabo Verde 5 GB", data: "5 GB", validityDays: 7, priceEur: 23.0 },
  { id: "airalo-10gb-7d", name: "Cabo Verde 10 GB", data: "10 GB", validityDays: 7, priceEur: 40.5 },
  { id: "airalo-5gb-15d", name: "Cabo Verde 5 GB", data: "5 GB", validityDays: 15, priceEur: 25.5 },
  { id: "airalo-10gb-15d", name: "Cabo Verde 10 GB", data: "10 GB", validityDays: 15, priceEur: 42.0 },
  { id: "airalo-5gb-30d", name: "Cabo Verde 5 GB", data: "5 GB", validityDays: 30, priceEur: 28.0 },
  { id: "airalo-10gb-30d", name: "Cabo Verde 10 GB", data: "10 GB", validityDays: 30, priceEur: 43.0 },
];

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)} EUR`;

export default function EsimCheckoutPanel() {
  const [lang] = useLang();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("airalo-1gb-3d");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const copy = useMemo(
    () => ({
      pt: {
        subtitle: "Escolha plano para comprar o eSIM da Airalo.",
        plan: "Plano",
        total: "Total",
        checkout: "Continuar para checkout",
        unavailable: "Checkout indisponível no momento.",
        note: "Pagamento e ativação são concluídos com o parceiro selecionado.",
      },
      en: {
        subtitle: "Select an Airalo plan to purchase an eSIM.",
        plan: "Plan",
        total: "Total",
        checkout: "Continue to checkout",
        unavailable: "Checkout is unavailable right now.",
        note: "Payment and activation are completed with the selected partner.",
      },
    }),
    []
  );

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[0];
  const effectivePlan = selectedPlan || PLANS[0];

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/esim/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "airalo",
          planId: effectivePlan.id,
          quantity: 1,
          currency: "EUR",
        }),
      });
      if (!res.ok) throw new Error("checkout-failed");
      const data = await res.json();
      if (!data?.checkoutUrl) throw new Error("no-checkout-url");
      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError(copy[lang].unavailable);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">{copy[lang].subtitle}</p>

      <div className="space-y-3 rounded-3xl border border-border bg-background p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-3 text-left"
        >
          <span>
            <span className="text-xs text-muted-foreground">{copy[lang].plan}</span>
            <span className="mt-1 block font-semibold">{effectivePlan.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {effectivePlan.data} • {effectivePlan.validityDays}d
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
          <div className="text-xs text-muted-foreground">{copy[lang].total}</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(effectivePlan.priceEur)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatMoney(effectivePlan.priceEur)} / eSIM
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
        >
          {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy[lang].checkout}
        </button>
        {checkoutError && <div className="text-xs text-red-600">{checkoutError}</div>}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{copy[lang].note}</p>

      <Drawer.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[95] rounded-t-3xl border border-border bg-background p-4 pt-6 pb-8">
            <Drawer.Title className="text-base font-semibold">{copy[lang].plan}</Drawer.Title>
            <div className="mt-4 grid max-h-[55svh] gap-2 overflow-y-auto">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(p.id);
                    setPickerOpen(false);
                  }}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-3 text-left hover:bg-accent"
                >
                  <span>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.data} • {p.validityDays}d • {formatMoney(p.priceEur)}
                    </span>
                  </span>
                  {selectedPlanId === p.id ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
