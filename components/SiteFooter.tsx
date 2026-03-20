import Link from "next/link";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Indicadores" },
  { href: "/blog", label: "Destaques" },
  { href: "/finance", label: "Financas" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/documentos", label: "Documentos" },
  { href: "/chat", label: "Chat" },
  { href: "/feed", label: "Feed" },
  { href: "/partners", label: "Partners" },
  { href: "/mcp-guide", label: "MCP Guide" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
