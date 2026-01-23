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
  population?: number;
  populationShareNational?: number;

  tourismPressure?: number;
  seasonality?: number;

  dormidasShareNational?: number;   // % das dormidas nacionais
  hospedesShareNational?: number;   // % dos hóspedes nacionais
  avgStay?: number;                 // noites
  domesticShare?: number;           // %
};


export type TldrResult = {
  sections: TldrSection[];
  globalVerdict: string;
};



/* =========================
   Global Verdict Logic
========================= */

function buildGlobalVerdict(data: IslandData): string {
  const { population, tourismPressure, seasonality } = data;

  if (
    typeof population !== "number" ||
    typeof tourismPressure !== "number" ||
    typeof seasonality !== "number"
  ) {
    return "Dados insuficientes para uma leitura integrada da situação da ilha.";
  }

  const smallPopulation = population < 10_000;

  const tourismLow = tourismPressure < 1;
  const tourismModerate = tourismPressure >= 1 && tourismPressure < 3;
  const tourismHigh = tourismPressure >= 3;

  const lowSeasonality = seasonality < 3;
  const highSeasonality = seasonality >= 8;

  /* =====================
     Integrated assessment
  ===================== */

  if (tourismLow) {
    return smallPopulation
      ? "Economia com baixa exposição ao turismo e reduzida pressão externa. O principal desafio estrutural não é gerir excesso, mas criar atividade económica consistente que aumente o rendimento por residente."
      : "Turismo residual num território de maior escala, indicando uma economia pouco dependente de fluxos externos.";
  }

  if (tourismModerate && lowSeasonality) {
    return smallPopulation
      ? "Turismo presente mas equilibrado numa ilha de pequena escala. Existe margem real para escolhas estratégicas antes de surgirem pressões estruturais sobre território, serviços ou habitação."
      : "Turismo integrado e relativamente estável ao longo do ano, com impacto controlado na economia local.";
  }

  if (tourismModerate && highSeasonality) {
    return "Turismo relevante mas fortemente concentrado no verão. A economia beneficia da atividade turística, mas enfrenta rendimentos irregulares e dependência sazonal, tornando a diversificação económica fora da época alta crítica.";
  }

  if (tourismHigh && highSeasonality) {
    return smallPopulation
      ? "Economia fortemente exposta ao turismo, com elevada sazonalidade e baixa base populacional. Pequenas variações de procura têm impacto desproporcional sobre rendimento, serviços públicos e equilíbrio territorial."
      : "Turismo dominante e concentrado em poucos meses, exigindo gestão ativa para evitar desequilíbrios económicos e sociais.";
  }

  return "Economia em transição, com sinais mistos entre integração turística e dependência estrutural.";
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

    let bullets: string[] = [];
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


  if (typeof data.avgStay === "number") {
    const v = data.avgStay;

    let bullets = [
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

    let bullets = [
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
