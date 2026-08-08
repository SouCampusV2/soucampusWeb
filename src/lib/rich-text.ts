// Оформление «богатого» текста описания товара — ОДНА константа на два
// места: редактор креатора (UploadMapForm) и страница товара
// (/shop/[slug]). Разъехавшись, они дали бы худший из возможных багов
// такой формы: креатор вёрстает, видя одно, а покупатель получает другое.
//
// Отдельным файлом, а не экспортом из UploadMapForm, ровно по одной
// причине: UploadMapForm — клиентский компонент ("use client"), и импорт
// из него в серверную страницу товара утянул бы в её бандл весь редактор
// (Tiptap + ProseMirror) ради одной строки классов.
//
// Набор тегов здесь и белый список в sanitize.ts — про одно и то же
// множество: всё, что умеет вставить наш редактор.
export const RICH_TEXT_CLASS =
  "max-w-none " +
  "[&_a]:text-orange-600 [&_a]:underline dark:[&_a]:text-orange-400 " +
  "[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-950 dark:[&_h2]:text-zinc-50 " +
  "[&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-zinc-950 dark:[&_h3]:text-zinc-50 " +
  "[&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-orange-500 [&_blockquote]:pl-4 [&_blockquote]:italic " +
  "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl " +
  // Таблица шире колонки не должна ломать страницу — прокрутка внутри
  // своего блока, а не горизонтальный скролл всего документа.
  "[&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse " +
  "[&_td]:border [&_td]:border-zinc-950/[0.12] [&_td]:px-3 [&_td]:py-1.5 dark:[&_td]:border-zinc-50/[0.12] " +
  "[&_th]:border [&_th]:border-zinc-950/[0.12] [&_th]:bg-zinc-950/[0.04] [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold " +
  "dark:[&_th]:border-zinc-50/[0.12] dark:[&_th]:bg-zinc-50/[0.06]";
