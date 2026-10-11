import Link from "next/link";
import { Reveal } from "./motion";
import { CHATGPT_URL } from "../lib/content";
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
      <Link href="/" aria-label="MaioCV — início">
        <Logo />
      </Link>
      <nav aria-label="Navegação principal">
        <Link href="/#iniciativas" className="nav-initiatives">Iniciativas</Link>
        <Link href="/mcp" className="nav-about">
          Sobre
        </Link>
        <Link href="/chat">
          Chat
        </Link>
      </nav>
      <a className="button button-small" href="/chat">
        Ask a question
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Navegação do rodapé">
        <Link href="/#iniciativas">Iniciativas</Link>
        <Link href="/mcp">Sobre</Link>
        <Link href="/mcp#como-funciona">Como funciona</Link>
        <Link href="/mcp#perguntas">Perguntas frequentes</Link>
        <a href={CHATGPT_URL}>Abrir no ChatGPT</a>
        <Link href="/chat">Chat</Link>
      </nav>
      <Reveal>
        <div className="footer-wordmark" aria-hidden="true">
          maio.cv
        </div>
      </Reveal>
      <div className="footer-meta">
        <span>Maio, Cabo Verde</span>
        <span>© {new Date().getFullYear()} MaioCV</span>
      </div>
      <p className="footer-credit">
        Criado e desenvolvido por<br />
        <a href="https://maioazul.com">MaioAzul</a>
      </p>
    </footer>
  );
}
