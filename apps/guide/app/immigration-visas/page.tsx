"use client";

import MainSiteHeader from "@/components/MainSiteHeader";
import { useLang } from "@/lib/lang";

export default function ImmigrationVisasPage() {
  const [lang] = useLang();

  const copy = {
    en: {
      title: "Immigration & Visas for Cabo Verde",
      introLead:
        "Entry rules for Cabo Verde depend on your nationality, passport type, and travel purpose.",
      introVisaPart1: "Many travelers can enter with",
      introVisaLink: "visa exemptions",
      introVisaPart2:
        "for short stays, while others must secure authorization before arrival.",
      introDetails:
        "In practice, most international visitors should confirm three things before departure: whether a visa is required for their citizenship, whether pre-travel registration in EASE is mandatory for their route, and whether they meet core entry conditions such as passport validity, proof of onward travel, and accommodation details.",
      introClosing:
        "Rules can change, so travelers should always validate final requirements with official Cabo Verde sources before flying.",
      sectionTitle: "Before You Travel",
      bullet1:
        "Check if your nationality is visa-exempt or requires prior visa authorization.",
      bullet2:
        "Confirm if EASE pre-registration is required for your itinerary and complete it in advance.",
      bullet3:
        "Keep your travel documents ready (passport, accommodation details, onward ticket, and related proof when requested).",
      bullet4:
        "Airport Security Tax (TSA): fixed cost of 3,400 CVE on international flights (and 150 CVE on domestic flights), with exemptions that may apply in specific cases.",
      visaNoticeTitle: "Important Visa Notice (effective January 1, 2026)",
      visaNoticePrefix:
        "From January 1, 2026, nationals of the countries listed in",
      visaNoticeMiddle:
        "must obtain an entry visa, transit visa, or airport stopover visa prior to arrival in Cabo Verde. Without this prior authorization, entry, transit, or stopover may be refused. For this process, contact the Cabo Verde Embassy closest to your place of residence.",
      visaNoticeListLabel: "see list",
      cta: "Apply / Register on EASE",
      helper:
        "Use the official EASE platform for immigration pre-registration and related entry processing.",
    },
    pt: {
      title: "Imigração & Vistos para Cabo Verde",
      introLead:
        "As regras de entrada em Cabo Verde dependem da sua nacionalidade, do tipo de passaporte e do motivo da viagem.",
      introVisaPart1: "Muitos viajantes podem entrar com",
      introVisaLink: "isenção de visto",
      introVisaPart2:
        "para estadias curtas, enquanto outros precisam de autorização antes da chegada.",
      introDetails:
        "Na prática, a maioria dos visitantes internacionais deve confirmar três pontos antes de viajar: se precisa de visto para a sua cidadania, se o pré-registo na EASE é obrigatório para o seu itinerário, e se cumpre as condições básicas de entrada, como validade do passaporte, prova de viagem de saída e dados de alojamento.",
      introClosing:
        "Como estas regras podem ser atualizadas, confirme sempre os requisitos finais nas fontes oficiais de Cabo Verde antes do embarque.",
      sectionTitle: "Antes de Viajar",
      bullet1:
        "Verifique se a sua nacionalidade tem isenção de visto ou exige autorização prévia.",
      bullet2:
        "Confirme se o pré-registo na EASE é obrigatório para o seu trajeto e complete-o com antecedência.",
      bullet3:
        "Tenha os documentos de viagem organizados (passaporte, dados de alojamento, bilhete de saída e comprovativos quando solicitados).",
      bullet4:
        "Taxa de Segurança Aeroportuária (TSA): custo fixo de 3.400 CVE nos voos internacionais (e 150 CVE nos voos nacionais), com isenções aplicáveis em casos específicos.",
      visaNoticeTitle: "Aviso Importante de Visto (a partir de 01 de janeiro de 2026)",
      visaNoticePrefix:
        "A partir do dia 01 de janeiro de 2026, os cidadãos nacionais dos seguintes países",
      visaNoticeMiddle:
        "passam a estar obrigados à obtenção de visto de entrada em território nacional e de trânsito ou de escala aeroportuária, prévia à sua chegada em Cabo Verde, sob pena de recusa de entrada, trânsito ou escala. Para o efeito, contacte a Embaixada de Cabo Verde mais próxima da sua residência.",
      visaNoticeListLabel: "ver lista",
      cta: "Solicitar / Registar na EASE",
      helper:
        "Use a plataforma oficial EASE para pré-registo de imigração e procedimentos de entrada.",
    },
  } as const;

  return (
    <main className="bg-background text-foreground">
      <MainSiteHeader />

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-semibold sm:text-2xl">{copy[lang].title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {copy[lang].introLead}
          <br />
          <br />
          {copy[lang].introVisaPart1}{" "}
          <a
            href="https://www.passportindex.org/comparebyPassport.php?p1=cv&y1=2025"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sky-700 underline underline-offset-2"
          >
            {copy[lang].introVisaLink}
          </a>{" "}
          {copy[lang].introVisaPart2}
          <br />
          <br />
          {copy[lang].introDetails}
          <br />
          <br />
          {copy[lang].introClosing}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5 sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">{copy[lang].sectionTitle}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
            <li>{copy[lang].bullet1}</li>
            <li>{copy[lang].bullet2}</li>
            <li>{copy[lang].bullet3}</li>
            <li>{copy[lang].bullet4}</li>
          </ul>
        </div>

        <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">{copy[lang].visaNoticeTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy[lang].visaNoticePrefix}{" "}
            <a
              href="https://www.ease.gov.cv/assets/lista_de_paises.pdf"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sky-700 underline underline-offset-2"
            >
              {copy[lang].visaNoticeListLabel}
            </a>{" "}
            {copy[lang].visaNoticeMiddle}
          </p>
        </section>

        <div className="mt-8">
          <a
            href="https://www.ease.gov.cv/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-4 text-sm font-semibold text-foreground transition hover:bg-accent sm:w-auto sm:px-8"
          >
            {copy[lang].cta}
          </a>
          <p className="mt-3 text-sm text-muted-foreground">{copy[lang].helper}</p>
        </div>
      </section>
    </main>
  );
}
