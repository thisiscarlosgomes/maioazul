#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const DATA_PATH = path.join(root, "public", "data", "experience_places_by_slug.json");

const loadEnvFile = async (filePath) => {
  try {
    const raw = await readFile(filePath, "utf8");
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      });
  } catch {
    // ignore missing env files
  }
};

const normalizeForDedupe = (url) => url.split("?")[0];

const sign = (params, apiSecret) => {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
};

const optimizeCloudinaryUrl = (secureUrl) =>
  secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");

async function uploadRemoteUrlToCloudinary({
  cloudName,
  apiKey,
  apiSecret,
  remoteUrl,
  publicId,
}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: "experiences/stay",
    public_id: publicId,
    overwrite: "true",
    timestamp: String(timestamp),
  };
  const signature = sign(params, apiSecret);

  const form = new FormData();
  form.append("file", remoteUrl);
  form.append("folder", params.folder);
  form.append("public_id", params.public_id);
  form.append("overwrite", params.overwrite);
  form.append("timestamp", params.timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return optimizeCloudinaryUrl(data.secure_url);
}

async function main() {
  await loadEnvFile(path.join(root, ".env.local"));
  await loadEnvFile(path.join(root, ".env"));

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary env vars. Need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  const raw = await readFile(DATA_PATH, "utf8");
  const groups = JSON.parse(raw);
  const stay = Array.isArray(groups) ? groups.find((g) => g?.slug === "stay") : null;
  if (!stay || !Array.isArray(stay.places)) {
    throw new Error("Could not find stay places in experience_places_by_slug.json");
  }

  let updatedPlaces = 0;
  for (const place of stay.places) {
    const sourceImages = Array.isArray(place.images) && place.images.length > 0
      ? place.images
      : place.image
        ? [place.image]
        : [];

    const deduped = [];
    const seen = new Set();
    for (const url of sourceImages) {
      const key = normalizeForDedupe(url);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(url);
    }

    const limited = deduped.slice(0, 5);
    if (limited.length === 0) continue;

    const uploaded = [];
    for (let i = 0; i < limited.length; i += 1) {
      const sourceUrl = limited[i];
      if (/^https:\/\/res\.cloudinary\.com\//i.test(sourceUrl)) {
        uploaded.push(sourceUrl);
        continue;
      }

      const publicId = `${place.id || "stay-item"}-${String(i + 1).padStart(2, "0")}`;
      try {
        const cloudUrl = await uploadRemoteUrlToCloudinary({
          cloudName,
          apiKey,
          apiSecret,
          remoteUrl: sourceUrl,
          publicId,
        });
        uploaded.push(cloudUrl);
      } catch (err) {
        console.error(`✗ ${place.id} image ${i + 1}: ${err.message}`);
      }
    }

    if (uploaded.length > 0) {
      place.images = uploaded.slice(0, 5);
      place.image = place.images[0];
      updatedPlaces += 1;
      console.log(`✓ ${place.id}: ${place.images.length} Cloudinary image(s)`);
    }
  }

  await writeFile(DATA_PATH, `${JSON.stringify(groups, null, 2)}\n`, "utf8");
  console.log(`Done. Updated ${updatedPlaces} stay place(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
