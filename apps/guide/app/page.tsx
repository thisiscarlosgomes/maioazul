"use client";

import { useRef, useState } from "react";

export default function GuideHome() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <section className="flex w-full max-w-md flex-col items-center gap-5">
        <div className="group relative h-32 w-3/4 sm:h-40">
          <video
            ref={videoRef}
            className="h-full w-full bg-black/5 object-cover"
            src="https://res.cloudinary.com/dhxfkhewr/video/upload/v1770381224/intro_ryqu6j.mp4"
            poster="/guidecover.jpg"
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <button
            type="button"
            aria-label={isPlaying ? "Pause intro video" : "Play intro video"}
            onClick={toggleVideo}
            className="absolute inset-0 grid place-items-center focus-visible:outline-none"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {isPlaying ? "II" : "▶"}
            </span>
          </button>
        </div>
        <h1 className="text-lg tracking-tight sm:text-xl">visit maio</h1>
      </section>
    </main>
  );
}
