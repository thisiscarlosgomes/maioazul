"use client";

import { useEffect, useState } from "react";

const frames = [
  { name: "rotcha", alt: "Praia da Bitxe Rotcha, ilha do Maio" },
  { name: "pontapreta", alt: "Ponta Preta, ilha do Maio" },
  { name: "bocalagoa", alt: "Boca Lagoa, ilha do Maio" },
] as const;

const sizes = "(max-width: 700px) 90vw, 40vw";

function frameSources(name: string) {
  return {
    avif: `/slideshow/${name}-640.avif 640w, /slideshow/${name}-1280.avif 1280w`,
    webp: `/slideshow/${name}-640.webp 640w, /slideshow/${name}-1280.webp 1280w`,
    fallback: `/slideshow/${name}-640.webp`,
  };
}

export function MaioSlideshow() {
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
        const sources = frameSources(frame.name);
        return (
          <picture
            key={frame.name}
            className="slideshow-frame"
            style={{ opacity: frameIndex === index ? 1 : 0 }}
          >
            <source type="image/avif" srcSet={sources.avif} sizes={sizes} />
            <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
            <img
              src={sources.fallback}
              alt={frame.alt}
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
