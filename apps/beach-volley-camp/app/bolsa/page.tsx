"use client";

import { useEffect, useState } from "react";
import { Facebook, Instagram, Menu, X } from "lucide-react";
import Link from "next/link";
import type { CampPackageId } from "@/lib/payments/config";
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
  navBolsa: string;
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
  formModeRegister: string;
  formModeScholarship: string;
  packageNames: Record<CampPackageId, string>;
  completePackage: PackageCopy;
  essentialPackage: PackageCopy;
  leadTitle: string;
  leadSubtitle: string;
  leadNamePlaceholder: string;
  leadEmailPlaceholder: string;
  leadPhonePlaceholder: string;
  leadAgePlaceholder: string;
  leadExperiencePlaceholder: string;
  leadReasonPlaceholder: string;
  leadMaioConfirm: string;
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
    navBolsa: "Bolsa",
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
    refundOrgCancel: "Se o evento for cancelado pelo organizador, os pagamentos são reembolsados.",
    refundUserCancel: "Se o participante desistir, não há devolução.",
    payLoading: "A redirecionar...",
    payCta: "Continuar",
    payError: "Não foi possível iniciar o pagamento. Tenta novamente.",
    formModeRegister: "Inscrição normal",
    formModeScholarship: "Pedir bolsa",
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
        "2 dias de treino, workshop e jogos",
        "Alimentação conjunta no final do dia",
        "Kit exclusivo do evento",
      ],
    },
    essentialPackage: {
      title: "Pacote Essencial",
      priceSuffix: "/ Participante",
      bullets: [
        "2 dias de treino, workshop e jogos",
        "Alimentação conjunta no final do dia",
        "Kit exclusivo do evento",
        "Transporte não incluído",
        "Alojamento não incluído",
      ],
    },
    leadTitle: "Candidatura a bolsa",
    leadSubtitle: "Bolsa apenas para atletas do Maio com idade maxima de 30 anos.",
    leadNamePlaceholder: "Nome completo",
    leadEmailPlaceholder: "Email",
    leadPhonePlaceholder: "Telefone (WhatsApp)",
    leadAgePlaceholder: "Idade (maximo 20)",
    leadExperiencePlaceholder: "Nível/experiência (opcional)",
    leadReasonPlaceholder: "Porque precisas de bolsa?",
    leadMaioConfirm: "Confirmo que sou atleta do Maio.",
    leadCta: "Enviar candidatura",
    leadSuccess: "Candidatura enviada! Obrigado.",
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
    navBolsa: "Scholarship",
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
    refundOrgCancel: "If the organizer cancels the event, payments are refunded.",
    refundUserCancel: "If the participant withdraws, there is no refund.",
    payLoading: "Redirecting...",
    payCta: "Continue",
    payError: "Could not start payment. Please try again.",
    formModeRegister: "Regular registration",
    formModeScholarship: "Apply for scholarship",
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
        "2 days of training, workshops, and matches",
        "Shared meal at the end of each day",
        "Exclusive event kit",
      ],
    },
    essentialPackage: {
      title: "Essential Package",
      priceSuffix: "/ Participant",
      bullets: [
        "2 days of training, workshops, and matches",
        "Shared meal at the end of each day",
        "Exclusive event kit",
        "Transport not included",
        "Accommodation not included",
      ],
    },
    leadTitle: "Scholarship Application",
    leadSubtitle: "Scholarship is only for athletes from Maio up to 30 years old.",
    leadNamePlaceholder: "Full name",
    leadEmailPlaceholder: "Email",
    leadPhonePlaceholder: "Phone (WhatsApp)",
    leadAgePlaceholder: "Age (max 20)",
    leadExperiencePlaceholder: "Level/experience (optional)",
    leadReasonPlaceholder: "Why are you applying for a scholarship?",
    leadMaioConfirm: "I confirm that I am an athlete from Maio.",
    leadCta: "Submit application",
    leadSuccess: "Application received! Thank you.",
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
    navBolsa: "Bourse",
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
    refundOrgCancel: "Si l'evenement est annule par l'organisateur, les paiements sont rembourses.",
    refundUserCancel: "Si le participant se desiste, il n'y a pas de remboursement.",
    payLoading: "Redirection...",
    payCta: "Continuer",
    payError: "Impossible de lancer le paiement. Reessaie.",
    formModeRegister: "Inscription normale",
    formModeScholarship: "Demander une bourse",
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
        "2 jours d'entrainement, workshop et matchs",
        "Repas partage en fin de journee",
        "Kit exclusif de l'evenement",
      ],
    },
    essentialPackage: {
      title: "Pack Essentiel",
      priceSuffix: "/ Participant",
      bullets: [
        "2 jours d'entrainement, workshop et matchs",
        "Repas partage en fin de journee",
        "Kit exclusif de l'evenement",
        "Transport non inclus",
        "Hebergement non inclus",
      ],
    },
    leadTitle: "Candidature Bourse",
    leadSubtitle: "Bourse reservee aux athletes de Maio jusqu'a 30 ans.",
    leadNamePlaceholder: "Nom complet",
    leadEmailPlaceholder: "Email",
    leadPhonePlaceholder: "Telephone (WhatsApp)",
    leadAgePlaceholder: "Age (maximum 20)",
    leadExperiencePlaceholder: "Niveau/experience (optionnel)",
    leadReasonPlaceholder: "Pourquoi as-tu besoin d'une bourse ?",
    leadMaioConfirm: "Je confirme que je suis un athlete de Maio.",
    leadCta: "Envoyer la candidature",
    leadSuccess: "Candidature recue! Merci.",
    leadError: "Une erreur est survenue. Reessaie.",
    footerAbout: "A propos",
    footerProgram: "Programme",
    altHero: "Entrainement a Maio",
  },
};

export default function BolsaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<CampLocale>("pt");
  const [studentStatus, setStudentStatus] = useState<null | "success" | "error">(null);
  const [studentError, setStudentError] = useState<string | null>(null);

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
  const registerHref = locale === "pt" ? "/register" : `/register?lang=${locale}`;
  const bolsaHref = locale === "pt" ? "/bolsa" : `/bolsa?lang=${locale}`;

  async function handleStudentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStudentStatus(null);
    setStudentError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const age = Number(formData.get("age"));
    const fromMaio = formData.get("from_maio") === "on";
    if (!Number.isFinite(age) || age > 30 || !fromMaio) {
      setStudentStatus("error");
      setStudentError(t.leadError);
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      age,
      fromMaio,
      experience: String(formData.get("experience") || "").trim(),
      reason: String(formData.get("reason") || "").trim(),
      applicationType: "scholarship",
    };

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed");
      }
      form.reset();
      setStudentStatus("success");
      setStudentError(null);
    } catch (error) {
      setStudentStatus("error");
      setStudentError(error instanceof Error ? error.message : t.leadError);
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
              <Link className="transition hover:text-[#CEEC58]" href={bolsaHref}>
                {t.navBolsa}
              </Link>
              <Link
                className="!hidden !text-black inline-flex items-center justify-center rounded-full border border-white/40 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                href={registerHref}
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
                <Link className="transition hover:text-[#111111]" href={bolsaHref}>
                  {t.navBolsa}
                </Link>
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
        <div className="mx-auto w-full max-w-3xl px-7">
          <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-6">
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
                  type="tel"
                  name="phone"
                  placeholder={t.leadPhonePlaceholder}
                  required
                />
                <input
                  className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  type="number"
                  name="age"
                  placeholder={t.leadAgePlaceholder}
                  min={1}
                  max={30}
                  required
                />
                <input
                  className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  type="text"
                  name="experience"
                  placeholder={t.leadExperiencePlaceholder}
                />
                <textarea
                  className="min-h-[120px] w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                  name="reason"
                  placeholder={t.leadReasonPlaceholder}
                  required
                />
                <label className="flex items-start gap-2 rounded-[12px] border border-[rgba(17,17,17,0.12)] px-3 py-3 text-sm text-[rgba(17,17,17,0.82)]">
                  <input type="checkbox" name="from_maio" required className="mt-0.5 h-4 w-4" />
                  <span>{t.leadMaioConfirm}</span>
                </label>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-5 py-3 text-sm font-semibold text-[#111111]"
                  type="submit"
                >
                  {t.leadCta}
                </button>
                {studentStatus === "success" ? <p className="text-sm text-emerald-600">{t.leadSuccess}</p> : null}
                {studentStatus === "error" ? <p className="text-sm text-red-600">{studentError || t.leadError}</p> : null}
            </form>
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
          <Link className="transition hover:text-[#111111]" href={bolsaHref}>
            {t.navBolsa}
          </Link>
        </div>
      </footer>
    </div>
  );
}
