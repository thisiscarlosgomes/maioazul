import type { ReactNode } from "react";
import { Button } from "../primitives/button";

export type HeaderLink = {
  href: string;
  label: string;
  current?: boolean;
  compact?: "hide";
};

export function SiteHeader({
  brand,
  label,
  links,
  tools,
  action,
}: {
  brand: ReactNode;
  label: string;
  links: HeaderLink[];
  tools?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <header className="maio-header" id="topo">
      {brand}
      <nav aria-label={label}>
        {links.map((link) => (
          <a key={link.href} href={link.href} aria-current={link.current ? "page" : undefined} data-compact={link.compact}>
            {link.label}
          </a>
        ))}
      </nav>
      {tools}
      {action ? (
        <Button href={action.href} size="small">
          {action.label}
        </Button>
      ) : null}
    </header>
  );
}
