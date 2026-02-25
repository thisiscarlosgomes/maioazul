"use client";

import { useState } from "react";
import { Facebook, Instagram, Menu, X } from "lucide-react";

const estrutura = [
  {
    title: "Duração",
    value: "3 dias",
    detail: "Treino e jogo diário até ao pôr do sol",
  },
  {
    title: "Local",
    value: "Arena Maioazul",
    detail: "Campos profissionais dedicados a beach volley",
  },
  {
    title: "Participantes",
    value: "Aberto a todos",
    detail: "Atletas locais, atletas visitantes",
  },
];

const experiencia = [

  {
    title: "COACHING",
    value: "Treino Profissional",
    detail: "Acompanhamento técnico e feedback contínuo",
  },
  {
    title: "Incluído",
    value: "Packote Incluido",
    detail:
      "Treinos, transporte ao alojamento",
  },
  {
    title: "Experiencia",
    value: "Workshop & Visita Local",
    detail: "Sessão dedicada a conhecer a ilha do Maio",
  },
];

export default function CampPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white text-[#111111]">

      <section
        id="sobre"
        className="relative flex min-h-[76vh] items-center justify-center overflow-hidden text-center text-white"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="https://res.cloudinary.com/dhxfkhewr/video/upload/v1770462484/camp-compressed_upb9oz.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/70" />


        <header className="absolute inset-x-0 top-0 z-50">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-7 pb-2 pt-7">
            <a href="#sobre" aria-label="Maioazul Beach Volley Camp" className="inline-flex">
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
              <a className="transition hover:text-[#CEEC58]" href="#estrutura">
                Programa
              </a>

              <a className="transition hover:text-[#CEEC58]" href="#coach">
                Coach
              </a>
              <a className="transition hover:text-[#CEEC58]" href="https://maioazul.com/parcerias">
                Parcerias
              </a>
              <a
                className="!hidden inline-flex items-center justify-center rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition"
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

                <a className="transition hover:text-[#111111]" href="#estrutura">
                  Programa
                </a>

                <a className="transition hover:text-[#111111]" href="#coach">
                  Coach
                </a>
                <a className="transition hover:text-[#111111]" href="https://maioazul.com/parcerias">
                  Parcerias
                </a>
                <a
                  className="!hidden inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-black! transition"
                  href="/register"
                >
                  Inscrição aberta
                </a>
              </nav>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-3">
          <h1 className="text-[clamp(2.8rem,6vw,5rem)] leading-tight">
            Maio Beach Volley Camp
          </h1>
          <p className="text-[clamp(1.2rem,3vw,1.3rem)] tracking-[0.05em] text-white/85">
            Ilha do Maio · 7–11 de Agosto 2026
          </p>
        </div>
      </section>

      <section id="sobre-detalhe" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              Uma Experiência Mágica


              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.12)]">
              <img
                src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466647/maioazul/camp/volley.jpg"
                alt="Treino no Maio"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-6 text-[rgba(17,17,17,0.68)] leading-tight">
              <p className="text-lg pt-2">
                Em agosto de 2026 a ilha do Maio acolhe uma experiência rara:
                treinar beach volley com tempo, espaço e atenção, orientado por coaching de classe mundial, numa ilha onde o jogo acontece ao ritmo do mar.<br /><br />



              </p>

              <p className="text-lg">
                <span className="font-semibold text-[#111111]">Sessões diárias até ao pôr do sol</span>, orientação técnica de excelência e a oportunidade de aprender com um dos melhores treinadores do mundo.
                <br /><br /> </p>
              <p className="text-lg">
                <span className="font-semibold text-[#111111]">Aberto a todos</span>, de iniciantes curiosos a atletas com experiência que querem evoluir no jogo de volleyball.<br /><br />
              </p>


              <p className="text-lg">
                <span className="font-semibold text-[#111111]">Bolsas sociais</span>, parte das inscrições e parcerias apoia bolsas para jovens do Maio, reforçando impacto social e inclusão.

              </p>

            </div>
          </div>
        </div>
      </section>

      <section id="coach" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              Conhece o nosso coach
              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="order-2 space-y-6 text-[rgba(17,17,17,0.68)] lg:order-1">
              <p className="text-lg">
                <span className="font-semibold text-[#111111]">
                  Márcio Araújo (Brasil)
                </span>{" "}
                é treinador internacional de beach volley, ex-atleta de alto nível e atual Selecionador Nacional de Cabo Verde. Atua também como coach de empowerment da FIVB.

                <br /><br />
              </p>
              <p className="text-lg">
                Especialista na formação de duplas de alta competição, tem experiência em ciclos de qualificação para Campeonatos do Mundo e Jogos Olímpicos.
                <br /><br />
              </p>
              <p className="text-lg">
                Como atleta, foi campeão do mundo em 2005 e vice-campeão olímpico em 2008.<br /><br />
              </p>

            </div>
            <div className="order-1 overflow-hidden rounded-[18px] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.12)] lg:order-2">
              <img
                src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466649/maioazul/camp/coach.jpg"
                alt="Márcio Araújo no camp Maioazul"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="estrutura" className="bg-[#ADD7E4]/30 py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <h2 className="font-[Playfair_Display] text-3xl sm:text-4xl tracking-[-0.02em] text-center">
            Programa do Camp
          </h2>
          <div className="mt-6 grid gap-2 md:grid-cols-3">
            {estrutura.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px]  bg-white p-6"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(17,17,17,0.6)]">
                  {item.title}
                </span>
                <strong className="mt-1 block text-lg font-semibold text-[#111111]">
                  {item.value}
                </strong>
                <p className="mt-2 text-sm text-[rgba(17,17,17,0.6)]">{item.detail}</p>
              </div>
            ))}
          </div>


          <div>

            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {experiencia.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[18px] bg-white p-6"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(17,17,17,0.6)]">
                    {item.title}
                  </span>
                  <strong className="mt-1 block text-lg font-semibold text-[#111111]">
                    {item.value}
                  </strong>
                  <p className="mt-2 text-sm text-[rgba(17,17,17,0.6)]">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="!hidden mt-8 flex justify-center">
              <a
                className="inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-7 py-3 text-sm font-semibold text-[#111111]"
                href="/register"
              >
                Inscrição aberta
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="programa" className="py-16">
        <div className="mx-auto w-full max-w-6xl px-7">
          <div className="mx-auto max-w-4xl pb-6 mb-6 text-center">
            <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl">
              2024 Camp em acção
              <svg
                className="absolute left-1/2 top-full mt-2 h-3 w-[240px] -translate-x-1/2 text-[#CEEC58]"
                viewBox="0 0 240 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 18C32 6 56 6 84 14C112 22 136 22 164 12C192 2 212 4 236 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466661/maioazul/camp/5.jpg"
              alt="Momento do camp Maioazul"
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466658/maioazul/camp/4.jpg"
              alt="Treino de beach volley no Maio"
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466655/maioazul/camp/3.jpg"
              alt="Atletas em ação no camp"
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
            <img
              src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770466652/maioazul/camp/2.jpg"
              alt="Comunidade e desporto no Maio"
              className="h-64 w-full rounded-[24px] object-cover sm:h-72 lg:h-80"
            />
          </div>
        </div>
      </section>



      <section id="maio" className="pt-8 pb-16">
        <div className="mx-auto w-full max-w-4xl px-7 text-center">

          <h2 className="relative inline-block text-3xl tracking-[-0.02em] sm:text-4xl mb-4">
            Uma Experiencia Maense
          </h2>
          <div className="mx-auto max-w-2xl mt-8 text-center">
            <p className="mt-10 text-[rgba(17,17,17,0.68)]">
              A Ilha do Maio é um dos segredos mais bem guardados de Cabo Verde. Praias abertas,
              ritmo tranquilo e uma relação autêntica entre natureza, comunidade e tempo.<br /><br />
            </p>


            <p className="text-[rgba(17,17,17,0.68)]">
              Um destino para férias ativas para o corpo e a mente, onde o beach volley acontece com <span className="font-semibold text-[#111111]">segurança,
                espaço e proximidade</span>. Um lugar onde estar já é, por si só, uma experiência transformadora..</p>


          </div>

          <img
            src="https://res.cloudinary.com/dhxfkhewr/image/upload/v1770479984/maio_mmwz9u.png"
            alt="Paisagens do Maio"
            className="mx-auto mt-6 h-100 w-full rounded-[28px] object-cover sm:h-100"
          />

        </div>
      </section>


      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-t border-[rgba(17,17,17,0.12)] px-7 py-6 text-[rgba(17,17,17,0.68)]">
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
          <a className="transition hover:text-[#111111]" href="#sobre-detalhe">
            Sobre
          </a>
          <a className="transition hover:text-[#111111]" href="#estrutura">
            Programa
          </a>

          <a className="transition hover:text-[#111111]" href="https://maioazul.com/parcerias">
            Parcerias
          </a>

          <a className="!hidden transition hover:text-[#111111]" href="/register">
            Participe
          </a>

        </div>
      </footer>
    </div>
  );
}
