"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Vote } from "lucide-react";

const ELECTION_TARGET_ISO = "2026-05-17T08:00:00-01:00";
const CNE_MAIO_LEGISLATIVAS_URL = "https://cne.cv/legislativas-2026/maio/";

function formatUnit(value: number) {
  return value.toString().padStart(2, "0");
}

function getTimeLeft(targetMs: number) {
  const now = Date.now();
  const diff = targetMs - now;

  if (diff <= 0) {
    return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { ended: false, days, hours, minutes, seconds };
}

export default function ElectionCountdown() {
  const targetMs = useMemo(() => new Date(ELECTION_TARGET_ISO).getTime(), []);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetMs));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(targetMs));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [targetMs]);

  return (
    <section className="mt-8 rounded-lg border border-border bg-card px-4 py-4 sm:px-6">
      <div className="mb-1 flex items-center justify-center gap-2 pt-2">
        <Image src="/26.png" alt="26" width={34} height={16} className="h-4 w-auto shrink-0" />
        <p className="text-center text-base font-medium text-foreground sm:text-lg">
          Eleições Legislativas de 17 de Maio
        </p>
      </div>
      <p className="hidden opacity-50 text-center">Quando os cabo-verdianos vão votar</p>
      <div className="rounded-md px-3 py-6 sm:px-6">
        {timeLeft.ended ? (
          <p className="text-center [font-family:'JetBrainsMonoMedium',monospace] text-xl font-bold tracking-[0.12em] text-red-600 dark:text-red-400 sm:text-3xl">
            VOTACAO INICIADA
          </p>
        ) : (
          <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 [font-family:'JetBrainsMonoMedium',monospace] text-[#4877FB] dark:text-blue-400">
            <span className="text-3xl font-bold sm:text-4xl">
              {timeLeft.days}D
            </span>
            <span className="text-3xl font-bold  sm:text-4xl">
              {formatUnit(timeLeft.hours)}H
            </span>
            <span className="text-3xl font-bold sm:text-4xl">
              {formatUnit(timeLeft.minutes)}M
            </span>
            <span className="text-3xl font-bold sm:text-4xl">
              {formatUnit(timeLeft.seconds)}S
            </span>
          </div>
        )}
      </div>
      <div className="pb-2 text-center">
        <a
          href={CNE_MAIO_LEGISLATIVAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex overflow-hidden rounded-[7px] border border-blue-500/40 p-[1px]"
        >
          <span className="absolute inset-0 bg-blue-500/25" />
          <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,transparent_35%,#60a5fa_50%,transparent_65%,transparent_100%)] bg-[length:220%_100%] animate-[border-slide_2.2s_linear_infinite]" />
          <span className="relative inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90">
            <Vote className="h-4 w-4" />
            Consultar Aonde Votar
          </span>
        </a>
      </div>
    </section>
  );
}
