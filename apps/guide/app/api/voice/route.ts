import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const DEFAULT_VOICE_ID = "zGjIP4SZlMnY9m93k97r";
const MODEL_ID = "eleven_multilingual_v2";

const getCachePath = async (key: string) => {
  const dir = path.join(process.cwd(), "public", "voice");
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, `${key}.mp3`);
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.text === "string" ? body.text.trim() : "";
    const text = rawText.length > 600 ? `${rawText.slice(0, 600)}…` : rawText;
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${voiceId}:${MODEL_ID}:${text}`)
      .digest("hex")
      .slice(0, 24);
    const cachePath = await getCachePath(cacheKey);

    try {
      const cached = await fs.readFile(cachePath);
      return new NextResponse(cached, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // cache miss
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: "ElevenLabs request failed",
          status: response.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    await fs.writeFile(cachePath, Buffer.from(audioBuffer));
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Voice API error", error);
    return NextResponse.json({ error: "Voice API error" }, { status: 500 });
  }
}
