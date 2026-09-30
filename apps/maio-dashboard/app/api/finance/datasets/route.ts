import path from "path";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 21600;

type DatasetKey = "external_sector_bcv_2025" | "payment_system_2019_2023";

type FinanceDatasetDoc = {
  datasetKey?: DatasetKey;
  payload?: unknown;
  updatedAt?: Date | string | null;
};

const DATASET_FILES: Record<DatasetKey, string> = {
  external_sector_bcv_2025: path.join(
    process.cwd(),
    "public",
    "data",
    "external-sector-bcv-2025.json"
  ),
  payment_system_2019_2023: path.join(
    process.cwd(),
    "public",
    "data",
    "payment-system-2019-2023.json"
  ),
};

function isDatasetKey(value: string): value is DatasetKey {
  return value === "external_sector_bcv_2025" || value === "payment_system_2019_2023";
}

async function loadFallback(datasetKey: DatasetKey) {
  const raw = await readFile(DATASET_FILES[datasetKey], "utf8");
  return JSON.parse(raw) as unknown;
}

export async function GET(request: NextRequest) {
  try {
    const datasetParam = request.nextUrl.searchParams.get("dataset");
    if (!datasetParam || !isDatasetKey(datasetParam)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid dataset. Use dataset=external_sector_bcv_2025 or dataset=payment_system_2019_2023.",
        },
        { status: 400 }
      );
    }

    if (process.env.MONGODB_URI) {
      const { default: dbClientPromise } = await import("@/lib/mongodb");
      const client = await dbClientPromise;
      const db = client.db();
      const col = db.collection<FinanceDatasetDoc>("finance_datasets");

      const doc = await col
        .find({ datasetKey: datasetParam })
        .sort({ updatedAt: -1 })
        .limit(1)
        .next();

      if (doc?.payload && typeof doc.payload === "object") {
        return NextResponse.json(doc.payload, {
          headers: {
            "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
          },
        });
      }
    }

    const fallback = await loadFallback(datasetParam);
    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[Finance Datasets API]", err);
    return NextResponse.json(
      { error: "Failed to load finance dataset." },
      { status: 500 }
    );
  }
}
