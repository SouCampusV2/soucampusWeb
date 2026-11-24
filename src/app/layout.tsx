import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Тема до первой отрисовки. Обычный <script> в <head>: браузер выполняет его
// синхронно, ДО того как нарисует страницу, — класс .dark стоит на <html>
// раньше первого кадра.
//
// ⚠️ Не next/script с beforeInteractive (так было с 2026-07-31 по 24.11). В
// App Router он не исполняется на месте: в HTML ложится
// `self.__next_s.push(...)`, а очередь разбирает основной JS Next, который
// грузится асинхронно. Первый кадр успевал нарисоваться светлым, и при
// медленной загрузке страница вспыхивала белым, а потом темнела
// (замечание владельца 24.11, подтверждено по HTML прода).
//
// Цена — предупреждение React «Encountered a script tag while rendering»
// в консоли, когда корень перерисовывается на клиенте (страница ошибки).
// Только в разработке, посетитель его не видит; ради него в июле скрипт и
// перенесли в next/script. Правильная тема с первого кадра важнее.
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Все относительные ссылки в метаданных (og:image, canonical) достраиваются
  // от этого адреса до абсолютных — без него Next их просто не построит.
  metadataBase: new URL(SITE_URL),

  // Шаблон: у страниц можно задавать короткий title (например "Portfolio"),
  // а к нему автоматически добавится " — SouCampus builds". default — для
  // главной и всего, что свой title не задаёт.
  title: {
    default: `${SITE_NAME} — Minecraft builds on order`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Custom Minecraft builds on order: castles, spawns, cities and entire worlds, crafted from scratch by SouCampus.",

  // Дефолтные Open Graph / Twitter — то, что подтягивают Discord, Telegram, X
  // при вставке ссылки. Картинку сюда явно не пишем: файлы opengraph-image.tsx
  // (см. A2) Next подхватывает и подставляет в og:image сам, в т.ч. на каждой
  // странице работы свою.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: `${SITE_NAME} — Minecraft builds on order`,
    description: SITE_TAGLINE,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Minecraft builds on order`,
    description: SITE_TAGLINE,
  },

  alternates: { canonical: "/" },

  // Search Console, ресурс https://soucampus.online/ — ЗАПАСНОЙ способ
  // подтверждения; основной — файл public/google2167305e79148318.html.
  // Два способа сразу потому, что 24.09 выяснилось: подтверждение через
  // DNS-запись (21.07) пропало — TXT затёрли при настройке почты, и Google
  // перестал считать сайт подтверждённым. Не удалять ни то, ни другое:
  // Google перепроверяет подтверждение и снимает его, не найдя.
  verification: { google: "rtWUjyHjaTO9CtShg8jsHFEMiJpZreBJGIOJG2AZhcU" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Навбар/тарифы/футер — не здесь, а в src/app/(site)/layout.tsx:
            корневой layout оборачивает вообще всё, включая будущую админку. */}
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        {/* Web Vitals живых посетителей (LCP, CLS, INP) — то, что PageSpeed
            меряет одним заходом из лаборатории, здесь копится по реальным
            телефонам. Скрипт тот же, что у Analytics: на проде с нашего
            домена (/_vercel/…), вне прода — с va.vercel-scripts.com, оба
            уже разрешены в CSP. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
