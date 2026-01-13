"use client";

import { useState } from "react";

const copy = {
  en: {
    title: "Maio Island, at its own pace",
    description:
      "A new space to highlight local life, support small initiatives, and make Maio visible — without changing what makes it special.",
    comingSoon: "A new MaioAzul is taking shape",
    launching: "launching soon",
    instagram: "Instagram",
  },
  pt: {
    title: "Maio, no seu próprio ritmo",
    description:
      "Um novo espaço para dar visibilidade à vida local, apoiar pequenas iniciativas e tornar Maio mais visível — sem mudar aquilo que o torna especial.",
    comingSoon: "Um novo MaioAzul está a ganhar forma",
    launching: "brevemente",
    instagram: "Instagram",
  },
};

type Lang = "en" | "pt";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];

  return (
    <main className="relative h-screen w-screen overflow-hidden px-10">

      {/* Background image */}
      <img
        src="/image.png"
        alt="Maio"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Black overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Blue mood overlay */}
      <div className="absolute inset-0 bg-primary/80 z-20" />

      {/* CONTENT */}
      <div className="relative z-30 h-full flex flex-col justify-between">

        {/* Header */}
        <header className="flex justify-between items-center pt-10 pb-6 text-white">
          <div className="w-24" />

          {/* Logo */}
          <img
            src="/logo.png"
            alt="MaioAzul"
            className="h-4 w-auto"
          />

          {/* Language switch */}
          <div className="flex gap-4 text-sm">
            {(["en", "pt"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`uppercase transition ${
                  lang === l
                    ? "text-white underline underline-offset-4"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </header>

        {/* Center statement */}
        <section className="flex flex-col items-center text-center space-y-8">
          <h1 className="text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.05] font-normal text-white max-w-4xl">
            {t.title}
          </h1>

          <p className="text-lg text-white/80 max-w-xl">
            {t.description}
          </p>

          <div className="pt-4">
            <span className="border border-white/40 px-8 py-4 rounded-full text-white/70 cursor-default text-center inline-block">
              {t.comingSoon}
            </span>
          </div>

          <p className="text-md text-white/40 max-w-xl">
            {t.launching}
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm pb-8">
          <a
            href="https://instagram.com/maio__azul"
            target="_blank"
            rel="noreferrer"
            className="text-white/60 hover:text-white transition"
          >
            {t.instagram}
          </a>
        </footer>

      </div>
    </main>
  );
}
