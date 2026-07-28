import { NextRequest, NextResponse } from "next/server";

type RequestBody = {
  nome?: unknown;
  data_nascimento?: unknown;
  turnstileToken?: unknown;
};

const ELEICOES_ENDPOINT = "https://eleicoes.cv/api/local-de-voto";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const dataNascimento =
      typeof body.data_nascimento === "string" ? body.data_nascimento.trim() : "";
    const turnstileToken =
      typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";

    if (!nome || !dataNascimento || !turnstileToken) {
      return NextResponse.json(
        {
          error: true,
          success: false,
          message: "Dados incompletos. Redefina sua pesquisa.",
        },
        { status: 400 },
      );
    }

    const upstream = await fetch(ELEICOES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        data_nascimento: dataNascimento,
        turnstileToken,
      }),
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = {
        error: true,
        success: false,
        message: "Resposta invalida da API de eleicoes.",
        raw: text,
      };
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        error: true,
        success: false,
        message: "Falha ao consultar API de eleicoes.",
      },
      { status: 500 },
    );
  }
}
