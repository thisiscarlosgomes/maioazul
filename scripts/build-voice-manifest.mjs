import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "zGjIP4SZlMnY9m93k97r";
const MODEL_ID = "eleven_multilingual_v2";

const placesPath = path.join(root, "public", "data", "maio_places_with_coords.json");
const protectedAreasPath = path.join(root, "public", "data", "protected_areas.geojson");
const outDir = path.join(root, "public", "voice");

const NO_TRIM_TITLES = [
  "parque natural do norte",
  "parque natural de barreiro e figueira",
  "city of porto inglês",
  "city of porto ingles",
  "porto inglês",
  "porto ingles",
  "ribeira of lagoa",
  "ribeira da lagoa",
  "ribeira de lagoa",
  "lagoa",
  "beaches of boca lagoa and seada",
  "boca lagoa",
  "seada",
];

const trimText = (text, title = "") => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const lowerTitle = title.toLowerCase();
  const skipTrim = NO_TRIM_TITLES.some((t) => lowerTitle.includes(t));
  if (skipTrim) return cleaned;
  return cleaned.length > 600 ? `${cleaned.slice(0, 600)}…` : cleaned;
};

const hashKey = (text) =>
  crypto
    .createHash("sha256")
    .update(`${VOICE_ID}:${MODEL_ID}:${text}`)
    .digest("hex")
    .slice(0, 24);

const main = async () => {
  await fs.mkdir(outDir, { recursive: true });
  const raw = await fs.readFile(placesPath, "utf8");
  const places = JSON.parse(raw);
  let protectedAreas = [];
  try {
    const protectedRaw = await fs.readFile(protectedAreasPath, "utf8");
    const geojson = JSON.parse(protectedRaw);
    protectedAreas = geojson?.features || [];
  } catch {
    protectedAreas = [];
  }

  const placeTargets = places
    .map((place) => {
      const name = place?.name?.en || place?.name?.pt || place?.name || "";
      const desc = place?.description?.en || "";
      if (!name || !desc) return null;
      const text = trimText(`${name}. ${desc}`, name);
      if (!text) return null;
      return { id: place.id || name, name, text };
    })
    .filter(Boolean);

  const protectedTargets = protectedAreas
    .map((feature) => {
      const props = feature?.properties || {};
      const name = props?.name || props?.afia_name || "";
      if (!name) return null;
      let desc = props?.description;
      if (typeof desc === "string") {
        try {
          desc = JSON.parse(desc);
        } catch {
          // keep string
        }
      }
      const descriptionText =
        typeof desc === "string" ? desc : desc?.en || "";
      if (!descriptionText) return null;
      const text = trimText(`${name}. ${descriptionText}`, name);
      if (!text) return null;
      return { id: props?.id || name, name, text };
    })
    .filter(Boolean);

  const targets = [...placeTargets, ...protectedTargets];
  const manifestItems = targets.map((item) => ({
    id: item.id,
    name: item.name,
    hash: hashKey(item.text),
  }));

  const manifestPath = path.join(outDir, "manifest.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify({ items: manifestItems }, null, 2)
  );
  console.log(`✓ wrote voice manifest (${manifestItems.length} items)`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
