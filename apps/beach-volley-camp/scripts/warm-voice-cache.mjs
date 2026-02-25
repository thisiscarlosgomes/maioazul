import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();

const loadEnvFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
  } catch {
    // ignore missing env files
  }
};

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "zGjIP4SZlMnY9m93k97r";
const MODEL_ID = "eleven_multilingual_v2";
const VOICE_LANG = (process.env.VOICE_LANG || "en").toLowerCase();
const DEFAULT_TARGET = "church of nossa senhora da luz";

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}

const placesPath = path.join(root, "public", "data", "maio_places_with_coords.json");
const protectedAreasPath = path.join(root, "public", "data", "protected_areas.geojson");
const outDir = path.join(root, "public", "voice");

const NO_TRIM_TITLES = [
  "parque natural do norte",
  "parque natural de barreiro e figueira",
  "norte da ilha do maio natural park",
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
  "church of nossa senhora da luz",
  "igreja de nossa senhora da luz",
  "unesco biosphere reserve — maio",
  "reserva da biosfera da unesco — maio",
];

const trimText = (text, title = "") => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const lowerTitle = title.toLowerCase();
  const skipTrim = NO_TRIM_TITLES.some((t) => lowerTitle.includes(t));
  if (skipTrim) return cleaned;
  return cleaned.length > 600 ? `${cleaned.slice(0, 600)}…` : cleaned;
};

const hashKey = (text) =>
  crypto.createHash("sha256").update(`${VOICE_ID}:${MODEL_ID}:${text}`).digest("hex").slice(0, 24);

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const normalizeTarget = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

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
      const name =
        (place?.name &&
          typeof place.name === "object" &&
          place.name[VOICE_LANG]) ||
        "";
      const desc =
        (place?.description &&
          typeof place.description === "object" &&
          place.description[VOICE_LANG]) ||
        "";
      if (!name || !desc) return null;
      const text = trimText(`${name}. ${desc}`, name);
      if (!text) return null;
      return { id: place.id || name, name, text };
    })
    .filter(Boolean);

  const protectedTargets = protectedAreas
    .map((feature) => {
      const props = feature?.properties || {};
      const name =
        props?.[`name_${VOICE_LANG}`] || props?.name || props?.afia_name || "";
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
        typeof desc === "string" ? desc : desc?.[VOICE_LANG] || "";
      if (!descriptionText) return null;
      const text = trimText(`${name}. ${descriptionText}`, name);
      if (!text) return null;
      return { id: props?.id || name, name, text };
    })
    .filter(Boolean);

  const targets = [...placeTargets, ...protectedTargets];
  const targetFilter = normalizeTarget(
    process.env.VOICE_TARGET || DEFAULT_TARGET
  );
  const forceRegenerate =
    process.env.VOICE_FORCE === "1" ||
    process.env.VOICE_FORCE === "true" ||
    !!targetFilter;
  const shouldGenerate = (item) => {
    if (!targetFilter) return true;
    return (
      normalizeTarget(item.name).includes(targetFilter) ||
      normalizeTarget(item.id).includes(targetFilter)
    );
  };
  const generationTargets = targets.filter(shouldGenerate);
  const manifestItems = targets.map((item) => ({
    id: item.id,
    name: item.name,
    hash: hashKey(item.text),
  }));

  console.log(
    `Generating voice cache for ${generationTargets.length} items (${placeTargets.length} places, ${protectedTargets.length} protected areas)...`
  );

  for (const item of generationTargets) {
    const key = hashKey(item.text);
    const outPath = path.join(outDir, `${key}.mp3`);
    if (!forceRegenerate && (await exists(outPath))) {
      console.log(`✓ cached ${item.name}`);
      continue;
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text: item.text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`✗ failed ${item.name}: ${res.status} ${res.statusText}`);
      console.error(err.slice(0, 400));
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buffer);
    console.log(`→ generated ${item.name}`);
  }

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
