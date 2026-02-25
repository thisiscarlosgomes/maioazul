"use client";

import { useState } from "react";
import { Facebook, Instagram, Menu, X } from "lucide-react";

export default function RegisterPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentStatus, setStudentStatus] = useState<null | "success" | "error">(null);

  async function handleStudentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStudentStatus(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      experience: String(formData.get("experience") || "").trim(),
    };

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      form.reset();
      setStudentStatus("success");
    } catch {
      setStudentStatus("error");
    }
  }

  return (
    <div className="bg-white text-[#111111]">
      <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden text-center text-white">
        <img
          src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
          alt="Treino no Maio"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/60 to-black/75" />

        <header className="absolute inset-x-0 top-0 z-50">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 pb-2 pt-7">
            <a href="/" aria-label="Maioazul Beach Volley Camp" className="inline-flex">
              <img
                className="h-[19px] w-auto"
                src="/mb.svg"
                alt="Maioazul"
              />
            </a>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-white/85 md:flex">
              {/* <a className="transition hover:text-[#CEEC58]" href="#sobre-detalhe">
                Sobre
              </a> */}
              <a className="transition hover:text-[#CEEC58]" href="/">
                Programa
              </a>

              <a className="transition hover:text-[#CEEC58]" href="/">
                Coach
              </a>
              <a className="transition hover:text-[#CEEC58]" href="https://maioazul.com/parcerias">
                Parcerias
              </a>
              <a
                className="!hidden inline-flex items-center justify-center rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white hover:bg-white hover:!text-[#111111]"
                href="/register"
              >
                Participe
              </a>
            </nav>
            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 p-2 text-white md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          <div
            className={`z-50 mx-auto w-full max-w-6xl px-7 pb-5 md:hidden ${menuOpen ? "block" : "hidden"
              }`}
          >
            <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-4 text-[#111111] shadow-[0_20px_40px_rgba(17,17,17,0.12)]">
              <nav className="flex flex-col gap-4 text-sm font-semibold">

                <a className="transition hover:text-[#111111]" href="/">
                  Programa
                </a>

                <a className="transition hover:text-[#111111]" href="/">
                  Coach
                </a>
                <a className="transition hover:text-[#111111]" href="https://maioazul.com/parcerias">
                  Parcerias
                </a>

              </nav>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-4 px-6">

          <h1 className="text-[clamp(2.4rem,5vw,4.2rem)] leading-tight">
            Garante a tua vaga no Maio Beach Volley Camp
          </h1>
          <p className="text-[clamp(1rem,2.1vw,1.2rem)] text-white/80">
            Deixa o teu contacto e enviamos a confirmação por email. Vagas Limitadas.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-7 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-[Playfair_Display] text-3xl tracking-[-0.02em]">Detalhes do Camp</h2>
            <p className="mt-3 text-[rgba(17,17,17,0.68)]">
              Treino profissional, jogo diário e experiências locais.
            </p>
            <div className="mt-6 rounded-[16px] border border-[rgba(17,17,17,0.12)] bg-[#f7f7f4] p-4 text-[rgba(17,17,17,0.75)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#111111]">
                Pacote
              </p>
              <p className="mt-1 text-lg font-semibold text-[#111111]">
                €180 / Participante
              </p>

              <ul className="mt-3 list-disc pl-5 text-sm">
                <li>Viagem de barco ida e volta (Praia / Maio / Praia)</li>

               <li>Alojamento incluído (4 noites)</li>
              
                <li>3 dias de treino, workshop e jogos</li>
                
                <li>Alimentação cunjunta no final do dia</li>
                <li>Kit exclusiva do evento</li>
              </ul>
              <p className="pt-2 mt-4 text-xs font-semibold uppercase tracking-[0.06em] text-[#10069f]">
                Vagas limitadas
              </p>
            </div>
          </div>

          <div className="rounded-[18px] border border-[rgba(17,17,17,0.12)] bg-white p-6">
            <h3 className="text-xl font-semibold text-[#111111]">Quero Participar</h3>
            <p className="mt-2 text-[rgba(17,17,17,0.68)]">
              Envia os teus dados e recebe as próximas instruções.
            </p>
            <form className="mt-4 grid gap-3" onSubmit={handleStudentSubmit}>
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="text"
                name="name"
                placeholder="Nome completo"
                required
              />
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="email"
                name="email"
                placeholder="Email"
                required
              />
              <input
                className="w-full rounded-[12px] border border-[rgba(17,17,17,0.12)] px-4 py-3 text-sm"
                type="text"
                name="experience"
                placeholder="Nível/experiência (opcional)"
              />
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-5 py-3 text-sm font-semibold text-[#111111]"
                type="submit"
              >
                Enviar interesse
              </button>
              {studentStatus === "success" ? (
                <p className="text-sm text-emerald-600">Inscrição recebida! Obrigado.</p>
              ) : null}
              {studentStatus === "error" ? (
                <p className="text-sm text-red-600">Ocorreu um erro. Tenta novamente.</p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-[rgba(17,17,17,0.12)] px-7 py-10 text-[rgba(17,17,17,0.68)]">
        <div className="flex items-center gap-4">
          <p>© 2026 Maioazul.com </p>
          <div className="flex items-center gap-3 text-[#111111]">
            <a
              href="https://www.instagram.com/maio__azul"
              aria-label="Instagram Maioazul"
              className="transition hover:text-[#111111]/80"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100091540795360"
              aria-label="Facebook Maioazul"
              className="transition hover:text-[#111111]/80"
              target="_blank"
              rel="noreferrer"
            >
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="hidden items-center gap-4 text-sm font-semibold text-[#111111]/70 md:flex">
          <a className="transition hover:text-[#111111]" href="/">
            Sobre
          </a>
          <a className="transition hover:text-[#111111]" href="/">
            Programa
          </a>

          <a className="transition hover:text-[#111111]" href="https://maioazul.com/parcerias">
            Parcerias
          </a>



        </div>
      </footer>
    </div>
  );
}
