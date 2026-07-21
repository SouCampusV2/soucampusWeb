// Structured data (JSON-LD) — машиночитаемое описание сайта/автора в <script>.
// Его читают Google и ИИ-поиск, чтобы понять «что это за сущность»: именно
// отсюда берётся ответ вида «SouCampus — профессиональный Minecraft-строитель»
// с карточкой и ссылкой. Обычному посетителю тег невидим.
//
// dangerouslySetInnerHTML — единственный способ вложить сырой JSON в <script>;
// данные наши собственные (не ввод пользователя), так что это безопасно.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
