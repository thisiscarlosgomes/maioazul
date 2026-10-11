import Image from "next/image";

export function MaioSlideshow() {
  return (
    <div className="showcase-photo maio-slideshow">
      <Image
        src="/slideshow/rotcha.png"
        alt="Praia da Bitxe Rotcha, ilha do Maio"
        fill
        sizes="(max-width: 700px) 90vw, 40vw"
        priority
      />
    </div>
  );
}
