"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { t } from "../lib/i18n";
import type { Locale } from "../lib/locale";
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 0 }}
      whileInView={
        reduced ? { opacity: 1 } : { opacity: [0.35, 1], y: [24, 0] }
      }
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
export function HoverCard({
  children,
  href,
  className = "",
  locale = "pt",
}: {
  children: ReactNode;
  href: string;
  className?: string;
  locale?: Locale;
}) {
  const reduced = useReducedMotion();
  const external = /^https?:\/\//i.test(href);
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      whileHover={reduced ? undefined : { y: -6 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.25 }}
    >
      {children}
      {external ? <span className="sr-only"> {t("link.newTab", undefined, locale)}</span> : null}
    </motion.a>
  );
}
