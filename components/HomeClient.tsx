"use client";

import { useLang } from "@/lib/lang";
import { useEffect } from "react";
import Link from "next/link";

const copy = {
  en: {
    title: "Maio, at its own pace",
    description:
      "Maioazul is an NGO that works toward the progressive construction of Maio Island’s socioeconomic autonomy. We develop initiatives aligned with the island’s reality, strengthening its collective capacity and creating conditions to retain and organize value within the territory.\n\nWe believe in structured development, at the right scale and with continuity, where innovation, the blue economy, and community move together while respecting Maio’s identity, rhythm, and history.",
    partners: "Partners",
    dataPortal: "Data Portal",
    launching: "Adventure. Sustainability. Impact.",
    instagram: "Instagram",
    facebook: "Facebook",
  },

  pt: {
    title: "Maio, no seu próprio ritmo",
    description:
      "A Maioazul é uma ONG que trabalha para a construção progressiva da autonomia socioeconómica da Ilha do Maio. Desenvolvemos iniciativas alinhadas com a realidade da ilha, reforçando a sua capacidade colectiva e criando condições para reter e organizar valor no território.\n\nAcreditamos num desenvolvimento estruturado, à escala certa e com continuidade onde inovação, economia azul e comunidade caminham juntas, respeitando a identidade, o ritmo e a história do Maio.",
    partners: "Parceiros",
    dataPortal: "Portal de Dados",
    launching: "Aventura. Sustentabilidade. Impacto.",
    instagram: "Instagram",
    facebook: "Facebook",
  },
};

type Lang = "en" | "pt";

export default function HomeClient() {
  const [lang, setLang] = useLang();
  const t = copy[lang];

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const prevTheme = localStorage.getItem("theme");

    root.classList.remove("dark");
    localStorage.setItem("theme", "light");

    return () => {
      if (hadDark) root.classList.add("dark");
      if (prevTheme) localStorage.setItem("theme", prevTheme);
      else localStorage.removeItem("theme");
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden px-10">
      {/* Background image */}
      <img
        src="/image.png"
        alt="Maio"
        className="absolute inset-0 w-full h-full object-cover z-0"
        decoding="async"
      />

      {/* Black overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Blue mood overlay */}
      <div className="absolute inset-0 bg-maio-blue/80 z-20" />

      {/* CONTENT */}
      <div className="relative z-30 h-full flex flex-col justify-between">
        {/* Header */}
        <header className="grid grid-cols-3 items-center pt-10 pb-6 text-white">
          <div />

          {/* Logo */}
          <div className="flex justify-center">
            <img src="/logo.png" alt="MaioAzul" className="h-4 w-auto" />
          </div>

          {/* Language switch */}
          <div className="flex justify-end gap-4 text-sm">
            {(["pt", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`cursor-pointer p-0.5 uppercase transition ${
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

          <p className="text-lg text-white/80 max-w-2xl">{t.description}</p>
          <p className="hidden text-lg text-white/80 max-w-2xl">"De empreendedores do Maio, para empreendedores do Maio"</p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link
              href="/partners"
              className="border border-white/40 px-8 py-3 rounded-lg text-white/70 text-center inline-block transition hover:text-white hover:border-white"
            >
              {t.partners}
            </Link>
            <Link
              href="/dashboard"
              className="border border-white/40 px-8 py-3 rounded-lg text-white/70 text-center inline-block transition hover:text-white hover:border-white"
            >
              {t.dataPortal}
            </Link>
          </div>

        </section>

        {/* Footer */}
        <footer className="text-center text-sm pb-8">
          <div className="flex items-center justify-center gap-6 text-white/60">
            <a
              href="https://www.facebook.com/profile.php?id=100091540795360"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition"
            >
              {t.facebook}
            </a>
            <span className="opacity-40">·</span>
            <a
              href="https://instagram.com/maio__azul"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition"
            >
              {t.instagram}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
