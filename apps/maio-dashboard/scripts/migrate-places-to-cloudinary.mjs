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

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("Missing Cloudinary env vars. Need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  process.exit(1);
}

const placesPath = path.join(root, "public", "data", "maio_places_with_coords.json");
const imagesDir = path.join(root, "public", "places");
const FORCE_UPLOAD = process.argv.includes("--force");

const toCloudinaryUrl = (secureUrl) =>
  secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");

const sign = (params) => {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + API_SECRET).digest("hex");
};

const uploadImage = async (filePath, publicId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: "places",
    public_id: publicId,
    overwrite: "true",
    timestamp: String(timestamp),
  };
  const signature = sign(params);

  const buffer = await fs.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), path.basename(filePath));
  form.append("folder", params.folder);
  form.append("public_id", params.public_id);
  form.append("overwrite", params.overwrite);
  form.append("timestamp", params.timestamp);
  form.append("api_key", API_KEY);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.secure_url;
};

const main = async () => {
  const raw = await fs.readFile(placesPath, "utf8");
  const places = JSON.parse(raw);
  const files = await fs.readdir(imagesDir);
  const fileIndex = new Map(
    files.map((filename) => [path.parse(filename).name, filename])
  );

  let updated = 0;
  for (const place of places) {
    const imageUrl = place.image_url;
    if (!imageUrl || typeof imageUrl !== "string") continue;

    let filename = null;
    let publicId = null;
    if (imageUrl.startsWith("/places/")) {
      filename = imageUrl.replace("/places/", "");
      publicId = path.parse(filename).name;
    } else if (imageUrl.includes("/places/")) {
      const after = imageUrl.split("/places/")[1] || "";
      const clean = after.split("?")[0];
      publicId = path.parse(clean).name;
      filename = fileIndex.get(publicId) || null;
    }

    if (!publicId) {
      if (!FORCE_UPLOAD) continue;
      continue;
    }

    if (!filename) {
      filename = fileIndex.get(publicId) || null;
    }

    if (!filename) {
      console.warn(`Missing file for ${place.id || place.name?.en || publicId}`);
      continue;
    }
    const filePath = path.join(imagesDir, filename);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      console.warn(`Missing file: ${filePath}`);
      continue;
    }

    if (!FORCE_UPLOAD && !imageUrl.startsWith("/places/")) {
      continue;
    }

    try {
      const secureUrl = await uploadImage(filePath, publicId);
      place.image_url = toCloudinaryUrl(secureUrl);
      updated += 1;
      console.log(`✓ ${place.id || place.name?.en || publicId}`);
    } catch (err) {
      console.error(`✗ ${place.id || place.name?.en || publicId}: ${err.message}`);
    }
  }

  await fs.writeFile(placesPath, JSON.stringify(places, null, 2));
  console.log(`Done. Updated ${updated} place image URLs.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
