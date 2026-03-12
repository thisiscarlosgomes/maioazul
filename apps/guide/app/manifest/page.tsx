"use client";

import MainSiteHeader from "@/components/MainSiteHeader";
import { useLang } from "@/lib/lang";

export default function ManifestPage() {
  const [lang] = useLang();

  const copy = {
    en: {
      title: "Maio Tourist Manifest",
      intro:
        "This manifesto sets out good practices to ensure tourism in Maio strengthens local life, protects biodiversity, and keeps the island's authentic pace.",
      cityTitle: "City & Community",
      cityItems: [
        "Be friendly and curious about local culture, habits, and daily rhythm.",
        "Use simple local words: 'Olá', 'obrigado', and 'como estás?'.",
        "Support local shops, guides, fishers, and family-run businesses.",
        "Respect monuments, churches, and community spaces.",
      ],
      nightTitle: "At Night",
      nightItems: [
        "Enjoy nightlife with moderation and respect for residents.",
        "Keep noise low in public streets and near homes.",
        "Use bins and keep beaches and streets clean.",
      ],
      stayTitle: "Accommodation",
      stayItems: [
        "Respect house rules and check-in/check-out times.",
        "Save water and energy, and reduce waste.",
        "Reuse towels and avoid unnecessary single-use items.",
        "Be considerate with luggage noise during sleeping hours.",
      ],
      sustainTitle: "Sustainability",
      sustainItems: [
        "Choose walking, cycling, or shared transport whenever possible.",
        "Protect dunes, wetlands, nesting beaches, and marine life.",
        "Avoid litter and recycle where facilities are available.",
        "Prefer low-impact experiences and responsible operators.",
      ],
      toursTitle: "Tours & Attractions",
      toursItems: [
        "Follow guidance at each attraction and protected area.",
        "Choose certified or trusted local guides.",
        "Respect places of worship and cultural heritage.",
        "Leave no trace at beaches, trails, and viewpoints.",
      ],
      commitmentTitle: "Visitor Pledge",
      commitment:
        "I commit to visit Maio with respect, travel responsibly, and leave only good memories.",
    },
    pt: {
      title: "Manifesto do Turista do Maio",
      intro:
        "Este manifesto define boas práticas para garantir que o turismo no Maio fortalece a vida local, protege a biodiversidade e preserva o ritmo autêntico da ilha.",
      cityTitle: "Cidade & Comunidade",
      cityItems: [
        "Seja cordial e curioso sobre a cultura, hábitos e ritmo local.",
        "Use palavras simples locais: 'Olá', 'obrigado' e 'como estás?'.",
        "Apoie lojas locais, guias, pescadores e negócios familiares.",
        "Respeite monumentos, igrejas e espaços comunitários.",
      ],
      nightTitle: "À Noite",
      nightItems: [
        "Aproveite a noite com moderação e respeito pelos residentes.",
        "Mantenha o ruído baixo em ruas públicas e perto de casas.",
        "Use os caixotes e mantenha praias e ruas limpas.",
      ],
      stayTitle: "Alojamento",
      stayItems: [
        "Respeite as regras da casa e horários de check-in/check-out.",
        "Poupe água e energia, e reduza resíduos.",
        "Reutilize toalhas e evite descartáveis desnecessários.",
        "Tenha cuidado com o ruído das malas em horas de descanso.",
      ],
      sustainTitle: "Sustentabilidade",
      sustainItems: [
        "Escolha caminhar, pedalar ou transporte partilhado sempre que possível.",
        "Proteja dunas, zonas húmidas, praias de desova e vida marinha.",
        "Evite lixo e recicle quando houver infraestruturas.",
        "Prefira experiências de baixo impacto e operadores responsáveis.",
      ],
      toursTitle: "Tours & Atrações",
      toursItems: [
        "Siga as orientações de cada atração e área protegida.",
        "Escolha guias locais certificados ou de confiança.",
        "Respeite locais de culto e património cultural.",
        "Não deixe rasto em praias, trilhos e miradouros.",
      ],
      commitmentTitle: "Compromisso do Visitante",
      commitment:
        "Comprometo-me a visitar o Maio com respeito, viajar de forma responsável e deixar apenas boas memórias.",
    },
  } as const;

  return (
    <main className="bg-background text-foreground">
      <MainSiteHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-semibold sm:text-2xl">{copy[lang].title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy[lang].intro}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-lg font-semibold">{copy[lang].cityTitle}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {copy[lang].cityItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <h2 className="text-lg font-semibold">{copy[lang].nightTitle}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {copy[lang].nightItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-lg font-semibold">{copy[lang].stayTitle}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {copy[lang].stayItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <h2 className="text-lg font-semibold">{copy[lang].sustainTitle}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {copy[lang].sustainItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:col-span-2">
            <h2 className="text-lg font-semibold">{copy[lang].toursTitle}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {copy[lang].toursItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
