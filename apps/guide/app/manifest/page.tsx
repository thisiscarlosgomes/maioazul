"use client";

import { useState } from "react";
import MainSiteHeader from "@/components/MainSiteHeader";
import { useLang } from "@/lib/lang";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";

export default function ManifestPage() {
  const [lang] = useLang();
  const [isDownloading, setIsDownloading] = useState(false);

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

  const loadWatermark = async () => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to load watermark image"));
      element.src = "/maioazul.png";
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.globalAlpha = 0.08;
    ctx.drawImage(img, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  };

  const addWatermarkToPage = (
    pdf: jsPDF,
    watermark: { dataUrl: string; width: number; height: number } | null
  ) => {
    if (!watermark) return;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth * 0.7;
    const renderedWidth = Math.min(maxWidth, watermark.width * 0.05);
    const renderedHeight = (renderedWidth * watermark.height) / watermark.width;
    const x = (pageWidth - renderedWidth) / 2;
    const y = (pageHeight - renderedHeight) / 2;
    pdf.addImage(watermark.dataUrl, "PNG", x, y, renderedWidth, renderedHeight, undefined, "FAST");
  };

  const addPageDecorations = (
    pdf: jsPDF,
    watermark: { dataUrl: string; width: number; height: number } | null
  ) => {
    addWatermarkToPage(pdf, watermark);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const linkText = "visitmaio.com";
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(14, 116, 144);
    const textWidth = pdf.getTextWidth(linkText);
    const x = (pageWidth - textWidth) / 2;
    const y = pageHeight - 8;
    pdf.textWithLink(linkText, x, y, { url: "https://visitmaio.com" });
    pdf.setTextColor(0, 0, 0);
  };

  const addWrapped = (
    pdf: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + lines.length * lineHeight;
  };

  const ensureSpace = (
    pdf: jsPDF,
    y: number,
    needed: number,
    marginTop: number,
    marginBottom: number,
    watermark: { dataUrl: string; width: number; height: number } | null
  ) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + needed > pageHeight - marginBottom) {
      pdf.addPage();
      addPageDecorations(pdf, watermark);
      return marginTop;
    }
    return y;
  };

  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const watermark = await loadWatermark().catch(() => null);
      const marginX = 14;
      const marginTop = 16;
      const marginBottom = 16;
      const contentWidth = pdf.internal.pageSize.getWidth() - marginX * 2;
      let y = marginTop;
      addPageDecorations(pdf, watermark);

      const sections = [
        { title: copy[lang].cityTitle, items: copy[lang].cityItems },
        { title: copy[lang].nightTitle, items: copy[lang].nightItems },
        { title: copy[lang].stayTitle, items: copy[lang].stayItems },
        { title: copy[lang].sustainTitle, items: copy[lang].sustainItems },
        { title: copy[lang].toursTitle, items: copy[lang].toursItems },
      ];

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      y = addWrapped(pdf, copy[lang].title, marginX, y, contentWidth, 7);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      y = addWrapped(pdf, copy[lang].intro, marginX, y + 1, contentWidth, 5);

      y += 6;
      for (const section of sections) {
        y = ensureSpace(pdf, y, 24, marginTop, marginBottom, watermark);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        y = addWrapped(pdf, section.title, marginX, y, contentWidth, 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        for (const item of section.items) {
          y = ensureSpace(pdf, y, 10, marginTop, marginBottom, watermark);
          y = addWrapped(pdf, `- ${item}`, marginX + 2, y + 0.5, contentWidth - 2, 4.6);
        }
        y += 3;
      }

      y = ensureSpace(pdf, y, 16, marginTop, marginBottom, watermark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      y = addWrapped(pdf, copy[lang].commitmentTitle, marginX, y, contentWidth, 5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      addWrapped(pdf, copy[lang].commitment, marginX, y + 0.5, contentWidth, 4.8);

      pdf.save("manifesto-maio.pdf");
    } catch (error) {
      console.error("Failed to generate Manifest PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      <MainSiteHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-semibold sm:text-2xl">{copy[lang].title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy[lang].intro}</p>
        <div className="mt-4 w-full">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-4 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? "A gerar manifesto..." : "Descarregar Manifesto"}</span>
          </button>
        </div>

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
