"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/lang";

export default function ExperiencesPage() {
  const [lang] = useLang();
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      title: string;
      subtitle: { en: string; pt: string };
      image: string;
    }>
  >([]);

  const copy = useMemo(
    () => ({
      en: {
        title: "Experiences in Maio",
        aboutTitle: "Maio, at its own pace",
        aboutBody:
          "Maio is a calm island where time moves slowly. The beauty is in the simple rhythm of days, open horizons, and a community that welcomes visitors who travel with care.",
        aboutBody2:
          "Our mission is to keep Maio authentic and gentle: protecting nature, supporting local life, and inviting you to explore at a relaxed, respectful pace.",
        mustKnowTitle: "Must‑Knows",
        mustKnows: [
          "Slow down and plan for island time",
          "Support local businesses and guides",
          "Ask before taking photos of people",
          "Dress comfortably and bring sun protection",
          "Carry cash for small places",
          "Keep noise low in quiet areas",
          "Stay on marked trails in parks",
          "Take all rubbish back with you",
        ],
        intro:
          "In terms of activities, we recommend the usual ones. In spite of not being an island 100% recommended for trekking, it does offer the possibility of hiking in the different natural parks and protected areas. We can also make quad excursions around the island.",
        bathing:
          "In terms of bathing, we can relax on idyllic beaches absolutely remote and far from any sign of tourism. If we want to practice water sports, on the island of Maio we have the possibility of scuba diving, kayaking or SUP. During the winter and spring months there is the possibility of whale watching in the ocean. Finally, we can fish in designated areas.",
        outstanding: "Outstanding proposals:",
        proposals: [
          "Visit the turtle nests (July/September) with the Maio Biodiversidade Foundation.",
          "Visit the old salt mines of Porto Inglés",
          "Tour the entire island at your leisure in a rental car.",
        ],
        contact: "Contact us",
      },
      pt: {
        title: "Experiências em Maio",
        aboutTitle: "Maio, ao seu ritmo",
        aboutBody:
          "Maio é uma ilha calma onde o tempo abranda. A beleza está no ritmo simples dos dias, nos horizontes abertos e na comunidade que recebe quem viaja com cuidado.",
        aboutBody2:
          "A nossa missão é manter Maio autêntico: proteger a natureza, apoiar a vida local e convidar a explorar num ritmo relaxado e respeitoso.",
        mustKnowTitle: "Essenciais a saber",
        mustKnows: [
          "Desacelere e conte com o ritmo da ilha",
          "Apoie negócios e guias locais",
          "Peça autorização antes de fotografar pessoas",
          "Vista-se com conforto e leve proteção solar",
          "Leve dinheiro para pequenos serviços",
          "Evite ruído excessivo em zonas calmas",
          "Permaneça nos trilhos assinalados",
          "Leve todo o lixo consigo",
        ],
        intro:
          "Em termos de atividades, recomendamos as habituais. Apesar de não ser uma ilha 100% recomendada para trekking, oferece a possibilidade de caminhadas nos diferentes parques naturais e áreas protegidas. Também podemos fazer excursões de quad pela ilha.",
        bathing:
          "Em termos de banho, podemos relaxar em praias idílicas absolutamente remotas e longe de qualquer sinal de turismo. Se quisermos praticar desportos aquáticos, na ilha do Maio existe a possibilidade de mergulho, caiaque ou SUP. Durante os meses de inverno e primavera há possibilidade de observação de baleias no oceano. Por fim, podemos pescar em áreas designadas.",
        outstanding: "Propostas de destaque:",
        proposals: [
          "Visitar os ninhos de tartarugas (Julho/Setembro) com a Fundação Maio Biodiversidade.",
          "Visitar as antigas salinas de Porto Inglês",
          "Percorrer toda a ilha ao seu ritmo num carro de aluguer.",
        ],
        contact: "Fale connosco",
      },
    }),
    []
  );

  const fallbackActivities = [
    {
      id: "food",
      title: "Food",
      subtitle: {
        en: "Taste the island’s freshest catch.",
        pt: "Saboreie o peixe mais fresco da ilha.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770633850/tuna_oyjqjz.png",
    },
    {
      id: "trekking",
      title: "Trekking",
      subtitle: {
        en: "Slow walks through dunes and trails.",
        pt: "Caminhadas lentas entre dunas e trilhos.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770634013/penoso_2_zrdjrz.jpg",
    },
    {
      id: "fishing",
      title: "Fishing",
      subtitle: {
        en: "Cast a line where locals do.",
        pt: "Pesque onde os locais pescam.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770633849/fish_rih7bp.png",
    },
    {
      id: "beach",
      title: "Beach",
      subtitle: {
        en: "Quiet shores made for unhurried days.",
        pt: "Praias calmas para dias sem pressa.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770634116/morro1_olke19.jpg",
    },
    {
      id: "blue-sports",
      title: "Blue Sports",
      subtitle: {
        en: "Surf, Jet ski, SUP, or dive in clear waters.",
        pt: "Surf, Jet ski, SUP ou mergulho em águas claras.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770633849/surf_qfgyc1.png",
    },
    {
      id: "routes-4x4",
      title: "4x4 Routes",
      subtitle: {
        en: "Wander the island at your own pace.",
        pt: "Passeie pela ilha ao seu ritmo.",
      },
      image: "https://res.cloudinary.com/dhxfkhewr/image/upload/v1770633849/4_lpqfzn.png",
    },
  ];

  useEffect(() => {
    fetch("/api/experience-images")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setActivities(data);
          return;
        }
        setActivities(fallbackActivities);
      })
      .catch(() => setActivities(fallbackActivities));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
      <div className="w-full">
        <h1 className="text-2xl font-semibold">
          {copy[lang].title}
        </h1>
        <div className="mt-4">
          <div className="text-sm font-semibold">{copy[lang].aboutTitle}</div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {copy[lang].aboutBody}
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {copy[lang].aboutBody2}
          </p>
        </div>




      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="relative overflow-hidden rounded-2xl border border-border shadow-sm"
          >
            <img
              src={activity.image}
              alt={activity.title}
              className="h-44 w-full object-cover sm:h-52"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="text-lg font-semibold text-white">
                {activity.title}
              </div>
              <div className="mt-1 text-xs text-white/80">
                {activity.subtitle[lang]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* <div className="mt-6">
        <div className="text-sm font-semibold">{copy[lang].mustKnowTitle}</div>
        <div className="mt-3 flex flex-wrap gap-1">
          {copy[lang].mustKnows.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </div> */}

      {/* <div className="mt-10">
        <a
          href="/contact"
          className="hidden inline-flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.98]"
        >
          {copy[lang].contact}
        </a>
      </div> */}
    </div>
  );
}
