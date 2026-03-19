"use client";

import { useEffect, useState } from "react";
import { Facebook, Instagram, Menu, X } from "lucide-react";
import Link from "next/link";
import { CAMP_PACKAGES, type CampPackageId } from "@/lib/payments/config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CampLocale = "pt" | "en" | "fr";

type PackageCopy = {
  title: string;
  priceSuffix: string;
  bullets: string[];
  badge?: string;
};

type RegisterCopy = {
  menuOpen: string;
  menuClose: string;
  navProgram: string;
  navCoach: string;
  navPartners: string;
  navJoin: string;
  heroTitle: string;
  heroSubtitle: string;
  detailsTitle: string;
  detailsSubtitle: string;
  payTitle: string;
  paySubtitle: string;
  payNamePlaceholder: string;
  payEmailPlaceholder: string;
  payPhonePlaceholder: string;
  refundTitle: string;
  refundOrgCancel: string;
  refundUserCancel: string;
  payLoading: string;
  payCta: string;
  payError: string;
  packageNames: Record<CampPackageId, string>;
  completePackage: PackageCopy;
  essentialPackage: PackageCopy;
  leadTitle: string;
  leadSubtitle: string;
  leadNamePlaceholder: string;
  leadEmailPlaceholder: string;
  leadExperiencePlaceholder: string;
  leadCta: string;
  leadSuccess: string;
  leadError: string;
  footerAbout: string;
  footerProgram: string;
  altHero: string;
};

const localeOptions: Array<{ code: CampLocale; label: string }> = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

const registerCopy: Record<CampLocale, RegisterCopy> = {
  pt: {
    menuOpen: "Abrir menu",
    menuClose: "Fechar menu",
    navProgram: "Programa",
    navCoach: "Coach",
    navPartners: "Parcerias",
    navJoin: "Participe",
    heroTitle: "Garante a tua vaga no Maio Beach Volley Camp",
    heroSubtitle: "Deixa o teu contacto e enviamos a confirmação por email. Vagas limitadas.",
    detailsTitle: "Detalhes do Camp",
    detailsSubtitle: "Treino profissional, jogo diário e experiências locais.",
    payTitle: "Checkout",
    paySubtitle: "Escolhe o pacote e faz o pagamento seguro por Stripe.",
    payNamePlaceholder: "Nome completo",
    payEmailPlaceholder: "Email para recibo",
    payPhonePlaceholder: "Telefone (WhatsApp)",
    refundTitle: "Cancelamento e devolução",
    refundOrgCancel: "Se o evento for cancelado pelo organizador, os pagamentos feitos na Soldout são reembolsados.",
    refundUserCancel: "Se o participante desistir, não há devolução e a Soldout não se responsabiliza por reembolsos.",
    payLoading: "A redirecionar...",
    payCta: "Continuar",
    payError: "Não foi possível iniciar o pagamento. Tenta novamente.",
    packageNames: {
      completo: "Pacote Completo",
      essencial: "Pacote Essencial",
    },
    completePackage: {
      title: "Pacote Completo",
      priceSuffix: "/ Participante",
      badge: "Vagas limitadas",
      bullets: [
        "Viagem de barco ida e volta (Praia / Maio / Praia)",
        "Alojamento incluído (3 noites)",
        "3 dias de treino, workshop e jogos",
        "Alimentação conjunta no final do dia",
        "Kit exclusivo do evento",
      ],
    },
    essentialPackage: {
      title: "Pacote Essencial",
      priceSuffix: "/ Participante",
      bullets: [
        "3 dias de treino, workshop e jogos",
        "Alimentação conjunta no final do dia",
        "Kit exclusivo do evento",
        "Transporte não incluído",
        "Alojamento não incluído",
      ],
    },
    leadTitle: "Quero Participar",
    leadSubtitle: "Envia os teus dados e recebe as próximas instruções.",
    leadNamePlaceholder: "Nome completo",
    leadEmailPlaceholder: "Email",
    leadExperiencePlaceholder: "Nível/experiência (opcional)",
    leadCta: "Enviar interesse",
    leadSuccess: "Inscrição recebida! Obrigado.",
    leadError: "Ocorreu um erro. Tenta novamente.",
    footerAbout: "Sobre",
    footerProgram: "Programa",
    altHero: "Treino no Maio",
  },
  en: {
    menuOpen: "Open menu",
    menuClose: "Close menu",
    navProgram: "Program",
    navCoach: "Coach",
    navPartners: "Partners",
    navJoin: "Join",
    heroTitle: "Secure your spot at Maio Beach Volley Camp",
    heroSubtitle: "Share your contact and we will send confirmation by email. Limited spots.",
    detailsTitle: "Camp Details",
    detailsSubtitle: "Professional training, daily play, and local experiences.",
    payTitle: "Checkout",
    paySubtitle: "Choose your package and pay securely with Stripe.",
    payNamePlaceholder: "Full name",
    payEmailPlaceholder: "Email for receipt",
    payPhonePlaceholder: "Phone (WhatsApp)",
    refundTitle: "Cancellation and refunds",
    refundOrgCancel: "If the organizer cancels the event, payments made through Soldout are refunded.",
    refundUserCancel: "If the participant withdraws, there is no refund and Soldout is not responsible for reimbursements.",
    payLoading: "Redirecting...",
    payCta: "Continue",
    payError: "Could not start payment. Please try again.",
    packageNames: {
      completo: "Full Package",
      essencial: "Essential Package",
    },
    completePackage: {
      title: "Full Package",
      priceSuffix: "/ Participant",
      badge: "Limited spots",
      bullets: [
        "Round-trip boat transfer (Praia / Maio / Praia)",
        "Accommodation included (3 nights)",
        "3 days of training, workshops, and matches",
        "Shared meal at the end of each day",
        "Exclusive event kit",
      ],
    },
    essentialPackage: {
      title: "Essential Package",
      priceSuffix: "/ Participant",
      bullets: [
        "3 days of training, workshops, and matches",
        "Shared meal at the end of each day",
        "Exclusive event kit",
        "Transport not included",
        "Accommodation not included",
      ],
    },
    leadTitle: "I Want to Join",
    leadSubtitle: "Send your details and receive next steps.",
    leadNamePlaceholder: "Full name",
    leadEmailPlaceholder: "Email",
    leadExperiencePlaceholder: "Level/experience (optional)",
    leadCta: "Send interest",
    leadSuccess: "Registration received! Thank you.",
    leadError: "An error occurred. Please try again.",
    footerAbout: "About",
    footerProgram: "Program",
    altHero: "Training in Maio",
  },
  fr: {
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    navProgram: "Programme",
    navCoach: "Coach",
    navPartners: "Partenaires",
    navJoin: "Participer",
    heroTitle: "Reserve ta place au Maio Beach Volley Camp",
    heroSubtitle: "Laisse ton contact et nous enverrons la confirmation par email. Places limitees.",
    detailsTitle: "Details du Camp",
    detailsSubtitle: "Entrainement professionnel, jeu quotidien et experiences locales.",
    payTitle: "Checkout",
    paySubtitle: "Choisis ton pack et paie en toute securite avec Stripe.",
    payNamePlaceholder: "Nom complet",
    payEmailPlaceholder: "Email pour le recu",
    payPhonePlaceholder: "Telephone (WhatsApp)",
    refundTitle: "Annulation et remboursement",
    refundOrgCancel: "Si l'evenement est annule par l'organisateur, les paiements effectues via Soldout sont rembourses.",
    refundUserCancel: "Si le participant se desiste, il n'y a pas de remboursement et Soldout n'est pas responsable des remboursements.",
    payLoading: "Redirection...",
    payCta: "Continuer",
    payError: "Impossible de lancer le paiement. Reessaie.",
    packageNames: {
      completo: "Pack Complet",
      essencial: "Pack Essentiel",
    },
    completePackage: {
      title: "Pack Complet",
      priceSuffix: "/ Participant",
      badge: "Places limitees",
      bullets: [
        "Trajet bateau aller-retour (Praia / Maio / Praia)",
        "Hebergement inclus (3 nuits)",
        "3 jours d'entrainement, workshop et matchs",
        "Repas partage en fin de journee",
        "Kit exclusif de l'evenement",
      ],
    },
    essentialPackage: {
      title: "Pack Essentiel",
      priceSuffix: "/ Participant",
      bullets: [
        "3 jours d'entrainement, workshop et matchs",
        "Repas partage en fin de journee",
        "Kit exclusif de l'evenement",
        "Transport non inclus",
        "Hebergement non inclus",
      ],
    },
    leadTitle: "Je Veux Participer",
    leadSubtitle: "Envoie tes donnees et recois les prochaines instructions.",
    leadNamePlaceholder: "Nom complet",
    leadEmailPlaceholder: "Email",
    leadExperiencePlaceholder: "Niveau/experience (optionnel)",
    leadCta: "Envoyer l'interet",
    leadSuccess: "Inscription recue! Merci.",
    leadError: "Une erreur est survenue. Reessaie.",
    footerAbout: "A propos",
    footerProgram: "Programme",
    altHero: "Entrainement a Maio",
  },
};

export default function RegisterPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<CampLocale>("pt");
  const [studentStatus, setStudentStatus] = useState<null | "success" | "error">(null);
  const [paymentStatus, setPaymentStatus] = useState<null | "loading" | "error">(null);
  const [selectedPackage, setSelectedPackage] = useState<CampPackageId>("completo");

  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "pt" || lang === "en" || lang === "fr") {
      setLocale(lang);
    }
  }, []);

  function handleLocaleChange(nextLocale: CampLocale) {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    if (nextLocale === "pt") {
      params.delete("lang");
    } else {
      params.set("lang", nextLocale);
    }
    const nextQuery = params.toString();
    const nextUrl = `${url.pathname}${nextQuery ? `?${nextQuery}` : ""}${url.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  const t = registerCopy[locale];
  const homeHref = locale === "pt" ? "/" : `/?lang=${locale}`;

  async function handleStudentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStudentStatus(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      experience: String(formData.get("experience") || "").trim(),
    };

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      form.reset();
      setStudentStatus("success");
    } catch {
      setStudentStatus("error");
    }
  }

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentStatus("loading");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("pay_name") || "").trim(),
      email: String(formData.get("pay_email") || "").trim(),
      phone: String(formData.get("pay_phone") || "").trim(),
      packageId: String(formData.get("package_id") || "").trim(),
    };

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create checkout session.");

      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Missing checkout URL.");

      window.location.href = data.url;
    } catch {
      setPaymentStatus("error");
    }
  }

  return (
    <div className="bg-white text-[#111111]">
      <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden text-center text-white">
        <img
          src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
          alt={t.altHero}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/60 to-black/75" />

        <header className="absolute inset-x-0 top-0 z-50">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 pb-2 pt-7">
            <Link href={homeHref} aria-label="Maioazul Beach Volley Camp" className="inline-flex">
              <img className="h-[19px] w-auto" src="/mb.svg" alt="Maioazul" />
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-semibold text-white/85 md:flex">
              <Link className="transition hover:text-[#CEEC58]" href={homeHref}>
                {t.navProgram}
              </Link>
              <Link className="transition hover:text-[#CEEC58]" href={homeHref}>
                {t.navCoach}
              </Link>
              <a className="transition hover:text-[#CEEC58]" href="https://maioazul.com/partners">
                {t.navPartners}
              </a>
              <Link
                className="!hidden !text-black inline-flex items-center justify-center rounded-full border border-white/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                href="/register"
              >
                {t.navJoin}
              </Link>
              <Select value={locale} onValueChange={(value) => handleLocaleChange(value as CampLocale)}>
                <SelectTrigger
                  aria-label="Select language"
                  className="rounded-full h-8 w-[56px] border-white/40 bg-white/15 px-3 text-[11px] font-semibold text-white ring-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-80"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {localeOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <Select value={locale} onValueChange={(value) => handleLocaleChange(value as CampLocale)}>
                <SelectTrigger
                  aria-label="Select language"
                  className="h-8 w-[86px] border-white/70 bg-white px-2 text-xs font-semibold text-[#111111] ring-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {localeOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label={menuOpen ? t.menuClose : t.menuOpen}
                aria-expanded={menuOpen}
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 p-2 text-white"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className={`z-50 mx-auto w-full max-w-6xl px-7 pb-5 md:hidden ${menuOpen ? "block" : "hidden"}`}>
            <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-4 text-[#111111] shadow-[0_20px_40px_rgba(17,17,17,0.12)]">
              <nav className="flex flex-col gap-4 text-sm font-semibold">
                <Link className="transition hover:text-[#111111]" href={homeHref}>
                  {t.navProgram}
                </Link>
                <Link className="transition hover:text-[#111111]" href={homeHref}>
                  {t.navCoach}
                </Link>
                <a className="transition hover:text-[#111111]" href="https://maioazul.com/partners">
                  {t.navPartners}
                </a>
              </nav>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-4 px-6">
          <h1 className="text-[clamp(2.4rem,5vw,4.2rem)] leading-tight">{t.heroTitle}</h1>
          <p className="text-[clamp(1rem,2.1vw,1.2rem)] text-white/80">{t.heroSubtitle}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-7 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-[Playfair_Display] text-3xl tracking-[-0.02em]">{t.detailsTitle}</h2>
            <p className="mt-3 text-[rgba(17,17,17,0.68)]">{t.detailsSubtitle}</p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[16px] border border-[rgba(17,17,17,0.12)] bg-[#f7f7f4] p-4 text-[rgba(17,17,17,0.75)]">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#111111]">{t.completePackage.title}</p>
                <p className="mt-1 text-lg font-semibold text-[#111111]">€180 {t.completePackage.priceSuffix}</p>
                {t.completePackage.badge ? (
                  <p className="pt-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#10069f]">{t.completePackage.badge}</p>
                ) : null}

                <ul className="mt-3 list-disc pl-5 text-sm">
                  {t.completePackage.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[16px] border border-[rgba(17,17,17,0.12)] bg-[#f7f7f4] p-4 text-[rgba(17,17,17,0.75)]">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#111111]">{t.essentialPackage.title}</p>
                <p className="mt-1 text-lg font-semibold text-[#111111]">€90 {t.essentialPackage.priceSuffix}</p>

                <ul className="mt-3 list-disc pl-5 text-sm">
                  {t.essentialPackage.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-6">
            <h3 className="text-xl font-semibold text-[#111111]">{t.payTitle}</h3>
            <p className="mt-2 text-[rgba(17,17,17,0.68)]">{t.paySubtitle}</p>
            <form className="mt-4 grid gap-3" onSubmit={handlePaymentSubmit}>
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="text"
                name="pay_name"
                placeholder={t.payNamePlaceholder}
                required
              />
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="email"
                name="pay_email"
                placeholder={t.payEmailPlaceholder}
                required
              />
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="tel"
                name="pay_phone"
                placeholder={t.payPhonePlaceholder}
                required
              />
              <input type="hidden" name="package_id" value={selectedPackage} />
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(CAMP_PACKAGES) as CampPackageId[]).map((packageId) => {
                  const campPackage = CAMP_PACKAGES[packageId];
                  return (
                    <button
                      key={campPackage.id}
                      type="button"
                      onClick={() => setSelectedPackage(campPackage.id)}
                      className={`rounded-[12px] border p-3 text-left transition ${
                        selectedPackage === campPackage.id
                          ? "border-[#111111] bg-[#f7f7f4]"
                          : "border-[rgba(17,17,17,0.12)] bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#111111]">{t.packageNames[campPackage.id]}</p>
                      <p className="mt-1 text-sm text-[rgba(17,17,17,0.72)]">€{campPackage.amountCents / 100}</p>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-[12px] border border-[rgba(17,17,17,0.12)] bg-[#f7f7f4] px-4 py-3 text-xs leading-relaxed text-[rgba(17,17,17,0.75)]">
                <p className="font-semibold text-[#111111]">{t.refundTitle}</p>
                <p className="mt-1">{t.refundOrgCancel}</p>
                <p className="mt-1">{t.refundUserCancel}</p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={paymentStatus === "loading"}
              >
                {paymentStatus === "loading" ? t.payLoading : t.payCta}
              </button>
              {paymentStatus === "error" ? <p className="text-sm text-red-600">{t.payError}</p> : null}
            </form>

            <div className="hidden my-6 border-t border-[rgba(17,17,17,0.12)]" />

            <div className="hidden">
              <h3 className="text-xl font-semibold text-[#111111]">{t.leadTitle}</h3>
              <p className="mt-2 text-[rgba(17,17,17,0.68)]">{t.leadSubtitle}</p>
              <form className="mt-4 grid gap-3" onSubmit={handleStudentSubmit}>
                <input
                  className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  type="text"
                  name="name"
                  placeholder={t.leadNamePlaceholder}
                  required
                />
                <input
                  className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  type="email"
                  name="email"
                  placeholder={t.leadEmailPlaceholder}
                  required
                />
                <input
                  className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  type="text"
                  name="experience"
                  placeholder={t.leadExperiencePlaceholder}
                />
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-5 py-3 text-sm font-semibold text-[#111111]"
                  type="submit"
                >
                  {t.leadCta}
                </button>
                {studentStatus === "success" ? <p className="text-sm text-emerald-600">{t.leadSuccess}</p> : null}
                {studentStatus === "error" ? <p className="text-sm text-red-600">{t.leadError}</p> : null}
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-[rgba(17,17,17,0.12)] px-7 py-10 text-[rgba(17,17,17,0.68)]">
        <div className="flex items-center gap-4">
          <p>© 2026 Maioazul.com</p>
          <div className="flex items-center gap-3 text-[#111111]">
            <a
              href="https://www.instagram.com/maio__azul"
              aria-label="Instagram Maioazul"
              className="transition hover:text-[#111111]/80"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100091540795360"
              aria-label="Facebook Maioazul"
              className="transition hover:text-[#111111]/80"
              target="_blank"
              rel="noreferrer"
            >
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="hidden items-center gap-4 text-sm font-semibold text-[#111111]/70 md:flex">
          <Link className="transition hover:text-[#111111]" href={homeHref}>
            {t.footerAbout}
          </Link>
          <Link className="transition hover:text-[#111111]" href={homeHref}>
            {t.footerProgram}
          </Link>
          <a className="transition hover:text-[#111111]" href="https://maioazul.com/partners">
            {t.navPartners}
          </a>
        </div>
      </footer>
    </div>
  );
}
