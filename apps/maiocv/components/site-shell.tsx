import Link from "next/link";
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
    <header className="site-header" id="topo">
      <Link href="/" aria-label={t("nav.home")}>
        <Logo />
      </Link>
      <nav aria-label={t("nav.primary")}>
        <Link href="/#iniciativas" className="nav-initiatives">{t("nav.initiatives")}</Link>
        <Link href="/mcp" className="nav-about">
          {t("nav.about")}
        </Link>
        <Link href="/chat">
          {t("nav.chat")}
        </Link>
      </nav>
      <a className="button button-small" href="/chat">
        {t("cta.ask")}
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label={t("footer.nav")}>
        <Link href="/#iniciativas">{t("nav.initiatives")}</Link>
        <Link href="/mcp">{t("nav.about")}</Link>
        <Link href="/mcp#como-funciona">{t("footer.how")}</Link>
        <Link href="/mcp#perguntas">{t("footer.faq")}</Link>
        <a href={CHATGPT_URL}>{t("footer.chatgpt")}</a>
        <Link href="/chat">{t("nav.chat")}</Link>
      </nav>
      <Reveal>
        <div className="footer-wordmark" aria-hidden="true">
          maio.cv
        </div>
      </Reveal>
      <div className="footer-meta">
        <span>{t("footer.place")}</span>
        <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
      </div>
      <p className="footer-credit">
        {t("footer.credit")}<br />
        <a href="https://maioazul.com">{t("footer.studio")}</a>
      </p>
    </footer>
  );
}
