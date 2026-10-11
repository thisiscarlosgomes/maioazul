import type { ReactNode } from "react";

export function Card({ children, className, href }: { children: ReactNode; className?: string; href?: string }) {
  const classes = className ? `maio-card ${className}` : "maio-card";
  if (href) {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }
  return <div className={classes}>{children}</div>;
}
