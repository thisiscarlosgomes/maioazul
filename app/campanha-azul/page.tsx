"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, HeartHandshake } from "lucide-react";

const heroPoints = [
  "Por valor e orgulho local.",
  "Por uma economia mais dinamica.",
  "Por crescimento sustentável.",
    "Por ecossistemas protegidos.",
  "Por um compromisso coletivo.",
  "Por um futuro azul.",
];

const howToJoin = [
  "Participar nas ações comunitárias ao longo do ano.",
  "Criar ou apoiar iniciativas alinhadas com a agenda azul.",
  "Promover o Maio no digital e nos canais locais.",
  `Valorizar negócios, produtos e serviços locais.`,
];

const maioPillars = [
  {
    title: "Buy Maio",
    body: "Escolha produtos e serviços locais para reforçar os negócios e o valor que fica na ilha.",
    image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1775230185/6b1cc473-d267-417b-95e6-0b55969532e4_zgbiv0.png",
  },
  {
    title: "Protect Maio",
    body: "Participe em ações comunitárias de limpeza, proteção costeira e sensibilização ambiental.",
    image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770351495/places/unesco.jpg",
  },
  {
    title: "Promote Maio",
    body: "Partilhe a campanha e as boas práticas para ampliar o impacto junto da comunidade e da diáspora.",
    image: "https://res.cloudinary.com/dhxfkhewr/image/upload/f_auto,q_auto/v1770288664/places/rotcha.png",
  },
];

const whyItMatters = [
  {
    title: "Protege o que torna o Maio único",
    body:
      "A campanha promove o cuidado da costa, do mar e do território através de ações práticas e visíveis.",
  },
  {
    title: "Valoriza a experiência de viver e visitar o Maio",
    body:
      "Ao melhorar os espaços, reforçar a promoção da ilha e mobilizar a comunidade, a campanha torna o Maio mais vivido e mais visitado.",
  },
  {
    title: "Dinamiza a economia local",
    body:
      "Ao promover produtos, serviços e experiências da ilha, a campanha cria mais valor e mais oportunidades no território.",
  },
  {
    title: "Transforma visão em ação coletiva",
    body:
      "A campanha junta parceiros, instituições, comunidades e cidadãos numa agenda comum, com ações concretas e impacto partilhado.",
  },
];

const partnerWays = [
  "Patrocínio financeiro",
  "Apoio logístico e operacional",
  "Comunicação e divulgação",
  "Mobilização de voluntários",
  "Participação educativa e institucional",
  "Cedência de equipamentos e materiais",
  "Co-promoção da iniciativa",
];

const partnerLogos = [
  { src: "/logos/maioazulwhite.svg", alt: "Maio Azul" },
  { src: "/logos/visitmaio.svg", alt: "Visit Maio" },
  { src: "/logos/iaka.png", alt: "IAKA" },
  // { src: "/logos/mill.svg", alt: "MILL" },
];

const fadeUp = {
  hidden: { opacity: 1, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function CampanhaAzulPage() {
  const [activeHeroPoint, setActiveHeroPoint] = useState(0);
  const triggerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibilityRatiosRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let nextIndex = activeHeroPoint;
        let maxRatio = -1;

        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isFinite(idx)) return;

          visibilityRatiosRef.current.set(
            idx,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        });

        visibilityRatiosRef.current.forEach((ratio, idx) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            nextIndex = idx;
          }
        });

        if (nextIndex !== activeHeroPoint) {
          setActiveHeroPoint(nextIndex);
        }
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.7, 0.9],
        rootMargin: "-18% 0px -18% 0px",
      }
    );

    triggerRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeHeroPoint]);

  return (
    <div
      className="relative overflow-x-clip bg-[#10069f] pb-20 text-white"
      style={{
        fontFamily: "PPNeueMontreal, Mabry, Inter, ui-sans-serif, system-ui, -apple-system",
        backgroundColor: "#10069f",
        color: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <div className="fixed inset-x-0 top-0 z-50 grid h-1 grid-cols-4">
        <span className="bg-[#10069F]" />
        <span className="bg-[#2ED3FF]" />
        <span className="bg-[#FF6A3D]" />
        <span className="bg-[#BFFF00]" />
      </div>

      <section className="relative">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[#10069f]" />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col px-6 py-16 sm:px-8 sm:py-16">
            <div className="hidden flex items-center justify-between gap-4">
              <img src="/cz2.svg" alt="CZ" className="h-2 w-auto sm:h-4" />
              <img src="/maioazulwhite.svg" alt="Maioazul" className="h-5 w-auto sm:h-5 opacity-50" />
            </div>

            <div className="mt-10 flex flex-1 flex-col gap-12 md:flex-row md:items-start md:gap-12">
              <div className="md:w-[44%] md:self-start">
                <h1 className="text-[clamp(2.5rem,9vw,5.8rem)] font-medium leading-[1] tracking-[-0.03em]">
                  Maio
                  <br />
                  Campanha
                  <br />
                  Azul <span className="text-[#39d5ff]">2026</span>
                </h1>
              </div>

              <div className="space-y-6 md:w-[60%] md:pl-8 lg:pl-12">
                {heroPoints.map((line, index) => {
                  const isActive = activeHeroPoint === index;
                  return (
                    <p
                      key={line}
                      className={`text-[clamp(1.6rem,4.4vw,2.45rem)] font-medium !leading-[1.2] tracking-[-0.02em] transition-all duration-700 ease-out ${isActive ? "text-white opacity-100" : "text-white/45 opacity-55"
                        }`}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-24 sm:bottom-20 flex justify-center">
              <motion.div
                aria-hidden="true"
                animate={{ y: [0, 8, 0], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-white/90"
              >
                <ChevronDown className="h-6 w-6" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none relative z-10">
          {heroPoints.map((line, index) => (
            <div
              key={line}
              data-index={index}
              ref={(el) => {
                triggerRefs.current[index] = el;
              }}
              className="h-[38vh] min-h-[220px]"
            />
          ))}
        </div>
      </section>

      <section className="relative border-y border-[#10069f]/15 bg-white py-14 text-[#10069f]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:px-8 md:grid-cols-3">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#10069f]/75">Visão</p>
            <p className="mt-3 text-[#10069f]/90">
              Posicionar a ilha do Maio como referência em sustentabilidade azul e crescimento
              responsável, com impacto local e continuidade.
            </p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#10069f]/75">Como funciona</p>
            <p className="mt-3 text-[#10069f]/90">
              Sequência de ações interligadas ao longo do ano, com base comum de mensagens e
              espaço para iniciativas próprias de escolas, associações, empresas e parceiros.
            </p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#10069f]/75">Ambição</p>
            <p className="mt-3 text-[#10069f]/90">
              Uma campanha intencionalmente ambiciosa na visão, mas simples na execução: ação
              visível, participação alargada e resultados reconhecidos em toda a ilha.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative bg-[#10069f] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
            <p className="hidden text-sm font-medium uppercase tracking-[0.14em] text-white/85">
              Como participar
            </p>
            <h2 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.03em]">
               Como participar
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-4 xl:grid-cols-4">
              {howToJoin.map((step, index) => (
                <div
                  key={step}
                  className="pr-2"
                >
                  <p className="text-5xl font-medium leading-none tracking-[-0.02em] text-white">
                    {index + 1}.
                  </p>
                  <p className="mt-4 text-[clamp(1.15rem,1.45vw,1.8rem)] leading-[1.35] text-white/92">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#10069f] py-4 sm:py-4">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          
          <h2 className="mt-3 text-[clamp(1.8rem,4.4vw,2.7rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Buy Maio. Proteger Maio. Valorizar Maio.
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3 xl:grid-cols-3 pb-12">
            {maioPillars.map((item) => (
              <article key={item.title} className="border-t border-[#10069f]/25 pt-4">
                 <img
                  src={item.image}
                  alt={item.title}
                  className="mb-8 h-80 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <h3 className="hidden mt-2 text-3xl font-medium leading-[1.05] tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed ">{item.body}</p>
               
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 text-[#10069f] sm:py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#10069f]/70">
             Um Futuro Proativo
            </p>
          </motion.div>

          <div className="mt-6">
            {whyItMatters.map((item, index) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.25 }}
                variants={fadeUp}
                transition={{ delay: index * 0.04, duration: 0.55 }}
                className="grid items-center gap-5 border-t-2 border-[#10069f]/10 py-8 first:border-t-0 md:grid-cols-[1fr,auto] md:gap-10"
              >
                <div>
                  <h3
                    className="text-[clamp(2rem,4.5vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[#10069f]"
                  >
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#10069f]/80 sm:text-lg">
                    {item.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative  bg-[#10069f] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fadeUp}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/85">
              Oportunidade de parceria
            </p>
            <h2 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1] tracking-[-0.03em]">
              Coorganizar, apoiar, patrocinar e amplificar
            </h2>
            <p className="mt-5 max-w-3xl text-white/75">
              Estamos a mobilizar parceiros públicos, privados, associativos e comunitários para
              fortalecer a Campanha Azul 2026 e construir continuidade para a iniciativa Maio, uma
              ilha azul, a longo prazo.
            </p>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-3">
            {partnerWays.map((item) => (
              <span
                key={item}
                className="border border-white/20 bg-white/10 py-3 px-4 text-sm text-white/85"
              >
                {item}
              </span>
            ))}
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.45 }}
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="mailto:hello@maioazul.com?subject=Parceria%20Campanha%20Azul%202026"
              className="inline-flex items-center gap-2 bg-white px-6 py-3 font-medium text-[#10069f] transition hover:bg-white/90"
            >
              <HeartHandshake className="hidden h-4 w-4" />
              Quero ser parceiro
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-sm text-white/70 hidden">Contacto direto: hello@maioazul.com</p>
          </motion.div>

          <div className="mt-10 flex flex-wrap items-center gap-10 sm:gap-12 border-t border-white/15 pt-6">
            {partnerLogos.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                className="h-4 w-auto object-contain opacity-90 sm:h-5"
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="font-medium fixed inset-x-0 bottom-0 z-40  bg-white px-6 py-3 text-center text-xs text-[#10069f]/80 backdrop-blur sm:px-8 sm:text-sm">
        Uma agenda de ação coletiva para um Maio mais azul, mais dinâmico e mais sustentável.
      </footer>

    </div>
  );
}
