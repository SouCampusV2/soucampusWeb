import type { NextConfig } from "next";

// Хост Supabase Storage — откуда приходят загруженные пользователями
// картинки (обложки и галереи товаров, аватары).
//
// Берём его ИЗ ПЕРЕМЕННОЙ ОКРУЖЕНИЯ, а не вписываем строкой: у проекта
// две базы (preview и прод) с разными поддоменами, и захардкоженный хост
// молча ломал бы картинки на одной из них. Так конфиг всегда следует за
// тем, куда реально смотрит приложение.
//
// Если переменной нет (например, сборка без .env) — просто не добавляем
// правило: пусть падает понятной ошибкой next/image, а не невнятной
// ошибкой разбора URL на этапе конфигурации.
function supabaseImageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const storageHost = supabaseImageHost();

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    // Отдаём современные форматы: AVIF жмёт заметно сильнее WebP, WebP —
    // запасной для браузеров без AVIF. next/image сам выбирает по Accept.
    formats: ["image/avif", "image/webp"],
    remotePatterns: storageHost
      ? [
          {
            protocol: "https",
            hostname: storageHost,
            // Только публичные объекты Storage. Пути приватного бакета
            // (product-files) через оптимизатор картинок ходить не должны
            // вовсе — сужаем разрешение до того, что реально показываем.
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
