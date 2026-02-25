import { promises as fs } from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "data", "offline");

const endpoints = [
  { url: "/api/places", out: "../maio_places_with_coords.json", direct: true },
  { url: "/api/maio/weather", out: "maio/weather.json" },
  { url: "/api/maio/wind", out: "maio/wind.json" },
  { url: "/api/maio/marine", out: "maio/marine.json" },
  { url: "/api/maio/air", out: "maio/air.json" },
  { url: "/api/schedules/boats", out: "schedules/boats.json" },
  { url: "/api/schedules/flights", out: "schedules/flights.json" },
  {
    url: "/api/transparencia/municipal/maio/core-metrics?year=2025",
    out: "transparencia/municipal/maio/core-metrics-2025.json",
  },
  {
    url: "/api/transparencia/municipal/transferencias?municipio=CMMAIO&year=2025",
    out: "transparencia/municipal/transferencias-CMMAIO-2025.json",
  },
  { url: "/api/transparencia/turismo/hoteis", out: "transparencia/turismo/hoteis.json" },
  {
    url: "/api/transparencia/turismo/population?year=2025",
    out: "transparencia/turismo/population-2025.json",
  },
  {
    url: "/api/transparencia/turismo/overview?year=2025",
    out: "transparencia/turismo/overview-2025.json",
  },
  {
    url: "/api/transparencia/turismo/pressure?year=2025",
    out: "transparencia/turismo/pressure-2025.json",
  },
  {
    url: "/api/transparencia/turismo/seasonality?year=2025",
    out: "transparencia/turismo/seasonality-2025.json",
  },
  {
    url: "/api/transparencia/turismo/dependency?ilha=Maio&year=2025",
    out: "transparencia/turismo/dependency-2025-Maio.json",
  },
  {
    url: "/api/transparencia/turismo/2024/baseline",
    out: "transparencia/turismo/2024/baseline.json",
  },
  {
    url: "/api/transparencia/turismo/2024/overview",
    out: "transparencia/turismo/2024/overview.json",
  },
  {
    url: "/api/transparencia/turismo/2024/islands",
    out: "transparencia/turismo/2024/islands.json",
  },
  {
    url: "/api/transparencia/turismo/2024/structure/summary",
    out: "transparencia/turismo/2024/structure/summary.json",
  },
  {
    url: "/api/transparencia/turismo/2024/island?ilha=Maio",
    out: "transparencia/turismo/2024/island-Maio.json",
  },
];

async function writeJson(targetPath, data) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(data, null, 2));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed ${url} (${res.status})`);
  }
  return res.json();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const entry of endpoints) {
    const fullUrl = `${BASE_URL}${entry.url}`;
    const data = await fetchJson(fullUrl);

    const outPath = entry.direct
      ? path.join(process.cwd(), "public", "data", "maio_places_with_coords.json")
      : path.join(OUT_DIR, entry.out);

    await writeJson(outPath, data);
    console.log(`Saved ${entry.url} -> ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch((err) => {
  console.error("Offline snapshot failed:", err);
  process.exit(1);
});
