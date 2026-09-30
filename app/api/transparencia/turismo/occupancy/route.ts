import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const TYPE_LABELS: Record<string, string> = {
  hoteis: "Hotéis",
  pensoes: "Pensões",
  pousadas: "Pousadas",
  hoteis_apartamentos: "Hotéis-apartamentos",
  aldeamentos_turisticos: "Aldeamentos turísticos",
  residenciais: "Residenciais",
  alojamento_complementar: "Alojamento complementar",
};

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function displayType(value: unknown) {
  const key = normalizeKey(value);
  return TYPE_LABELS[key] ?? String(value ?? "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? 2025);
    const requestedIsland = searchParams.get("ilha")?.trim() || null;

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("turismo_structural");
    const establishments = db.collection("estabelecimentos_raw");
    const latest = await collection.findOne(
      { year, metric: "occupancy_rate" },
      { projection: { _id: 0, quarter: 1 }, sort: { quarter: -1 } }
    );

    if (latest?.quarter == null) {
      return NextResponse.json({ year, quarter: null, data: [] });
    }

    const rows = await collection
      .find({
        year,
        quarter: latest.quarter,
        metric: "occupancy_rate",
        tipo_estabelecimento: { $nin: ["Todos", "todos"] },
      })
      .project({ _id: 0, ilha: 1, tipo_estabelecimento: 1, value: 1 })
      .toArray();

    const normalizedIsland = requestedIsland?.toLowerCase();
    const selected = requestedIsland
      ? rows.filter((row) => {
          const rowIsland = String(row.ilha ?? "").toLowerCase();
          if (normalizedIsland === "todas as ilhas") {
            return rowIsland === "todas as ilhas" || rowIsland === "total";
          }
          return rowIsland === normalizedIsland;
        })
      : rows;

    const latestInventory = await establishments.findOne(
      { year: { $lte: year }, metric: "establishments_count" },
      { projection: { _id: 0, year: 1 }, sort: { year: -1 } }
    );
    const inventoryYear =
      latestInventory?.year == null ? null : Number(latestInventory.year);
    const inventoryRows = inventoryYear == null
      ? []
      : await establishments
          .find({ year: inventoryYear, metric: "establishments_count" })
          .project({ _id: 0, ilha: 1, tipo_estabelecimento: 1, value: 1 })
          .toArray();
    const inventoryByType = new Map<string, number>();

    for (const row of inventoryRows) {
      const rowIsland = String(row.ilha ?? "").toLowerCase();
      const include = normalizedIsland === "todas as ilhas"
        ? true
        : requestedIsland
          ? rowIsland === normalizedIsland
          : true;
      if (!include) continue;

      const key = normalizeKey(row.tipo_estabelecimento);
      inventoryByType.set(
        key,
        (inventoryByType.get(key) ?? 0) + Number(row.value ?? 0)
      );
    }

    const order = Object.keys(TYPE_LABELS);
    const data = selected
      .map((row) => ({
        ilha: row.ilha === "Total" ? "Todas as ilhas" : row.ilha,
        tipo_estabelecimento: displayType(row.tipo_estabelecimento),
        occupancy_rate:
          typeof row.value === "number" && Number.isFinite(row.value)
            ? row.value
            : null,
        establishments_count:
          inventoryYear == null
            ? null
            : inventoryByType.get(normalizeKey(row.tipo_estabelecimento)) ?? 0,
      }))
      .sort(
        (a, b) =>
          order.indexOf(normalizeKey(a.tipo_estabelecimento)) -
          order.indexOf(normalizeKey(b.tipo_estabelecimento))
      );

    return NextResponse.json({
      year,
      quarter: Number(latest.quarter),
      establishments_reference_year: inventoryYear,
      ilha: requestedIsland,
      metric: "occupancy_rate_by_establishment_type",
      unit: "percent",
      data,
      source: "INE Cabo Verde · Inquérito Mensal à Movimentação de Hóspedes",
      establishments_source: inventoryYear == null
        ? null
        : `INE Cabo Verde · Inventário Anual de Estabelecimentos Hoteleiros (${inventoryYear})`,
    });
  } catch (error) {
    console.error("[Tourism occupancy by type]", error);
    return NextResponse.json(
      { error: "Failed to load occupancy by establishment type" },
      { status: 500 }
    );
  }
}
