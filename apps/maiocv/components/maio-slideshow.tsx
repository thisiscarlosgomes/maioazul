"use client";

import { useEffect, useState } from "react";
import { t, type MessageKey } from "../lib/i18n";
import type { Locale } from "../lib/locale";

const frames = ["rotcha", "pontapreta", "bocalagoa"] as const;

const sizes = "(max-width: 700px) 90vw, 40vw";

function frameSources(name: string) {
  return {
    avif: `/slideshow/${name}-640.avif 640w, /slideshow/${name}-1280.avif 1280w`,
    webp: `/slideshow/${name}-640.webp 640w, /slideshow/${name}-1280.webp 1280w`,
    fallback: `/slideshow/${name}-640.webp`,
  };
}

export function MaioSlideshow({ locale = "pt" }: { locale?: Locale }) {
  const [count, setCount] = useState(1);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = () => setCount(frames.length);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    if (count < frames.length) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % frames.length), 5000);
    return () => window.clearInterval(id);
  }, [count]);

  return (
    <div className="showcase-photo maio-slideshow">
      {frames.slice(0, count).map((frame, frameIndex) => {
        const sources = frameSources(frame);
        return (
          <picture
            key={frame}
            className="slideshow-frame"
            style={{ opacity: frameIndex === index ? 1 : 0 }}
            aria-hidden={frameIndex === index ? undefined : true}
          >
            <source type="image/avif" srcSet={sources.avif} sizes={sizes} />
            <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
            <img
              src={sources.fallback}
              alt={t(`slideshow.${frame}` as MessageKey, undefined, locale)}
              sizes={sizes}
              width={640}
              height={400}
              fetchPriority={frameIndex === 0 ? "high" : "low"}
              decoding="async"
            />
          </picture>
        );
      })}
    </div>
  );
}
