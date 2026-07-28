"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PollingPerson = {
  nome?: string;
  data_nascimento?: string;
  local_voto?: string;
  mesa_voto?: string;
  concelho?: string;
  pos_nome?: string;
  latitude?: number | null;
  longitude?: number | null;
  identificacao?: string;
};

type LookupResponse = {
  error?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    result?: {
      person?: PollingPerson;
    };
  };
};

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  appearance?: "always" | "interaction-only" | "execute";
  execution?: "render" | "execute";
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_ELEICOES_TURNSTILE_SITE_KEY ?? "0x4AAAAAADCDGLryqUwGmv3y";
const TURNSTILE_ACTION =
  process.env.NEXT_PUBLIC_ELEICOES_TURNSTILE_ACTION ?? "local_de_voto_lookup";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Turnstile.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Turnstile."));
    document.head.appendChild(script);
  });
}

function normalizeBirthDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  if (!year || !month || !day) return "";
  return `${day}-${month}-${year}`;
}

export default function LocalVotoLookup() {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState<PollingPerson | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const tokenRef = useRef<string>("");
  const widgetRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(
    () => !loading && fullName.trim().length >= 3 && !!birthDate,
    [birthDate, fullName, loading],
  );

  useEffect(() => {
    let active = true;

    async function initTurnstile() {
      try {
        await loadTurnstileScript();
        if (!active || !window.turnstile || !containerRef.current || widgetRef.current) return;

        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: TURNSTILE_ACTION,
          appearance: "interaction-only",
          execution: "execute",
          size: "flexible",
          theme: "auto",
          callback: (token: string) => {
            tokenRef.current = token;
            setTurnstileReady(true);
          },
          "expired-callback": () => {
            tokenRef.current = "";
            setTurnstileReady(false);
          },
          "error-callback": () => {
            tokenRef.current = "";
            setTurnstileReady(false);
          },
        });
      } catch {
        if (active) {
          setError("Falha ao iniciar validacao de seguranca. Tente recarregar a pagina.");
        }
      }
    }

    initTurnstile();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setPerson(null);

    const formattedDate = normalizeBirthDate(birthDate);
    if (!formattedDate) {
      setError("Data de nascimento invalida.");
      return;
    }

    if (!window.turnstile || !widgetRef.current) {
      setError("Validacao de seguranca indisponivel.");
      return;
    }

    setLoading(true);

    try {
      tokenRef.current = "";
      setTurnstileReady(false);
      window.turnstile.reset(widgetRef.current);
      window.turnstile.execute(widgetRef.current);

      const token = await new Promise<string>((resolve, reject) => {
        const startedAt = Date.now();
        const timeoutMs = 20000;

        const poll = () => {
          if (tokenRef.current) {
            resolve(tokenRef.current);
            return;
          }

          if (Date.now() - startedAt > timeoutMs) {
            reject(new Error("Timeout Turnstile"));
            return;
          }

          window.setTimeout(poll, 120);
        };

        poll();
      });

      const response = await fetch("/api/eleicoes/local-de-voto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: fullName.trim().toUpperCase(),
          data_nascimento: formattedDate,
          turnstileToken: token,
        }),
      });

      const payload = (await response.json()) as LookupResponse;
      if (!response.ok || payload.error || !payload?.data?.result?.person) {
        throw new Error(payload.message || "Nao foi possivel encontrar o local de voto.");
      }

      setPerson(payload.data.result.person);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao consultar local de voto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-none border border-[#d2d7de] bg-white px-6 py-6 sm:px-8">
      <h2 className="text-2xl font-semibold text-[#0a3b66]">Consultar Local de Voto</h2>
      <p className="mt-1 text-sm text-[#3b4754]">
        Pesquisa por nome completo e data de nascimento.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-[#1d2732]">
            Nome completo
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex.: RITA MARIA CORREIA SILVA GOMES"
              className="h-11 w-full border border-[#c8ced7] px-3 text-[15px] outline-none transition focus:border-[#0a3b66]"
              required
              minLength={3}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[#1d2732]">
            Data de nascimento
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-11 w-full border border-[#c8ced7] px-3 text-[15px] outline-none transition focus:border-[#0a3b66]"
              required
            />
          </label>
        </div>

        <div className="min-h-[68px] max-w-[360px]" ref={containerRef} />

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 items-center justify-center bg-[#0a3b66] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "A consultar..." : "Consultar"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm font-medium text-[#b42318]">{error}</p> : null}

      {person ? (
        <div className="mt-5 border border-[#c8ced7] bg-[#f8fafc] p-4">
          <p className="text-sm text-[#475467]">Resultado</p>
          <p className="mt-1 text-lg font-semibold text-[#0f172a]">{person.nome ?? "-"}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#1f2937] sm:grid-cols-2">
            <p>
              <span className="font-semibold">Mesa:</span> {person.mesa_voto ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Local de voto:</span> {person.local_voto ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Concelho:</span> {person.concelho ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Posicao:</span> {person.pos_nome ?? "-"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
