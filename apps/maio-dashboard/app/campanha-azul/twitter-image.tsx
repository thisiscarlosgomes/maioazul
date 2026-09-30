import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Maio Campanha Azul";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#10069f",
          color: "#ffffff",
          padding: "56px 64px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 2, textTransform: "uppercase", opacity: 0.9 }}>
          Campanha Azul 2026
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1 }}>Maio Campanha Azul</div>
          <div style={{ fontSize: 38, lineHeight: 1.15, maxWidth: 980 }}>
            Proteção costeira, mobilização comunitária e economia local com impacto.
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.85 }}>maioazul.com</div>
      </div>
    ),
    size
  );
}
