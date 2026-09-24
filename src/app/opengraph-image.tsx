import { ImageResponse } from "next/og";
import { encodePng } from "@/lib/png";
import { clouds, paintClouds, terrain } from "@/lib/world-gen";

// Дефолтная картинка-превью сайта (og:image). Next подхватывает файл с этим
// именем автоматически и подставляет его в метаданные ВСЕХ страниц, у которых
// нет своей картинки. Страницы работ переопределяют её своим фото (см.
// generateMetadata в portfolio/[slug]).
//
// Рисуется через next/og: мы описываем картинку как JSX, а Next на сервере
// превращает это в настоящий PNG 1200×630 (стандартный размер OG-превью).
// Собирается один раз при сборке — страница статическая.
//
// С 24.09 превью повторяет первый экран главной: пиксельная карта мира от
// ТОГО ЖЕ генератора (world-gen.ts) и панель с заголовком слева.
// ⚠️ Зерно фиксированное, а не случайное, как на сайте: иначе превью
// менялось бы с каждой сборкой, а мессенджеры его кэшируют — у разных
// людей висели бы разные картинки. 108 выбрано из восьми кандидатов:
// тёплый океан, джунгли, бэдлендс и острова справа, где нет панели.
// ⚠️ Стекла, как на сайте, нет: next/og (satori) не умеет backdrop-filter,
// поэтому панель почти непрозрачная.

export const alt = "SouCampus builds — custom Minecraft builds on order";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SEED = 108;
const CELL = 10; // пикселей превью на блок: 120×63 блока
const COLS = size.width / CELL;
const ROWS = Math.ceil(size.height / CELL);

/** Карта мира с облаками — PNG 1200×630 как data-URL. */
function worldPng() {
  const land = terrain(SEED, COLS, ROWS);
  const sky = clouds(SEED, COLS, ROWS);
  paintClouds(sky.img, sky.appearAt, sky.done + 1); // облака целиком выросли
  const out = new Uint8Array(size.width * size.height * 4);
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const cell = (Math.floor(y / CELL) * COLS + Math.floor(x / CELL)) * 4;
      // Облака поверх земли с той же прозрачностью, что на сайте (0.55).
      const a = (sky.img[cell + 3] / 255) * 0.55;
      const o = (y * size.width + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = land[cell + c] * (1 - a) + 255 * a;
      out[o + 3] = 255;
    }
  }
  return `data:image/png;base64,${encodePng(out, size.width, size.height).toString("base64")}`;
}

const TITLE = ["SouCampus crafts", "your ideas and", "dreams"];
const SUBTITLE = "Custom Minecraft maps and worlds on order";
const DOMAIN = "soucampus.online";

/**
 * Шрифт из Google Fonts, только под нужные буквы (параметр text). Приём
 * из документации Next для next/og. Не загрузился — превью всё равно
 * соберётся встроенным шрифтом, а не уронит сборку.
 */
async function googleFont(family: string, weight: number, text: string) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [display, body] = await Promise.all([
    googleFont("Unbounded", 800, TITLE.join("")),
    googleFont("Plus+Jakarta+Sans", 500, SUBTITLE + DOMAIN),
  ]);
  const fonts = [
    ...(display ? [{ name: "Unbounded", data: display, weight: 800 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "Jakarta", data: body, weight: 500 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og рисует обычный <img>, next/image здесь не работает */}
        <img src={worldPng()} width={size.width} height={size.height} alt="" style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 90,
            display: "flex",
            flexDirection: "column",
            padding: "44px 48px",
            borderRadius: 36,
            backgroundColor: "rgba(251,251,255,0.92)",
            border: "1px solid rgba(9,9,11,0.06)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Unbounded", fontWeight: 800, fontSize: 58, lineHeight: 1.15, color: "#09090b" }}>
            <span>{TITLE[0]}</span>
            <span style={{ display: "flex" }}>
              your&nbsp;<span style={{ color: "#84cc16" }}>ideas</span>&nbsp;and
            </span>
            <span style={{ color: "#3b82f6" }}>{TITLE[2]}</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontFamily: "Jakarta", fontSize: 28, color: "#52525b" }}>
            {SUBTITLE}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontFamily: "Jakarta", fontSize: 26, color: "#f97316" }}>
            {DOMAIN}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
