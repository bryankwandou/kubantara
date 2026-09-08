import { ImageResponse } from "next/og";

// Kartu yang muncul saat tautan Kubantara dibagikan di WhatsApp/X/Slack.
// Dibuat di server supaya tak perlu menyimpan gambar besar di repo.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kubantara — dunia kubus terbuka untuk anak";

export default function Gambar() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "linear-gradient(160deg, #bae6fd 0%, #7dd3fc 55%, #4ade80 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 130, letterSpacing: -4, fontWeight: 800, color: "#0f172a" }}>
          Kubantara
        </div>
        <div style={{ fontSize: 44, color: "#134e4a", textAlign: "center", maxWidth: 900 }}>
          Dunia kubus terbuka untuk anak
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
          {["Tanpa musuh", "Tanpa iklan", "Tanpa pemasangan"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 30,
                color: "#0f172a",
                background: "rgba(255,255,255,0.8)",
                padding: "14px 28px",
                borderRadius: 999,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
