import { NextResponse } from "next/server";

type Region = {
  code?: string;
  name?: string;
  nr_inscritos?: number;
  nr_vaga?: number;
};

type Version = {
  version?: string;
  date?: string;
  time?: string;
  timestamp?: number;
  type?: string;
};

type Deputado = {
  circulo?: string;
  partido?: string;
};

type MaioVotesEntry = {
  id?: string;
  pct?: number;
  votes?: number;
  name?: string;
  elected?: number;
};

type MaioGraphics = {
  nafrente?: {
    ids?: string[];
    value?: number;
    pct?: number;
  };
  votos?: MaioVotesEntry[];
  mesas?: {
    total?: number;
    value?: number;
    pct?: number;
  };
  votantes?: {
    total?: number;
    value?: number;
    abstention?: number;
    abstention_pct?: number;
    pct?: number;
    total_circulo?: number;
    pct_pub?: number;
  };
};

type NacionalGraphics = {
  nafrente?: {
    ids?: string[];
    value?: number;
    pct?: number;
    total?: number;
  };
  mesas?: {
    total?: number;
    value?: number;
    pct?: number;
  };
};

const VERSION_URL = "https://eleicoes.cv/data/version.json";
const REGIONS_URL = "https://eleicoes.cv/data/regions.json";
const DEPUTADOS_URL = "https://eleicoes.cv/data/deputados.json";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
  try {
    const [versionRes, regionsRes, deputadosRes] = await Promise.all([
      fetch(VERSION_URL, { cache: "no-store" }),
      fetch(REGIONS_URL, { cache: "no-store" }),
      fetch(DEPUTADOS_URL, { cache: "no-store" }),
    ]);

    if (!versionRes.ok || !regionsRes.ok || !deputadosRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Falha ao obter dados de eleicoes.cv.",
          status: {
            version: versionRes.status,
            regions: regionsRes.status,
            deputados: deputadosRes.status,
          },
        },
        { status: 502 },
      );
    }

    const [versionJson, regionsJson, deputadosJson] = await Promise.all([
      versionRes.json() as Promise<Version>,
      regionsRes.json() as Promise<Region[]>,
      deputadosRes.json() as Promise<Deputado[]>,
    ]);

    const versionTag = String(versionJson.version || "").trim();
    const MAIO_RESULTS_URL = versionTag
      ? `https://eleicoes.cv/data/${versionTag}/ma.json`
      : null;
    const NACIONAL_RESULTS_URL = versionTag
      ? `https://eleicoes.cv/data/${versionTag}/nacional.json`
      : null;

    let maioGraphics: MaioGraphics | null = null;
    if (MAIO_RESULTS_URL) {
      const maioResultsRes = await fetch(MAIO_RESULTS_URL, { cache: "no-store" });
      if (maioResultsRes.ok) {
        const maioResultsJson = (await maioResultsRes.json()) as {
          graphics?: { ma?: MaioGraphics };
        };
        maioGraphics = maioResultsJson?.graphics?.ma ?? null;
      }
    }

    let nacionalGraphics: NacionalGraphics | null = null;
    if (NACIONAL_RESULTS_URL) {
      const nacionalResultsRes = await fetch(NACIONAL_RESULTS_URL, { cache: "no-store" });
      if (nacionalResultsRes.ok) {
        const nacionalResultsJson = (await nacionalResultsRes.json()) as {
          graphics?: { nacional?: NacionalGraphics };
        };
        nacionalGraphics = nacionalResultsJson?.graphics?.nacional ?? null;
      }
    }

    const regions = asArray<Region>(regionsJson);
    const deputados = asArray<Deputado>(deputadosJson);

    const maio =
      regions.find((item) => String(item.code || "").toLowerCase() === "ma") ?? null;

    const deputadosMaio = deputados.filter(
      (item) => String(item.circulo || "").toLowerCase() === "ma",
    );

    const byParty = deputadosMaio.reduce<Record<string, number>>((acc, item) => {
      const party = String(item.partido || "N/D").toUpperCase();
      acc[party] = (acc[party] || 0) + 1;
      return acc;
    }, {});

    const votosPorPartido = asArray<MaioVotesEntry>(maioGraphics?.votos)
      .map((item) => ({
        id: String(item.id || ""),
        nome: String(item.name || "").trim(),
        votos: Number(item.votes || 0),
        percentagem: Number(item.pct || 0),
        eleitos: Number(item.elected || 0),
      }))
      .sort((a, b) => b.votos - a.votos);

    return NextResponse.json(
      {
        ok: true,
        source: "https://eleicoes.cv",
        version: versionJson,
        nacional: {
          lider: {
            partidos: asArray<string>(nacionalGraphics?.nafrente?.ids),
            votos: Number(nacionalGraphics?.nafrente?.value || 0),
            percentagem: Number(nacionalGraphics?.nafrente?.pct || 0),
            totalVotosContados: Number(nacionalGraphics?.nafrente?.total || 0),
          },
          mesas: {
            total: Number(nacionalGraphics?.mesas?.total || 0),
            apuradas: Number(nacionalGraphics?.mesas?.value || 0),
            percentagem: Number(nacionalGraphics?.mesas?.pct || 0),
          },
        },
        maio: {
          code: maio?.code ?? "ma",
          name: maio?.name ?? "MAIO",
          inscritos: maio?.nr_inscritos ?? null,
          vagas: maio?.nr_vaga ?? null,
          deputadosEleitosTotal: deputadosMaio.length,
          deputadosEleitosPorPartido: byParty,
          lider: {
            partidos: asArray<string>(maioGraphics?.nafrente?.ids),
            votos: Number(maioGraphics?.nafrente?.value || 0),
            percentagem: Number(maioGraphics?.nafrente?.pct || 0),
          },
          votosPorPartido,
          mesas: maioGraphics?.mesas ?? null,
          votantes: maioGraphics?.votantes ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Erro inesperado ao consultar resultados de Maio.",
      },
      { status: 500 },
    );
  }
}
