"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type IconKind = "island" | "beach" | "data" | "people" | "tools" | "chat" | "map" | "book" | "research" | "ai";
const placeIcons: IconKind[] = ["island", "beach", "map"];
const communityIcons: IconKind[] = ["data", "book", "research", "people", "tools", "ai", "chat"];
const labels = {
  island: "Ilha",
  beach: "Praias",
  data: "Dados",
  people: "Pessoas",
  tools: "Ferramentas",
  chat: "Conversa",
  map: "Lugares conectados",
  book: "Aprender",
  research: "Investigar",
  ai: "Inteligência artificial",
};

type HeadlineIconProps = { kind: IconKind };

export function HeadlineIcon({ kind }: HeadlineIconProps) {
  const id = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${id}-${name})`;
  const [current, setCurrent] = useState<IconKind>(kind);
  const icons = placeIcons.includes(kind) ? placeIcons : communityIcons;
  const reducedMotion = useReducedMotion();
  const next = icons[(icons.indexOf(current) + 1) % icons.length];
  return (
    <motion.button
      type="button"
      className={`headline-icon headline-icon-${current}`}
      onClick={() => setCurrent(next)}
      aria-label={`${labels[current]}: mudar para ${labels[next]}`}
      title="Clique para mudar o ícone"
      whileHover={reducedMotion ? undefined : { scale: 1.06 }}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
    >
      <motion.svg
        key={current}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
      >
        <defs>
          {[
            ["sea", "#8DEAF1", "#168BB9"],
            ["green", "#D7F39C", "#4E995D"],
            ["sand", "#FFF2BE", "#F2C46D"],
            ["coral", "#FFD1B8", "#FF775B"],
            ["blue", "#BCD9FF", "#456BEE"],
            ["purple", "#D7C5FF", "#8054E5"],
          ].map(([name, start, end]) => (
            <linearGradient key={name} id={`${id}-${name}`} x1="0" y1="0" x2="0.8" y2="1">
              <stop stopColor={start} />
              <stop offset="1" stopColor={end} />
            </linearGradient>
          ))}
        </defs>
        <g stroke="white" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round">
          {current === "ai" ? (
            <>
              <rect x="12" y="12" width="40" height="40" rx="13" fill={paint("purple")} transform="rotate(-8 32 32)" />
              <path d="M32 20q2 10 12 12-10 2-12 12-2-10-12-12 10-2 12-12Z" fill="white" strokeWidth="1" />
              <path d="M51 5v12m-6-6h12M12 48v10m-5-5h10" stroke="#9C85DE" strokeWidth="3" />
            </>
          ) : current === "book" ? (
            <>
              <path d="M5 14q14-6 27 3 13-9 27-3v37q-14-5-27 3-13-8-27-3Z" fill={paint("blue")} />
              <path d="M9 10q12-3 23 5v34q-11-7-23-4Z" fill="#FFF6DE" />
              <path d="M55 10q-12-3-23 5v34q11-7 23-4Z" fill={paint("sand")} />
              <path d="m15 22 10 3m-10 6 10 3m14-9 10-3m-10 12 10-3" stroke="#BA9967" strokeWidth="2" />
            </>
          ) : current === "research" ? (
            <>
              <rect x="8" y="8" width="34" height="43" rx="7" fill={paint("sand")} transform="rotate(-8 25 29)" />
              <path d="M15 19h15m-15 8h10" stroke="#BE9562" strokeWidth="3" />
              <path d="m40 41 13 14" stroke="white" strokeWidth="12" />
              <path d="m40 41 13 14" stroke="#6C63CF" strokeWidth="7" />
              <circle cx="34" cy="32" r="15" fill={paint("sea")} />
              <path d="M26 30a8 8 0 0 1 8-7" strokeOpacity=".8" />
            </>
          ) : current === "map" ? (
            <>
              <path d="m5 20 18-6 18 6 18-6v36l-18 6-18-6-18 6Z" fill={paint("green")} />
              <path d="M23 14v36m18-30v36" strokeOpacity=".7" />
              <path d="M44 18c0 9-12 19-12 19S20 27 20 18a12 12 0 0 1 24 0Z" fill={paint("coral")} />
              <circle cx="32" cy="18" r="4" fill="white" />
            </>
          ) : current === "island" ? (
            <>
              <circle cx="45" cy="15" r="10" fill={paint("sand")} />
              <path d="M5 44Q31 32 59 44L55 54Q31 63 9 54Z" fill={paint("sea")} />
              <path d="M10 43 25 18Q29 13 34 20L52 44Q32 51 10 43Z" fill={paint("green")} />
              <path d="m22 25 5-8q3-3 6 2l6 9-9-3-4 4Z" fill="#F4FFE0" stroke="none" />
              <path d="M18 51q12 5 26 0" opacity=".65" />
            </>
          ) : current === "beach" ? (
            <>
              <circle cx="48" cy="14" r="9" fill={paint("sand")} />
              <path d="M5 48Q29 34 58 46L55 56Q29 62 7 55Z" fill={paint("sand")} />
              <path d="m33 17-8 32" stroke="#B38457" strokeWidth="4" />
              <path d="M10 28Q23 0 44 17q7 7 8 20L10 28Z" fill={paint("coral")} />
              <path d="M23 31Q24 13 32 12q7 8 8 22Z" fill="#FFF2DF" strokeWidth="1.5" />
            </>
          ) : current === "data" ? (
            <>
              <rect x="9" y="9" width="42" height="45" rx="9" fill="#F0F3EC" transform="rotate(-10 30 32)" />
              <rect x="15" y="34" width="10" height="20" rx="4" fill={paint("sea")} />
              <rect x="28" y="24" width="11" height="30" rx="4" fill={paint("green")} />
              <rect x="42" y="12" width="12" height="42" rx="4" fill={paint("blue")} />
            </>
          ) : current === "people" ? (
            <>
              <circle cx="18" cy="22" r="10" fill={paint("sand")} />
              <path d="M4 48v-6a14 14 0 0 1 28 0v6q-14 8-28 0Z" fill={paint("coral")} />
              <circle cx="42" cy="24" r="11" fill={paint("coral")} />
              <path d="M26 52v-8a16 16 0 0 1 32 0v8q-16 8-32 0Z" fill={paint("purple")} />
            </>
          ) : current === "tools" ? (
            <>
              <rect x="7" y="9" width="43" height="42" rx="9" fill={paint("sea")} transform="rotate(-12 29 30)" />
              <rect x="18" y="18" width="40" height="39" rx="10" fill={paint("purple")} transform="rotate(8 38 38)" />
              <path d="m29 31 6 7-7 6m14 1h7" strokeWidth="3.5" />
            </>
          ) : (
            <>
              <path d="M8 10h30a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H21l-10 7v-8a8 8 0 0 1-7-8V18a8 8 0 0 1 4-8Z" fill={paint("sea")} />
              <path d="M27 23h24a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-3v7l-11-7H27a8 8 0 0 1-8-8V31a8 8 0 0 1 8-8Z" fill={paint("blue")} />
              <path d="M29 35h20M29 43h12" strokeWidth="3" />
            </>
          )}
        </g>
      </motion.svg>
    </motion.button>
  );
}
