import type { ShowcasePost } from "@/lib/discord-showcase";

// Превью поста «как в Discord» для /admin/discord.
//
// ⚠️ Осознанное отступление от DESIGN.md: здесь цвета и шрифты Discord
// (тёмная тема #313338, синие ссылки), а не палитра сайта — превью должно
// выглядеть как результат, а не как сайт. Поэтому без dark:-вариантов:
// Discord у большинства тёмный, и превью тёмное всегда.
//
// Рисует то же, что уходит в вебхук (toWebhookPayload): заголовок-ссылку,
// строку автора, текст, поля (inline — по три в ряд), картинку, кнопки.
// Markdown Discord не рендерится — показывается как есть, переносы строк
// сохраняются.

export default function DiscordPreview({ post, botName = "SouCampus Showcase" }: { post: ShowcasePost; botName?: string }) {
  const inline = post.fields.filter((f) => f.inline);
  const block = post.fields.filter((f) => !f.inline);
  return (
    <div className="rounded-lg bg-[#313338] p-4 font-[system-ui] text-[15px] leading-snug text-[#dbdee1]">
      <div className="flex gap-3">
        <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-[#5865f2]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-white">{botName}</span>
            <span className="rounded bg-[#5865f2] px-1 text-[10px] font-semibold uppercase text-white">App</span>
            <span className="text-xs text-[#949ba4]">Today</span>
          </div>
          {post.mention !== "none" && <div className="mt-0.5 text-[#c9cdfb]">@{post.mention}</div>}

          <div
            className="mt-1 max-w-[520px] rounded border-l-4 bg-[#2b2d31] p-3"
            style={{ borderLeftColor: /^#[0-9a-fA-F]{6}$/.test(post.color) ? post.color : "#1e1f22" }}
          >
            {post.authorName && <div className="text-sm font-semibold text-white">{post.authorName}</div>}
            {post.title &&
              (post.url ? (
                <a href={post.url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-[#00a8fc] hover:underline">
                  {post.title}
                </a>
              ) : (
                <div className="mt-1 font-semibold text-white">{post.title}</div>
              ))}
            {post.body && <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>}
            {inline.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {inline.map((f, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold text-white">{f.name}</div>
                    <div className="text-sm">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
            {block.map((f, i) => (
              <div key={i} className="mt-2">
                <div className="text-sm font-semibold text-white">{f.name}</div>
                <div className="whitespace-pre-wrap text-sm">{f.value}</div>
              </div>
            ))}
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- превью внешней картинки как есть, без оптимизатора
              <img src={post.imageUrl} alt="" className="mt-3 max-h-[300px] w-full rounded object-cover" />
            )}
          </div>

          {post.buttons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.buttons.map((b, i) => (
                <a
                  key={i}
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[#4e5058] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#6d6f78]"
                >
                  {b.label} <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
