/* =========================
   Types
========================= */

export type InsightGrade = "good" | "neutral" | "warning" | "bad";

export type TldrSection = {
  title: string;
  bullets: string[];
  verdict: string;
  grade: InsightGrade;
};

export type IslandData = {
  islandName?: string;

  population?: number;
  populationShareNational?: number;

  tourismPressure?: number;
  seasonality?: number;

  dormidasShareNational?: number;   // % das dormidas nacionais
  hospedesShareNational?: number;   // % dos hóspedes nacionais
  avgStay?: number;                 // noites
  domesticShare?: number;           // %

  receitasYear?: number;
  receitasIsland?: number;
  receitasIslandLabel?: string;
  receitasNationalTotal?: number;
  receitasShareNational?: number;   // %
};


export type TldrResult = {
  sections: TldrSection[];
  globalVerdict: string;
};

function formatCVE(value: number) {
  return `${new Intl.NumberFormat("pt-PT", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(value)} CVE`;
}



/* =========================
   Global Verdict Logic
========================= */

function buildGlobalVerdict(data: IslandData): string {
  const {
    islandName,
    population,
    tourismPressure,
    seasonality,
    dormidasShareNational,
    hospedesShareNational,
    receitasShareNational,
    domesticShare,
  } = data;
  const islandLabel = islandName || "a ilha";

  const hasCoreTourism =
    typeof tourismPressure === "number" && typeof seasonality === "number";
  const hasNationalPosition =
    typeof dormidasShareNational === "number" &&
    typeof hospedesShareNational === "number";
  const hasFiscalSignal = typeof receitasShareNational === "number";

  if (!hasCoreTourism || (!hasNationalPosition && !hasFiscalSignal)) {
    return `Dados insuficientes para uma leitura integrada robusta. São necessários indicadores combinados de pressão turística, posição nacional e receitas para avaliar a situação atual de ${islandLabel} com maior realismo.`;
  }

  const dShare = dormidasShareNational ?? 0;
  const hShare = hospedesShareNational ?? 0;
  const tourismScaleShare = Math.max(dShare, hShare);
  const fiscalShare = receitasShareNational ?? 0;
  const smallPopulation = typeof population === "number" ? population < 10_000 : true;
  const domesticPct = typeof domesticShare === "number" ? domesticShare * 100 : null;

  const pressureText =
    tourismPressure! < 1
      ? "A pressão turística está baixa no território."
      : tourismPressure! < 3
      ? "A pressão turística está em nível moderado e ainda controlável."
      : tourismPressure! < 8
      ? "A pressão turística já é elevada e exige gestão ativa."
      : "A pressão turística está em nível crítico para a escala da ilha.";

  const seasonalityText =
    seasonality! < 3
      ? "A sazonalidade está relativamente equilibrada."
      : seasonality! < 8
      ? "A sazonalidade é elevada, com quebra fora da época alta."
      : "A sazonalidade é muito forte, concentrando atividade em poucos meses.";

  let nationalText = "";
  if (tourismScaleShare < 2) {
    nationalText =
      `No plano nacional, ${islandLabel} mantém peso turístico reduzido face aos principais polos.`;
  } else if (tourismScaleShare < 8) {
    nationalText =
      `No plano nacional, ${islandLabel} tem presença turística intermédia, sem liderança de fluxos.`;
  } else {
    nationalText =
      `No plano nacional, ${islandLabel} já apresenta relevância turística elevada.`;
  }

  let fiscalText = "";
  if (fiscalShare < 0.2) {
    fiscalText =
      `O peso das receitas de ${islandLabel} no total nacional continua muito baixo, sinal de fraca tração económica relativa.`;
  } else if (fiscalShare < 1) {
    fiscalText =
      `O peso das receitas de ${islandLabel} no total nacional é baixo, com margem clara para consolidar base económica local.`;
  } else {
    fiscalText =
      `O peso das receitas de ${islandLabel} no total nacional já é material, indicando maior capacidade de geração de valor.`;
  }

  let resilienceText = "";
  if (domesticPct == null) {
    resilienceText =
      "Sem série completa de procura interna, a leitura de resiliência da procura permanece parcial.";
  } else if (domesticPct < 10) {
    resilienceText =
      "A procura interna é limitada, o que aumenta dependência de mercados externos.";
  } else if (domesticPct < 25) {
    resilienceText =
      "A procura interna existe mas ainda não estabiliza totalmente a atividade ao longo do ano.";
  } else {
    resilienceText =
      "A procura interna já contribui para maior estabilidade económica entre épocas.";
  }

  const priorityText =
    tourismPressure! < 3 && fiscalShare < 1
      ? "Prioridade estratégica: transformar atividade turística em maior retenção de valor local (emprego, cadeia local e base fiscal)."
      : tourismPressure! >= 3
      ? "Prioridade estratégica: gerir crescimento com disciplina territorial, reduzindo concentração sazonal e preservando capacidade local."
      : "Prioridade estratégica: reforçar produtividade e continuidade anual sem perder equilíbrio territorial.";

  const populationQualifier =
    smallPopulation
      ? "Numa ilha de pequena escala populacional, variações de procura têm impacto desproporcional na economia local."
      : "";

  return [
    pressureText,
    seasonalityText,
    nationalText,
    fiscalText,
    resilienceText,
    populationQualifier,
    priorityText,
  ]
    .filter(Boolean)
    .join(" ");
}

/* =========================
   Main Builder
========================= */

export function buildIslandTldr(data: IslandData): TldrResult {
  const sections: TldrSection[] = [];

  /* =====================
     POPULAÇÃO
  ===================== */

  if (typeof data.population === "number") {
    sections.push({
      title: "População",
      bullets: [
        `A ilha tem cerca de ${data.population.toLocaleString("pt-PT")} residentes.`,
        typeof data.populationShareNational === "number"
          ? `Corresponde a aproximadamente ${data.populationShareNational.toFixed(
            1
          )}% da população nacional.`
          : "Representa uma base populacional pequena à escala nacional.",
      ],
      verdict:
        "População de pequena escala, onde a criação de valor económico por residente é o principal desafio estrutural.",
      grade: data.population < 5_000 ? "warning" : "neutral",
    });

  }

  if (
    typeof data.dormidasShareNational === "number" ||
    typeof data.hospedesShareNational === "number"
  ) {
    const d = data.dormidasShareNational ?? 0;
    const h = data.hospedesShareNational ?? 0;

    const bullets: string[] = [];
    let verdict = "";
    let grade: InsightGrade;

    bullets.push(
      `A ilha representa cerca de ${d.toFixed(1)}% das dormidas turísticas nacionais.`
    );

    bullets.push(
      `Concentra aproximadamente ${h.toFixed(1)}% dos hóspedes em Cabo Verde.`
    );

    if (d < 5 && h < 5) {
      verdict =
        "Ilha periférica no sistema turístico nacional, com peso reduzido face aos principais polos.";
      grade = "neutral";
    } else if (d < 15) {
      verdict =
        "Ilha com relevância intermédia, sem dominar os fluxos turísticos nacionais.";
      grade = "neutral";
    } else {
      verdict =
        "Ilha central no turismo nacional, com forte concentração de fluxos.";
      grade = "warning";
    }

    sections.push({
      title: "Posição Nacional",
      bullets,
      verdict,
      grade,
    });
  }

  if (
    typeof data.receitasIsland === "number" &&
    typeof data.receitasNationalTotal === "number" &&
    typeof data.receitasShareNational === "number"
  ) {
    const share = data.receitasShareNational;
    const receitasLabel = data.receitasIslandLabel || data.islandName || "a ilha";
    const ano =
      typeof data.receitasYear === "number"
        ? ` em ${data.receitasYear}`
        : "";

    const bullets = [
      `As receitas arrecadadas em ${receitasLabel}${ano} foram de cerca de ${formatCVE(
        data.receitasIsland
      )}.`,
      `No mesmo período, o total nacional foi de aproximadamente ${formatCVE(
        data.receitasNationalTotal
      )}.`,
      `Isto representa um peso relativo de ${share.toFixed(
        2
      )}% de ${receitasLabel} no total nacional.`,
    ];

    let verdict = "";
    let grade: InsightGrade;

    if (share < 0.2) {
      verdict =
        "Peso fiscal muito reduzido no contexto nacional, reforçando a necessidade de aumentar capacidade de retenção de valor na economia local.";
      grade = "warning";
    } else if (share < 1) {
      verdict =
        "Peso fiscal baixo face ao total nacional, com margem para consolidação da base económica da ilha.";
      grade = "neutral";
    } else {
      verdict =
        "Participação fiscal relevante no contexto nacional, sinal de maior tração económica territorial.";
      grade = "good";
    }

    sections.push({
      title: "Receitas",
      bullets,
      verdict,
      grade,
    });
  }


  if (typeof data.avgStay === "number") {
    const v = data.avgStay;

    const bullets = [
      `A estadia média é de cerca de ${v.toFixed(1)} noites.`,
    ];

    let verdict = "";
    let grade: InsightGrade;

    if (v < 3) {
      verdict =
        "Estadias curtas indicam turismo de passagem ou baixa retenção.";
      grade = "warning";
    } else if (v < 6) {
      verdict =
        "Estadias moderadas, compatíveis com turismo estruturado mas não imersivo.";
      grade = "neutral";
    } else {
      verdict =
        "Estadias longas sugerem turismo de permanência e maior integração local.";
      grade = "good";
    }

    sections.push({
      title: "Retenção Turística",
      bullets,
      verdict,
      grade,
    });
  }


  if (typeof data.domesticShare === "number") {
    const v = data.domesticShare;

    const bullets = [
      `Cerca de ${(v * 100).toFixed(1)}% dos hóspedes são residentes em Cabo Verde.`,
    ];

    let verdict = "";
    let grade: InsightGrade;

    if (v < 10) {
      verdict =
        "Forte dependência de procura externa, com fraca base doméstica.";
      grade = "warning";
    } else if (v < 25) {
      verdict =
        "Alguma presença de turismo interno, mas ainda secundária.";
      grade = "neutral";
    } else {
      verdict =
        "Turismo interno relevante, reforçando resiliência e ligação ao território.";
      grade = "good";
    }

    sections.push({
      title: "Turismo Interno",
      bullets,
      verdict,
      grade,
    });
  }


  /* =====================
     PRESSÃO TURÍSTICA
  ===================== */

  if (typeof data.tourismPressure === "number") {
    const v = data.tourismPressure;


    let bullets: string[] = [];
    let verdict = "";

    if (v < 1) {
      bullets = [
        "O número anual de dormidas é inferior ao número de residentes.",
        "O turismo tem impacto marginal no quotidiano local.",
      ];
      verdict = "Turismo residual, sem pressão territorial ou social.";
    } else if (v < 3) {
      bullets = [
        "O turismo gera mais dormidas do que o número de residentes.",
        "A atividade turística existe, mas não domina o ritmo da ilha.",
        "Não há sinais relevantes de pressão sobre serviços ou habitação.",
      ];
      verdict =
        "Turismo presente e integrado, com margem clara de escolha estratégica.";
    } else if (v < 8) {
      bullets = [
        "O turismo já tem peso relevante na economia local.",
        "Começam a surgir impactos sobre serviços, habitação e território.",
      ];
      verdict =
        "Turismo dominante, exigindo gestão ativa para evitar desequilíbrios.";
    } else {
      bullets = [
        "As dormidas superam largamente a população residente.",
        "A pressão sobre o território e a vida local é elevada.",
      ];
      verdict =
        "Pressão turística elevada, com riscos claros de saturação.";
    }

    let grade: InsightGrade;

    if (v < 3) grade = "good";
    else if (v < 4) grade = "neutral";
    else if (v < 8) grade = "warning";
    else grade = "bad";

    sections.push({
      title: "Pressão Turística",
      bullets,
      verdict,
      grade,
    });

  }

  /* =====================
     SAZONALIDADE
  ===================== */

  if (typeof data.seasonality === "number") {
    const v = data.seasonality;

    let bullets: string[] = [];
    let verdict = "";

    if (v < 3) {
      bullets = [
        "A atividade turística distribui-se de forma relativamente equilibrada ao longo do ano.",
        "O inverno mantém níveis relevantes de procura.",
      ];
      verdict = "Baixa sazonalidade, com atividade turística estável.";
    } else if (v < 8) {
      bullets = [
        "O verão concentra a maioria das dormidas turísticas.",
        "O inverno apresenta uma quebra clara de atividade.",
      ];
      verdict =
        "Sazonalidade elevada, com rendimentos irregulares ao longo do ano.";
    } else {
      bullets = [
        "A maior parte da atividade turística ocorre no verão.",
        "O inverno apresenta atividade residual.",
        "A economia depende fortemente de poucos meses por ano.",
      ];
      verdict =
        "Economia turística fortemente concentrada no verão.";
    }

    let grade: InsightGrade;

    if (v < 3) grade = "good";
    else if (v < 8) grade = "warning";
    else grade = "bad";

    sections.push({
      title: "Sazonalidade",
      bullets,
      verdict,
      grade,
    });

  }

  /* =====================
     Final result
  ===================== */

  return {
    sections,
    globalVerdict: buildGlobalVerdict(data),
  };
}
