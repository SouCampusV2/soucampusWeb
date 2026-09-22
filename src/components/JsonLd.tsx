import { toJsonLdScript } from "@/lib/json-ld";

// Structured data (JSON-LD) — машиночитаемое описание сайта/автора в <script>.
// Его читают Google и ИИ-поиск, чтобы понять «что это за сущность»: именно
// отсюда берётся ответ вида «SouCampus — профессиональный Minecraft-строитель»
// с карточкой и ссылкой. Обычному посетителю тег невидим.
//
// dangerouslySetInnerHTML — единственный способ вложить сырой JSON в <script>.
// ⚠️ Безопасным его делает toJsonLdScript, а не то, что «данные наши»: это
// верно сегодня и перестанет быть верным в день, когда JSON-LD появится на
// странице карты с названием от автора. Разбор — в lib/json-ld.ts.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLdScript(data) }}
    />
  );
}
