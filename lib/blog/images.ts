import { createHash } from "node:crypto";
import OpenAI from "openai";

function normalizeImagePrompt(prompt: string) {
  return [
    "Editorial hero image for a local island news article.",
    "Subject guidance:",
    prompt,
    "Style constraints:",
    "- photorealistic, natural light, realistic skin tones and textures",
    "- documentary/editorial framing, not stock-photo look",
    "- no text, no logos, no watermark, no infographic elements",
    "- high detail, calm color grade, cinematic but realistic",
  ].join("\n");
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

async function uploadBase64ToCloudinary(args: {
  base64Png: string;
  publicId: string;
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signParams = {
    folder: "maioazul/blog",
    public_id: args.publicId,
    timestamp,
  };
  const signature = cloudinarySignature(signParams, apiSecret);

  const form = new FormData();
  form.append("file", `data:image/png;base64,${args.base64Png}`);
  form.append("folder", signParams.folder);
  form.append("public_id", signParams.public_id);
  form.append("timestamp", signParams.timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { secure_url?: string };
  return payload.secure_url ?? null;
}

export async function generateBlogHeroImage(args: {
  title: string;
  summary: string;
  bodyMd: string;
  slugSeed: string;
  promptOverride?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const imagePrompt = normalizeImagePrompt(
    args.promptOverride?.trim()
      ? args.promptOverride.trim()
      : `Article title: ${args.title}\nSummary: ${args.summary}\nArticle excerpt: ${args.bodyMd.slice(0, 900)}`
  );

  const imageResponse = await client.images.generate({
    model: imageModel,
    prompt: imagePrompt,
    size: "1536x1024",
    quality: "high",
  });

  const imageData = imageResponse.data?.[0];
  const b64 = imageData?.b64_json;
  if (!b64) {
    return null;
  }

  const publicId = `${args.slugSeed}-${Date.now()}`;
  const uploadedUrl = await uploadBase64ToCloudinary({
    base64Png: b64,
    publicId,
  });

  if (!uploadedUrl) {
    return null;
  }

  return {
    url: uploadedUrl,
    alt: args.title,
  };
}
