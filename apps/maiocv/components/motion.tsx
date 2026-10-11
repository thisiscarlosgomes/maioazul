"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
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
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      whileHover={reduced ? undefined : { y: -6 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.a>
  );
}
