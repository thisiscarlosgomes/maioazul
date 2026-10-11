import Link from "next/link";
import { SiteFooter, SiteHeader } from "maio-ui";
import { Reveal } from "./motion";
import { CHATGPT_URL } from "../lib/content";
import { t } from "../lib/i18n";

export function Logo() {
  return (
    <span className="logo">
      maio<span className="logo-dot">.</span>cv
    </span>
  );
}

export function Header({ active = "home" }: { active?: "home" | "mcp" }) {
  return (
    <SiteHeader
      brand={
        <Link href="/" aria-label={t("nav.home")}>
          <Logo />
        </Link>
      }
      label={t("nav.primary")}
      links={[
        { href: "/#iniciativas", label: t("nav.initiatives"), compact: "hide" },
        { href: "/mcp", label: t("nav.about"), current: active === "mcp" },
        { href: "/chat", label: t("nav.chat") },
      ]}
      action={{ href: "/chat", label: t("cta.ask") }}
    />
  );
}

export function Footer() {
  return (
    <SiteFooter
      label={t("footer.nav")}
      links={[
        { href: "/#iniciativas", label: t("nav.initiatives") },
        { href: "/mcp", label: t("nav.about") },
        { href: "/mcp#como-funciona", label: t("footer.how") },
        { href: "/mcp#perguntas", label: t("footer.faq") },
        { href: CHATGPT_URL, label: t("footer.chatgpt") },
        { href: "/chat", label: t("nav.chat") },
      ]}
      wordmark={
        <Reveal>
          <span>maio.cv</span>
        </Reveal>
      }
      meta={[t("footer.place"), t("footer.copyright", { year: new Date().getFullYear() })]}
      credit={
        <>
          {t("footer.credit")}
          <br />
          <a href="https://maioazul.com">{t("footer.studio")}</a>
        </>
      }
    />
  );
}
