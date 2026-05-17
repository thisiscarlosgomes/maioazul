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
  votos?: Array<{
    id?: string;
    pct?: number;
    votes?: number;
    elected?: number;
  }>;
};

const VERSION_URL = "https://eleicoes.cv/data/version.json";
const REGIONS_URL = "https://eleicoes.cv/data/regions.json";
const DEPUTADOS_URL = "https://eleicoes.cv/data/deputados.json";

type ApiPayload = {
  ok: boolean;
  source: string;
  stale?: boolean;
  warnings?: string[];
  version: Version;
  nacional: {
    lider: {
      partidos: string[];
      votos: number;
      percentagem: number;
      totalVotosContados: number;
    };
    mesas: {
      total: number;
      apuradas: number;
      percentagem: number;
    };
    votosPorPartido: Array<{
      id: string;
      votos: number;
      percentagem: number;
      eleitos: number;
    }>;
  };
  maio: {
    code: string;
    name: string;
    inscritos: number | null;
    vagas: number | null;
    deputadosEleitosTotal: number;
    deputadosEleitosPorPartido: Record<string, number>;
    lider: {
      partidos: string[];
      votos: number;
      percentagem: number;
    };
    votosPorPartido: Array<{
      id: string;
      nome: string;
      votos: number;
      percentagem: number;
      eleitos: number;
    }>;
    mesas: MaioGraphics["mesas"] | null;
    votantes: MaioGraphics["votantes"] | null;
  };
};

let lastGoodPayload: ApiPayload | null = null;

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      return { ok: false as const, error: `HTTP ${response.status} @ ${url}` };
    }
    const data = (await response.json()) as T;
    return { ok: true as const, data };
  } catch {
    return { ok: false as const, error: `Timeout/erro de rede @ ${url}` };
  } finally {
    clearTimeout(id);
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
  try {
    const warnings: string[] = [];

    const [versionRes, regionsRes, deputadosRes] = await Promise.all([
      fetchJsonWithTimeout<Version>(VERSION_URL),
      fetchJsonWithTimeout<Region[]>(REGIONS_URL),
      fetchJsonWithTimeout<Deputado[]>(DEPUTADOS_URL),
    ]);

    const versionJson: Version = versionRes.ok ? versionRes.data : {};
    if (!versionRes.ok) warnings.push(versionRes.error);

    const regionsJson: Region[] = regionsRes.ok ? regionsRes.data : [];
    if (!regionsRes.ok) warnings.push(regionsRes.error);

    const deputadosJson: Deputado[] = deputadosRes.ok ? deputadosRes.data : [];
    if (!deputadosRes.ok) warnings.push(deputadosRes.error);

    const versionTag = String(versionJson.version || "").trim();
    const MAIO_RESULTS_URL = versionTag
      ? `https://eleicoes.cv/data/${versionTag}/ma.json`
      : null;
    const GLOBAL_RESULTS_URL = versionTag
      ? `https://eleicoes.cv/data/${versionTag}/global.json`
      : null;

    let maioGraphics: MaioGraphics | null = null;
    if (MAIO_RESULTS_URL) {
      const maioRes = await fetchJsonWithTimeout<{ graphics?: { ma?: MaioGraphics } }>(
        MAIO_RESULTS_URL,
      );
      if (maioRes.ok) maioGraphics = maioRes.data?.graphics?.ma ?? null;
      else warnings.push(maioRes.error);
    }

    let nacionalGraphics: NacionalGraphics | null = null;
    if (GLOBAL_RESULTS_URL) {
      const globalRes = await fetchJsonWithTimeout<{ graphics?: { global?: NacionalGraphics } }>(
        GLOBAL_RESULTS_URL,
      );
      if (globalRes.ok) nacionalGraphics = globalRes.data?.graphics?.global ?? null;
      else warnings.push(globalRes.error);
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

    const payload: ApiPayload = {
      ok: true,
      source: "https://eleicoes.cv",
      warnings: warnings.length ? warnings : undefined,
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
        votosPorPartido: asArray<{
          id?: string;
          pct?: number;
          votes?: number;
          elected?: number;
        }>(nacionalGraphics?.votos)
          .map((item) => ({
            id: String(item?.id || ""),
            votos: Number(item?.votes || 0),
            percentagem: Number(item?.pct || 0),
            eleitos: Number(item?.elected || 0),
          }))
          .sort((a, b) => b.votos - a.votos),
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
    };

    const hasUsefulData =
      payload.maio.votosPorPartido.length > 0 ||
      payload.nacional.votosPorPartido.length > 0 ||
      payload.maio.mesas?.total != null;

    if (hasUsefulData) {
      lastGoodPayload = payload;
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    if (lastGoodPayload) {
      return NextResponse.json(
        { ...lastGoodPayload, stale: true, warnings: warnings.length ? warnings : lastGoodPayload.warnings },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    if (lastGoodPayload) {
      return NextResponse.json(
        {
          ...lastGoodPayload,
          stale: true,
          warnings: ["Falha temporaria no upstream; servindo ultimo snapshot valido."],
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        stale: true,
        source: "https://eleicoes.cv",
        warnings: ["Upstream indisponivel neste momento."],
        version: {},
        nacional: {
          lider: { partidos: [], votos: 0, percentagem: 0, totalVotosContados: 0 },
          mesas: { total: 0, apuradas: 0, percentagem: 0 },
          votosPorPartido: [],
        },
        maio: {
          code: "ma",
          name: "MAIO",
          inscritos: null,
          vagas: null,
          deputadosEleitosTotal: 0,
          deputadosEleitosPorPartido: {},
          lider: { partidos: [], votos: 0, percentagem: 0 },
          votosPorPartido: [],
          mesas: null,
          votantes: null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
