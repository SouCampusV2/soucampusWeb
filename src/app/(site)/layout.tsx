import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { PricingSection } from "@/components/PricingSection";
import { ContactFooter } from "@/components/ContactFooter";
import { ViewTracker } from "@/components/ViewTracker";
import { CartProvider } from "@/lib/cart-context";

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
    // CartProvider снаружи: и Navbar (бейдж с числом товаров), и страница
    // товара (кнопка "Add to cart"), и /cart читают одну и ту же корзину.
    // Сама обёртка — клиентский компонент, но children (серверные страницы)
    // это не трогает: их можно передавать в клиентский компонент как есть.
    <CartProvider>
      <PageTransition>
        {/* Ничего не рисует. Стоит здесь, а не на страницах: layout при
            переходах не пересоздаётся, а адрес компонент берёт сам — так
            считается весь сайт и про новую страницу нельзя забыть. */}
        <ViewTracker />
        <Navbar />
        {children}
        <PricingSection />
        <ContactFooter />
      </PageTransition>
    </CartProvider>
  );
}
