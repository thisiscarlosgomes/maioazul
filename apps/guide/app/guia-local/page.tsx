"use client";

import { useState } from "react";
import MainSiteHeader from "@/components/MainSiteHeader";
import { jsPDF } from "jspdf";
import {
  ShieldCheck,
  BadgeCheck,
  Sparkles,
  BadgeDollarSign,
  Clock3,
  MapPinned,
  Leaf,
  UtensilsCrossed,
  Users,
  Handshake,
  Route,
  ClipboardCheck,
  Download,
  type LucideIcon,
} from "lucide-react";

const sections = [
  {
    title: "1. Colocar o respeito pelo Maio em primeiro lugar",
    body: "O turismo deve acrescentar valor à vida local, e não competir com ela.",
    points: [
      "Receber visitantes com simpatia, honestidade e paciência.",
      "Apresentar o Maio como uma comunidade viva, não apenas um destino.",
      "Respeitar bairros, tradições e rotinas do dia a dia.",
      "Incentivar o consumo de cultura, produtos e serviços locais.",
      "Evitar experiências que gerem ruído, lixo, aglomeração ou desrespeito.",
    ],
  },
  {
    title: "2. Ser legal, visível e confiável",
    body: "A confiança começa com uma operação regular e transparente.",
    points: [
      "Operar com autorização/licença municipal adequada para a atividade.",
      "Manter licenças e documentos obrigatórios organizados e acessíveis.",
      "Garantir que a atividade exercida corresponde ao que está licenciado.",
      "Usar sinalização clara de identificação do negócio.",
      "Atualizar ou remover sinalização quando houver fecho ou mudança de atividade.",
    ],
  },
  {
    title: "3. Manter espaços limpos, higiénicos e prontos para serviço",
    body: "Limpeza não é apenas saúde pública; é parte central da experiência do visitante.",
    points: [
      "Manter casas de banho funcionais, limpas e acessíveis.",
      "Conservar áreas de serviço, cozinha, armazenamento e atendimento em boas condições.",
      "Proteger alimentos prontos para consumo contra pó, insetos e contaminação.",
      "Usar materiais adequados de conservação e embalagem.",
      "Expor apenas produtos em bom estado e dentro da validade.",
      "Aplicar rotinas de higiene da equipa, quando aplicável.",
    ],
  },
  {
    title: "4. Mostrar preços com clareza e agir com justiça",
    body: "Preço transparente é uma das formas mais rápidas de criar confiança.",
    points: [
      "Exibir preços de forma visível e legível.",
      "Garantir que o que é vendido corresponde ao que é anunciado.",
      "Evitar custos escondidos, ambiguidades e preços inconsistentes.",
      "Usar pesos e medidas corretos quando aplicável.",
      "Tratar residentes e visitantes com equidade.",
    ],
  },
  {
    title: "5. Respeitar horários e o descanso local",
    body: "Uma economia turística saudável deve coexistir com o direito ao descanso dos moradores.",
    points: [
      "Cumprir os horários aplicáveis à categoria do estabelecimento.",
      "Solicitar autorização prévia para extensões de horário, quando necessário.",
      "Reduzir ruído no período noturno.",
      "Evitar música alta, gritos, ruído de veículos e cargas/descargas perturbadoras junto a habitações.",
      "Gerir comportamento de clientes dentro e fora do estabelecimento.",
      "Treinar equipas para prevenir e desescalar problemas de ruído.",
    ],
  },
  {
    title: "6. Usar o espaço público com cuidado",
    body: "Passeios, ruas, praças e frentes de praia são bens coletivos e devem ser usados com responsabilidade.",
    points: [
      "Obter licença municipal antes de ocupar espaço público.",
      "Garantir passagem segura de peões e acessos.",
      "Não bloquear entradas, propriedades vizinhas ou circulação.",
      "Manter a área limpa durante o uso e restaurada ao final.",
      "Usar estruturas organizadas, seguras e adequadas ao local.",
      "Evitar odores, ruído, desordem e instalações inseguras.",
    ],
  },
  {
    title: "7. Proteger praias e áreas naturais",
    body: "A natureza do Maio é um ativo estratégico. A proteção ambiental é infraestrutura turística essencial.",
    points: [
      "Evitar que lixo, efluentes ou resíduos sólidos cheguem à praia e ao espaço público.",
      "Disponibilizar recipientes de resíduos onde houver geração de lixo.",
      "Limpar imediatamente após tours, alugueres, refeições ou eventos.",
      "Evitar danos em dunas, zonas costeiras sensíveis e acessos naturais.",
      "Desencorajar fogueiras, lixo e perturbação de fauna.",
      "Preferir materiais reutilizáveis e soluções de menor impacto.",
    ],
  },
  {
    title: "8. Gerir alimentação, bebidas e eventos com responsabilidade",
    body: "Negócios de alimentação e entretenimento influenciam diretamente o ambiente da ilha.",
    points: [
      "Servir alimentos em condições de segurança e higiene.",
      "Cumprir regras legais sobre venda de bebidas alcoólicas.",
      "Planear eventos com controlo de saneamento, resíduos e ruído.",
      "Garantir condições sanitárias mínimas em montagens temporárias.",
      "Planear fluxo de pessoas, sanitários, limpeza e desmontagem antes do evento.",
      "Retirar estruturas temporárias e deixar o local limpo.",
    ],
  },
  {
    title: "9. Trabalhar bem com a vizinhança",
    body: "Todo negócio turístico tem vizinhos. Relação local saudável sustenta operação de longo prazo.",
    points: [
      "Comunicar antecipadamente atividades especiais com potencial impacto.",
      "Responder a reclamações com respeito e rapidez.",
      "Evitar reincidência de problemas que possam gerar restrições municipais.",
      "Gerir entregas, geradores, música e serviço exterior com atenção ao entorno.",
      "Manter fachadas e áreas externas organizadas e agradáveis.",
    ],
  },
  {
    title: "10. Fortalecer cadeias de valor locais",
    body: "O turismo gera mais benefício quando o gasto permanece na ilha.",
    points: [
      "Priorizar fornecedores locais quando houver qualidade e disponibilidade.",
      "Promover artesanato, gastronomia, música, guias e serviços do Maio.",
      "Contratar e qualificar mão de obra local.",
      "Contar a história por trás de produtos e experiências locais.",
      "Incentivar exploração responsável de toda a ilha.",
    ],
  },
  {
    title: "11. Tornar a mobilidade mais segura e tranquila",
    body: "Transporte e operações na via pública impactam diretamente residentes e visitantes.",
    points: [
      "Não bloquear ruas, passeios ou acessos.",
      "Organizar cargas, descargas e recolhas com eficiência.",
      "Evitar paragens perigosas em bermas e zonas de circulação.",
      "Orientar visitantes sobre estacionamento e travessias seguras.",
      "Promover condução e ciclismo responsáveis.",
      "Reduzir ruído e funcionamento desnecessário de motores em zonas habitadas.",
    ],
  },
  {
    title: "12. Estar preparado para inspeção e responsabilidade",
    body: "Negócios sólidos não esperam pela reclamação para agir.",
    points: [
      "Manter registos, licenças e autorizações sempre organizados.",
      "Formar a equipa sobre regras aplicáveis à operação diária.",
      "Corrigir inconformidades rapidamente quando notificadas.",
      "Usar checklist operacional para higiene, sinalização, ruído, espaço público e resíduos.",
      "Tratar inspeção como padrão profissional, não como problema.",
    ],
  },
];

const checklist = [
  "O espaço está limpo e pronto?",
  "Os preços estão visíveis?",
  "Licenças e documentos obrigatórios estão em ordem?",
  "A ocupação exterior está conforme e sem obstruções?",
  "Alimentos e produtos estão protegidos e em bom estado?",
  "A equipa está preparada para atender com respeito?",
  "A gestão de resíduos está a funcionar?",
  "A atividade de hoje respeita vizinhos e o descanso local?",
];

const sectionToneClasses = [
  "border-emerald-200 bg-emerald-50",
  "border-violet-200 bg-violet-50",
  "border-amber-200 bg-amber-50",
  "border-sky-200 bg-sky-50",
  "border-rose-200 bg-rose-50",
];

const sectionIcons: LucideIcon[] = [
  ShieldCheck,
  BadgeCheck,
  Sparkles,
  BadgeDollarSign,
  Clock3,
  MapPinned,
  Leaf,
  UtensilsCrossed,
  Users,
  Handshake,
  Route,
  ClipboardCheck,
];

const highlightCards = [
  {
    label: "Comunidade",
    quote: "“Bom turismo começa com respeito por quem vive no Maio.”",
    tone: "bg-pink-500 text-white",
    size: "lg:row-span-2",
  },
  {
    label: "Confianca",
    quote: "“Licenças visíveis, preços claros e atendimento honesto criam confiança.”",
    tone: "bg-amber-500 text-white",
    size: "lg:row-span-2",
  },
  {
    label: "Qualidade",
    quote: "“Limpeza, higiene e bom serviço melhoram toda a experiência.”",
    tone: "bg-sky-500 text-white",
    size: "lg:row-span-2",
  },
  {
    label: "Sustentabilidade",
    quote: "“Proteger praias e natureza é proteger o futuro do turismo.”",
    tone: "bg-violet-500 text-white",
    size: "lg:row-span-2",
  },
  {
    label: "Economia Local",
    quote: "“Quando o turismo apoia negócios locais, o Maio cresce com mais valor.”",
    tone: "bg-emerald-500 text-white",
    size: "lg:col-span-2",
  },
];

export default function BusinessGuidelinesPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const showDetailedSections = false;

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

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      y = addWrapped(
        pdf,
        "Guia para Negocios de Turismo - Ilha do Maio",
        marginX,
        y,
        contentWidth,
        7
      );

      y += 1;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      y = addWrapped(
        pdf,
        "Nota importante: Este guia reúne boas práticas para negócios ligados ao turismo no Maio. Não substitui a legislação aplicável, nem constitui um documento legal oficial.",
        marginX,
        y,
        contentWidth,
        5
      );

      y += 8;
      for (const section of sections) {
        y = ensureSpace(pdf, y, 26, marginTop, marginBottom, watermark);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        y = addWrapped(pdf, section.title, marginX, y, contentWidth, 5.5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        y = addWrapped(pdf, section.body, marginX, y + 0.5, contentWidth, 4.8);

        for (const point of section.points) {
          y = ensureSpace(pdf, y, 10, marginTop, marginBottom, watermark);
          y = addWrapped(pdf, `- ${point}`, marginX + 2, y + 0.5, contentWidth - 2, 4.6);
        }
        y += 6;
      }

      y = ensureSpace(pdf, y, 20, marginTop, marginBottom, watermark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      y = addWrapped(pdf, "Checklist Operacional Diario", marginX, y, contentWidth, 5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      for (const item of checklist) {
        y = ensureSpace(pdf, y, 10, marginTop, marginBottom, watermark);
        y = addWrapped(pdf, `- ${item}`, marginX + 2, y + 0.5, contentWidth - 2, 4.6);
      }

      pdf.save("guia-local-maio.pdf");
    } catch (error) {
      console.error("Failed to generate Guia Local PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <MainSiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6">
        <h1 className="text-xl font-semibold sm:text-2xl">
          Boas Práticas para Negócios Locais de Turismo na ilha do Maio
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Este guia reúne boas práticas para negócios ligados ao turismo no Maio. Não substitui a legislação aplicável, nem constitui um documento legal oficial.
          O objetivo é melhorar a experiência do visitante com respeito pela comunidade, pela natureza e pela identidade do Maio.
        </p>
        <div className="mt-4 w-full">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-4 text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? "A gerar guia..." : "Descarregar Guia"}</span>
          </button>
        </div>

        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[180px]">
            {highlightCards.map((card) => (
              <article
                key={card.label}
                className={`rounded-2xl p-5 shadow-sm ${card.tone} ${card.size}`}
              >
                <p className="text-sm font-semibold opacity-90">{card.label}</p>
                <p className="mt-3 text-lg font-semibold leading-tight sm:text-xl">
                  {card.quote}
                </p>
              </article>
            ))}
          </div>
        </section>

        {showDetailedSections && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  className={`rounded-2xl border p-4 ${sectionToneClasses[index % sectionToneClasses.length]}`}
                >
                  <h2 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                    {(() => {
                      const Icon = sectionIcons[index % sectionIcons.length];
                      return <Icon className="h-4 w-4 shrink-0" />;
                    })()}
                    <span>{section.title}</span>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{section.body}</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <h2 className="text-base font-semibold sm:text-lg">
                Checklist Operacional Diário
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <h2 className="text-base font-semibold sm:text-lg">Nota Final</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Os melhores negócios turísticos do Maio não vendem apenas serviços.
                Eles protegem o caráter da ilha, elevam a experiência do visitante e
                reforçam o orgulho local. Profissionalismo, justiça, limpeza,
                tranquilidade e respeito comunitário são a base de um turismo forte e
                sustentável no Maio.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
