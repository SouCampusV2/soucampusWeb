import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Дефолтная картинка-превью сайта (og:image). Next подхватывает файл с этим
// именем автоматически и подставляет его в метаданные ВСЕХ страниц, у которых
// нет своей картинки. Страницы работ переопределяют её своим фото (см.
// generateMetadata в portfolio/[slug]).
//
// Рисуется через next/og: мы описываем картинку как JSX, а Next на сервере
// превращает это в настоящий PNG 1200×630 (стандартный размер OG-превью).

export const alt = "SouCampus builds — custom Minecraft builds on order";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#09090b",
          // Мягкое оранжевое свечение сверху — как радиальный градиент в Hero.
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(249,115,22,0.35), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", color: "#f97316", fontSize: 30, letterSpacing: 2 }}>
          MINECRAFT BUILDS ON ORDER
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            color: "#fafafa",
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 28, color: "#a1a1aa", fontSize: 34 }}>
          Castles, spawns, cities and entire worlds — crafted from scratch.
        </div>
        <div style={{ display: "flex", marginTop: 56, color: "#71717a", fontSize: 26 }}>
          soucampus.online
        </div>
      </div>
    ),
    { ...size }
  );
}
