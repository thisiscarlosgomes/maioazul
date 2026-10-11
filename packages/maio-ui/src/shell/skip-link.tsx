import type { ReactNode } from "react";

export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="maio-skip-link" href={href}>
      {children}
    </a>
  );
}
