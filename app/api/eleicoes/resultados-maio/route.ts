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
  elected?: {
    total?: number;
    value?: number;
    pct?: number;
    toelect?: number;
    candidates?: Array<{
      id?: string;
      elected?: number;
    }>;
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
  votantes?: {
    total?: number;
    value?: number;
    abstention?: number;
    abstention_pct?: number;
    pct?: number;
    total_circulo?: number;
    pct_pub?: number;
  };
  brancos?: {
    total?: number;
    value?: number;
    pct?: number;
  };
  nulos?: {
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

const RAW_ELECTIONS_COLLECTION = "eleicoes_legislativas_2026_raw";

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
    geral: {
      inscritos: number;
      votantes: {
        valor: number;
        percentagem: number;
      };
      abstencao: {
        valor: number;
        percentagem: number;
      };
      nulos: {
        valor: number;
        percentagem: number;
      };
      brancos: {
        valor: number;
        percentagem: number;
      };
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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
  try {
    const warnings: string[] = [];
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const snapshot = await db.collection(RAW_ELECTIONS_COLLECTION).findOne(
      { election: "legislativas_2026" },
      { sort: { fetchedAt: -1 } },
    );

    if (!snapshot) {
      return NextResponse.json(
        {
          ok: false,
          source: "mongodb",
          message: "Sem snapshot das legislativas no banco de dados.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const versionJson: Version = (snapshot.versionMeta as Version) ?? {
      version: String(snapshot.version ?? ""),
    };
    const regions = asArray<Region>(snapshot.regions);
    const payloadByScope = (snapshot.payloadByScope ?? {}) as Record<string, unknown>;
    const maioGraphics =
      (payloadByScope.ma as { graphics?: { ma?: MaioGraphics } } | undefined)?.graphics?.ma ??
      null;
    const nacionalGraphics =
      (payloadByScope.global as { graphics?: { global?: NacionalGraphics } } | undefined)
        ?.graphics?.global ?? null;

    for (const failed of asArray<{ scope?: string; error?: string }>(snapshot.failedScopes)) {
      warnings.push(`scope ${failed.scope ?? "?"}: ${failed.error ?? "erro desconhecido"}`);
    }

    const maio =
      regions.find((item) => String(item.code || "").toLowerCase() === "ma") ?? null;

    const votosPorPartido = asArray<MaioVotesEntry>(maioGraphics?.votos)
      .map((item) => ({
        id: String(item.id || ""),
        nome: String(item.name || "").trim(),
        votos: Number(item.votes || 0),
        percentagem: Number(item.pct || 0),
        eleitos: Number(item.elected || 0),
      }))
      .sort((a, b) => b.votos - a.votos);

    const eleitosPorPartidoFromResults = asArray<{
      id?: string;
      elected?: number;
    }>(maioGraphics?.elected?.candidates).reduce<
      Record<string, number>
    >((acc, item) => {
      const party = String(item?.id || "N/D").toUpperCase();
      const count = Number(item?.elected || 0);
      if (count > 0) acc[party] = count;
      return acc;
    }, {});

    const deputadosEleitosTotal =
      Number(maioGraphics?.elected?.value ?? 0) ||
      Object.values(eleitosPorPartidoFromResults).reduce((sum, n) => sum + n, 0);

    const payload: ApiPayload = {
      ok: true,
      source: "mongodb:eleicoes_legislativas_2026_raw",
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
        geral: {
          inscritos: Number(nacionalGraphics?.votantes?.total || 0),
          votantes: {
            valor: Number(nacionalGraphics?.votantes?.value || 0),
            percentagem: Number(nacionalGraphics?.votantes?.pct || 0),
          },
          abstencao: {
            valor: Number(nacionalGraphics?.votantes?.abstention || 0),
            percentagem: Number(nacionalGraphics?.votantes?.abstention_pct || 0),
          },
          nulos: {
            valor: Number(nacionalGraphics?.nulos?.value || 0),
            percentagem: Number(nacionalGraphics?.nulos?.pct || 0),
          },
          brancos: {
            valor: Number(nacionalGraphics?.brancos?.value || 0),
            percentagem: Number(nacionalGraphics?.brancos?.pct || 0),
          },
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
        deputadosEleitosTotal,
        deputadosEleitosPorPartido: eleitosPorPartidoFromResults,
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
          warnings: ["Falha temporaria ao ler o banco; servindo ultimo snapshot valido em memoria."],
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
        source: "mongodb:eleicoes_legislativas_2026_raw",
        warnings: ["Base de dados indisponivel neste momento."],
        version: {},
        nacional: {
          lider: { partidos: [], votos: 0, percentagem: 0, totalVotosContados: 0 },
          mesas: { total: 0, apuradas: 0, percentagem: 0 },
          geral: {
            inscritos: 0,
            votantes: { valor: 0, percentagem: 0 },
            abstencao: { valor: 0, percentagem: 0 },
            nulos: { valor: 0, percentagem: 0 },
            brancos: { valor: 0, percentagem: 0 },
          },
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
