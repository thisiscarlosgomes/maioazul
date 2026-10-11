import Link from "next/link";
import { SiteFooter, SiteHeader } from "maio-ui";
import { Reveal } from "./motion";
import { LangSwitch } from "./lang-switch";
import { CHATGPT_URL } from "../lib/content";
import { t } from "../lib/i18n";
import { localize } from "../lib/locale";
import { currentLocale, currentPath } from "../lib/request-locale";

export function Logo() {
  return (
    <span className="logo">
      maio<span className="logo-dot">.</span>cv
    </span>
  );
}

export async function Header({ active = "home" }: { active?: "home" | "mcp" }) {
  const locale = await currentLocale();
  const path = await currentPath();
  const copy = (key: Parameters<typeof t>[0]) => t(key, undefined, locale);
  return (
    <SiteHeader
      brand={
        <Link href={localize(locale, "/")} aria-label={copy("nav.home")}>
          <Logo />
        </Link>
      }
      label={copy("nav.primary")}
      links={[
        { href: `${localize(locale, "/")}#iniciativas`, label: copy("nav.initiatives"), compact: "hide" },
        { href: localize(locale, "/mcp"), label: copy("nav.about"), current: active === "mcp" },
        { href: localize(locale, "/chat"), label: copy("nav.chat") },
      ]}
      tools={<LangSwitch locale={locale} path={path} />}
      action={{ href: localize(locale, "/chat"), label: copy("cta.ask") }}
    />
  );
}

export async function Footer() {
  const locale = await currentLocale();
  const copy = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, values, locale);
  return (
    <SiteFooter
      label={copy("footer.nav")}
      links={[
        { href: `${localize(locale, "/")}#iniciativas`, label: copy("nav.initiatives") },
        { href: localize(locale, "/mcp"), label: copy("nav.about") },
        { href: `${localize(locale, "/mcp")}#como-funciona`, label: copy("footer.how") },
        { href: `${localize(locale, "/mcp")}#perguntas`, label: copy("footer.faq") },
        { href: CHATGPT_URL, label: copy("footer.chatgpt") },
        { href: localize(locale, "/chat"), label: copy("nav.chat") },
      ]}
      wordmark={
        <Reveal>
          <span>maio.cv</span>
        </Reveal>
      }
      meta={[copy("footer.place"), copy("footer.copyright", { year: new Date().getFullYear() })]}
      credit={
        <>
          {copy("footer.credit")}
          <br />
          <a href="https://maioazul.com">{copy("footer.studio")}</a>
        </>
      }
    />
  );
}

export async function Untranslated() {
  const locale = await currentLocale();
  if (locale === "pt") return null;
  return (
    <p className="untranslated-note" role="note">
      {t("i18n.notTranslated", undefined, locale)}
    </p>
  );
}
