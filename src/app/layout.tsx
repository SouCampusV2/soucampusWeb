import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Runs before hydration, straight from a <head> <script> — reads the saved
// choice and flips the class synchronously, so there's no flash of the
// light theme while React boots up when a visitor has dark mode saved.
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
      </body>
    </html>
  );
}
