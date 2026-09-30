import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || 2025);

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("turismo_raw");
    const annualCountryIsland = db.collection("turismo_country_island_annual");

    const hasAnnualIslandDataset =
      (await annualCountryIsland.countDocuments({
        year,
        granularity: "annual",
      })) > 0;

    if (hasAnnualIslandDataset) {
      const [annualRows, nationalQuarterRows] = await Promise.all([
        annualCountryIsland
          .aggregate([
            {
              $match: {
                year,
                granularity: "annual",
                pais: { $in: ["Cabo Verde", "Estrangeiros"] },
              },
            },
            {
              $group: {
                _id: "$ilha",
                hospedes: { $sum: "$hospedes" },
                dormidas: { $sum: "$dormidas" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),
        col
          .aggregate([
            {
              $match: {
                year,
                ilha: "Todas as ilhas",
                tipo_estabelecimento: "Todos",
                quarter: { $in: [1, 2, 3, 4] },
              },
            },
            {
              $group: {
                _id: "$quarter",
                hospedes: { $sum: "$hospedes" },
                dormidas: { $sum: "$dormidas" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),
      ]);

      const nationalByQuarter = new Map<number, { hospedes: number; dormidas: number }>(
        nationalQuarterRows.map((row) => [
          Number(row._id),
          {
            hospedes: Number(row.hospedes ?? 0),
            dormidas: Number(row.dormidas ?? 0),
          },
        ]),
      );

      const q1 = nationalByQuarter.get(1) ?? { hospedes: 0, dormidas: 0 };
      const q2 = nationalByQuarter.get(2) ?? { hospedes: 0, dormidas: 0 };
      const q3 = nationalByQuarter.get(3) ?? { hospedes: 0, dormidas: 0 };
      const q4 = nationalByQuarter.get(4) ?? { hospedes: 0, dormidas: 0 };

      const nationalHospedesAnnual = q1.hospedes + q2.hospedes + q3.hospedes + q4.hospedes;
      const nationalDormidasAnnual = q1.dormidas + q2.dormidas + q3.dormidas + q4.dormidas;

      const hospedesShares =
        nationalHospedesAnnual > 0
          ? {
              q1: q1.hospedes / nationalHospedesAnnual,
              q2: q2.hospedes / nationalHospedesAnnual,
              q3: q3.hospedes / nationalHospedesAnnual,
              q4: q4.hospedes / nationalHospedesAnnual,
            }
          : null;
      const dormidasShares =
        nationalDormidasAnnual > 0
          ? {
              q1: q1.dormidas / nationalDormidasAnnual,
              q2: q2.dormidas / nationalDormidasAnnual,
              q3: q3.dormidas / nationalDormidasAnnual,
              q4: q4.dormidas / nationalDormidasAnnual,
            }
          : null;

      const islands = annualRows.map((row) => {
        const ilha = String(row._id);
        const annualHospedes = Number(row.hospedes ?? 0);
        const annualDormidas = Number(row.dormidas ?? 0);

        let hospedesQuarters = [0, 0, 0, annualHospedes];
        let dormidasQuarters = [0, 0, 0, annualDormidas];

        if (hospedesShares) {
          const h1 = Math.round(annualHospedes * hospedesShares.q1);
          const h2 = Math.round(annualHospedes * hospedesShares.q2);
          const h3 = Math.round(annualHospedes * hospedesShares.q3);
          const h4 = Math.max(0, annualHospedes - h1 - h2 - h3);
          hospedesQuarters = [h1, h2, h3, h4];
        }

        if (dormidasShares) {
          const d1 = Math.round(annualDormidas * dormidasShares.q1);
          const d2 = Math.round(annualDormidas * dormidasShares.q2);
          const d3 = Math.round(annualDormidas * dormidasShares.q3);
          const d4 = Math.max(0, annualDormidas - d1 - d2 - d3);
          dormidasQuarters = [d1, d2, d3, d4];
        }

        return {
          ilha,
          quarters: [1, 2, 3, 4].map((quarter, index) => ({
            quarter,
            hospedes: hospedesQuarters[index],
            dormidas: dormidasQuarters[index],
          })),
        };
      });

      return NextResponse.json({
        year,
        islands,
        national_quarters: [1, 2, 3, 4].map((quarter) => ({
          quarter,
          hospedes: nationalByQuarter.get(quarter)?.hospedes ?? 0,
          dormidas: nationalByQuarter.get(quarter)?.dormidas ?? 0,
        })),
        quarter_method:
          "Island quarters are allocated from annual island totals using national quarter shares.",
        source_dataset: "turismo_country_island_annual + turismo_raw (quarterly_national)",
        source: "INE Cabo Verde · Estatísticas do Turismo",
      });
    }

    const pipeline = [
      { $match: { year } },
      {
        $group: {
          _id: {
            ilha: "$ilha",
            quarter: "$quarter",
          },
          hospedes: { $sum: "$hospedes" },
          dormidas: { $sum: "$dormidas" },
        },
      },
      {
        $group: {
          _id: "$_id.ilha",
          quarters: {
            $push: {
              quarter: "$_id.quarter",
              hospedes: "$hospedes",
              dormidas: "$dormidas",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await col.aggregate(pipeline).toArray();

    return NextResponse.json({
      year,
      islands: data.map((d) => ({
        ilha: d._id,
        quarters: d.quarters,
      })),
      source_dataset: "turismo_raw",
      source: "INE Cabo Verde · Estatísticas do Turismo",
    });
  } catch (err) {
    console.error("[Tourism quarters API]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
