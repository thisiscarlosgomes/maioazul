import path from "path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const revalidate = 21600;

type EnergyPayload = {
  scope?: string;
  dataset?: string;
  entity?: {
    country?: string;
    island?: string;
    municipality?: string;
  };
  as_of_date?: string | null;
  units?: Record<string, string>;
  summary?: {
    annualDemandGwh?: {
      planningForecast2025?: number | null;
      impliedCurrentFromSolarPlantReport?: number | null;
      recommendedWorkingValueGwh?: number | null;
      lowerBoundGwh?: number | null;
      upperBoundGwh?: number | null;
      reason?: string;
    };
    solarPlantReference?: {
      installedCapacityKwp?: number | null;
      expectedAnnualGenerationMwh?: number | null;
      reportedShareOfDemandPercent?: number | null;
    };
  };
  source_quality?: unknown;
  sources?: unknown[];
  updatedAt?: string | Date | null;
};

function normalizePayload(payload: EnergyPayload, fallback: boolean) {
  return {
    scope: payload.scope ?? "municipal",
    dataset: payload.dataset ?? "maio_energy_core_data",
    entity: payload.entity ?? {
      country: "Cabo Verde",
      island: "Maio",
      municipality: "Maio",
    },
    as_of_date: payload.as_of_date ?? null,
    units: payload.units ?? {},
    summary: payload.summary ?? {},
    source_quality: payload.source_quality ?? {},
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    fallback,
    updatedAt: payload.updatedAt ?? null,
  };
}

async function loadFallbackFromLocalFile() {
  const fallbackPath = path.join(process.cwd(), "data", "energy", "maio_energy_core_data.json");
  const raw = await readFile(fallbackPath, "utf8");
  const parsed = JSON.parse(raw) as {
    entity?: EnergyPayload["entity"];
    dataset?: string;
    as_of_date?: string;
    units?: Record<string, string>;
    core_data?: {
      annual_electricity_demand_gwh?: {
        planning_forecast_2025?: number;
        implied_current_from_solar_plant_report?: number;
        recommended_working_value_gwh?: number;
        lower_bound_gwh?: number;
        upper_bound_gwh?: number;
        recommended_working_value_reason?: string;
      };
      solar_plant_reference?: {
        installed_capacity_kwp?: number;
        expected_annual_generation_mwh?: number;
        reported_share_of_maio_current_demand_percent?: number;
      };
    };
    source_quality?: unknown;
    sources?: unknown[];
  };

  return {
    scope: "municipal",
    dataset: parsed.dataset ?? "maio_energy_core_data",
    entity: parsed.entity ?? {
      country: "Cabo Verde",
      island: "Maio",
      municipality: "Maio",
    },
    as_of_date: parsed.as_of_date ?? null,
    units: parsed.units ?? {},
    summary: {
      annualDemandGwh: {
        planningForecast2025: parsed.core_data?.annual_electricity_demand_gwh?.planning_forecast_2025 ?? null,
        impliedCurrentFromSolarPlantReport:
          parsed.core_data?.annual_electricity_demand_gwh?.implied_current_from_solar_plant_report ?? null,
        recommendedWorkingValueGwh:
          parsed.core_data?.annual_electricity_demand_gwh?.recommended_working_value_gwh ?? null,
        lowerBoundGwh: parsed.core_data?.annual_electricity_demand_gwh?.lower_bound_gwh ?? null,
        upperBoundGwh: parsed.core_data?.annual_electricity_demand_gwh?.upper_bound_gwh ?? null,
        reason:
          parsed.core_data?.annual_electricity_demand_gwh?.recommended_working_value_reason ?? "",
      },
      solarPlantReference: {
        installedCapacityKwp: parsed.core_data?.solar_plant_reference?.installed_capacity_kwp ?? null,
        expectedAnnualGenerationMwh:
          parsed.core_data?.solar_plant_reference?.expected_annual_generation_mwh ?? null,
        reportedShareOfDemandPercent:
          parsed.core_data?.solar_plant_reference?.reported_share_of_maio_current_demand_percent ?? null,
      },
    },
    source_quality: parsed.source_quality ?? {},
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    updatedAt: null,
  } satisfies EnergyPayload;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<EnergyPayload>("maio_energy_core");

    const doc = await col
      .find({ dataset: "maio_energy_core_data", "entity.island": "Maio" })
      .sort({ as_of_date: -1, updatedAt: -1 })
      .limit(1)
      .next();

    if (doc) {
      return NextResponse.json(normalizePayload(doc, false), {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      });
    }

    const fallback = await loadFallbackFromLocalFile();
    return NextResponse.json(normalizePayload(fallback, true), {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[Maio Energy Core]", err);
    return NextResponse.json(
      { error: "Failed to load Maio energy core data." },
      { status: 500 },
    );
  }
}
