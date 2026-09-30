import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Maio Campanha Azul";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div
          style={{
            fontSize: 28,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          Maioazul
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1 }}>Campanha Azul</div>
          <div style={{ fontSize: 40, lineHeight: 1.15, maxWidth: 980 }}>
            Uma agenda de ação coletiva por um Maio mais azul, dinâmico e sustentável.
          </div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.85 }}>maioazul.com/campanha-azul</div>
      </div>
    ),
    size
  );
}
