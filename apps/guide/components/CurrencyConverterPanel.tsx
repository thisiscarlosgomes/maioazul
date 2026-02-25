"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { Drawer } from "vaul";
import { useLang } from "@/lib/lang";

type Currency = {
  code: string;
  name: string;
  flag: string;
};

const CURRENCIES: Currency[] = [
  { code: "CVE", name: "Cape Verde Escudo", flag: "🇨🇻" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "AOA", name: "Angolan Kwanza", flag: "🇦🇴" },
  { code: "XOF", name: "West African CFA Franc", flag: "🌍" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
];

const currencyByCode = CURRENCIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, Currency>);

const parseAmount = (value: string) => {
  const clean = value.replace(",", ".").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const opts =
    Math.abs(value) >= 1000
      ? { maximumFractionDigits: 2 }
      : { maximumFractionDigits: 4 };
  return new Intl.NumberFormat("en-US", opts).format(value);
};

export default function CurrencyConverterPanel() {
  const [lang] = useLang();
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("CVE");
  const [amount, setAmount] = useState("100");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"from" | "to">("from");

  const copy = useMemo(
    () => ({
      pt: {
        from: "De",
        to: "Para",
        rate: "Taxa de câmbio",
        disclaimer:
          "Taxas indicativas. Confirme a taxa final no momento do pagamento.",
        unavailable: "Taxas indisponíveis no momento.",
      },
      en: {
        from: "From",
        to: "To",
        rate: "Market exchange rate",
        disclaimer:
          "Rates are indicative. Confirm the final rate at payment time.",
        unavailable: "Rates are unavailable right now.",
      },
    }),
    []
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/finance/rates?base=${from}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load rates");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setRates(data?.rates || null);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setRates(null);
        setError(copy[lang].unavailable);
      });
    return () => {
      active = false;
    };
  }, [from, lang, copy]);

  const fromCurrency = currencyByCode[from] || { code: from, name: from, flag: "💱" };
  const toCurrency = currencyByCode[to] || { code: to, name: to, flag: "💱" };
  const baseAmount = parseAmount(amount);
  const rate = from === to ? 1 : rates?.[to] ?? null;
  const converted = rate == null ? null : baseAmount * rate;

  const openPicker = (target: "from" | "to") => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const chooseCurrency = (code: string) => {
    if (pickerTarget === "from") setFrom(code);
    else setTo(code);
    setPickerOpen(false);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <>
      <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openPicker("from")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left"
            >
              <span className="text-xl">{fromCurrency.flag}</span>
              <span className="font-semibold">{fromCurrency.code}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="text-right">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-32 bg-transparent text-right text-4xl font-semibold outline-none"
              />
              <div className="text-sm text-muted-foreground">{fromCurrency.code}</div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={swap}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background"
              aria-label={lang === "pt" ? "Trocar moedas" : "Swap currencies"}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openPicker("to")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left"
            >
              <span className="text-xl">{toCurrency.flag}</span>
              <span className="font-semibold">{toCurrency.code}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="text-right">
              <div className="text-4xl font-semibold">
                {converted == null ? "—" : formatAmount(converted)}
              </div>
              <div className="text-sm text-muted-foreground">{toCurrency.name}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-sm text-muted-foreground">
          {rate == null
            ? error || copy[lang].unavailable
            : `${copy[lang].rate}: ${fromCurrency.code} 1 = ${toCurrency.code} ${formatAmount(rate)}`}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{copy[lang].disclaimer}</p>

      <Drawer.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[95] rounded-t-3xl border border-border bg-background p-4 pt-6 pb-8">
            <Drawer.Title className="text-base font-semibold">
              {pickerTarget === "from" ? copy[lang].from : copy[lang].to}
            </Drawer.Title>
            <div className="mt-4 grid max-h-[55svh] gap-2 overflow-y-auto">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => chooseCurrency(currency.code)}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-3 text-left hover:bg-accent"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xl">{currency.flag}</span>
                    <span>
                      <span className="font-semibold">{currency.code}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {currency.name}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
