import type { ReactNode } from "react";

export function Section({
  id,
  className,
  label,
  children,
}: {
  id?: string;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={className ? `maio-section ${className}` : "maio-section"} aria-label={label}>
      {children}
    </section>
  );
}
