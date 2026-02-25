import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const year = 2024;

    const rows = await db
      .collection("turismo_structural_country_establishment")
      .find({ year })
      .toArray();

    const grouped: Record<string, any[]> = {};

    for (const r of rows) {
      if (!grouped[r.pais]) grouped[r.pais] = [];
      grouped[r.pais].push({
        tipo_estabelecimento: r.tipo_estabelecimento,
        dormidas: r.value
      });
    }

    return NextResponse.json({
      year,
      structure: grouped,
      updatedAt: new Date()
    });
  } catch (err) {
    console.error("[Turismo 2024 Structure]", err);
    return NextResponse.json(
      { error: "Failed to load structure data" },
      { status: 500 }
    );
  }
}
