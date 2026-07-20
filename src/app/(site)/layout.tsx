import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { PricingSection } from "@/components/PricingSection";
import { ContactFooter } from "@/components/ContactFooter";

// Обвязка публичного сайта: навбар сверху, тарифы + футер снизу на каждой
// странице. Живёт здесь, а не в корневом layout.tsx, именно ради группы
// (site) — будущая админка (Этап 3) ляжет рядом, вне этой группы, и не
// унаследует ни навигацию для посетителей, ни блок с тарифами, ни футер.
// Корневой layout остаётся тем, что нужно вообще всем: <html>/<body>,
// шрифт, тема, аналитика.
// Страницы собираются заранее (статика) — это быстро, но означает, что
// правка в Table Editor сама по себе на сайте не появится: HTML уже
// сгенерирован. revalidate говорит "считай готовый HTML свежим 60 секунд,
// потом при следующем заходе пересобери его в фоне с новыми данными".
// Компромисс: посетитель всегда получает мгновенную статику, а изменения
// в базе доезжают за минуту без ручного передеплоя.
// Действует на все страницы внутри (site).
export const revalidate = 60;

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PageTransition>
      <Navbar />
      {children}
      <PricingSection />
      <ContactFooter />
    </PageTransition>
  );
}
