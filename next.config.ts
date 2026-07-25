import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    // Отдаём современные форматы: AVIF жмёт заметно сильнее WebP, WebP —
    // запасной для браузеров без AVIF. next/image сам выбирает по Accept.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
