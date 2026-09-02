import type { Metadata } from "next";
import { NotFoundContent } from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found",
  // Битый адрес в выдаче не нужен. Статус 404 Next отдаёт и без этого,
  // но краулер, добравшийся сюда по старой ссылке, получает и прямой
  // запрет — дешевле, чем ждать, пока он поверит статусу.
  robots: { index: false, follow: true },
};

// notFound(), вызванный со страницы внутри группы (site): снятая карта,
// несуществующий профиль, битый slug работы. Навбар, тарифы и футер
// приходят от (site)/layout.tsx — здесь только тело.
export default function SiteNotFound() {
  return <NotFoundContent />;
}
