import type { ReactNode } from "react";
import { hexColor, knownRoleName, postText, type ShowcasePost } from "@/lib/discord-showcase";

// Превью поста «как в Discord» для /admin/discord — стиль «сообщение»
// (заголовок, текст, список ссылок, большие картинки, реакции).
//
// ⚠️ Осознанное отступление от DESIGN.md: здесь цвета и шрифты Discord
// (тёмная тема #313338, синие ссылки), а не палитра сайта — превью должно
// выглядеть как результат, а не как сайт. Поэтому без dark:-вариантов.
//
// Рисует тот же текст, что уходит в вебхук (postText), маленьким
// безопасным разбором markdown: только React-элементы, без
// dangerouslySetInnerHTML. Поддержано то, что реально бывает в постах:
// # / ## / ### / -# строки, «- » списки, **жирный**, *курсив*, [текст](url),
// эмодзи сервера <:name:id>, пинги ролей и @here/@everyone, ссылки на
// канал <#id> (27.10: имя канала превью не знает — «#channel»).

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|<a?:\w+:\d+>|<@&\d+>|<#\d+>|@here|@everyone)/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={k} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={k}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={k} href={link[2]} target="_blank" rel="noreferrer" className="text-[#00a8fc] hover:underline">
          {link[1]}
        </a>
      );
    }
    const emoji = part.match(/^<(a?):(\w+):(\d+)>$/);
    if (emoji) {
      // eslint-disable-next-line @next/next/no-img-element -- эмодзи Discord, как есть
      return <img key={k} src={`https://cdn.discordapp.com/emojis/${emoji[3]}.${emoji[1] ? "gif" : "webp"}?size=48`} alt={`:${emoji[2]}:`} className="inline h-[1.375em] w-[1.375em] align-[-0.3em]" />;
    }
    if (/^<#\d+>$/.test(part)) {
      return (
        <span key={k} className="rounded bg-[#5865f2]/30 px-0.5 font-medium text-[#c9cdfb]">
          #channel
        </span>
      );
    }
    if (/^<@&\d+>$/.test(part) || part === "@here" || part === "@everyone") {
      return (
        <span key={k} className="rounded bg-[#5865f2]/30 px-0.5 font-medium text-[#c9cdfb]">
          {/* Discord покажет имя роли сам; превью знает только свою
              (дописано на сайте 26.10), остальные — «@role». */}
          {part.startsWith("<") ? `@${knownRoleName(part.slice(3, -1)) ?? "role"}` : part}
        </span>
      );
    }
    return part;
  });
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={`ul-${out.length}`} className="ml-5 list-disc">{bullets}</ul>);
    bullets = [];
  };
  lines.forEach((line, i) => {
    const k = `l${i}`;
    if (line.startsWith("- ")) return bullets.push(<li key={k}>{inline(line.slice(2), k)}</li>);
    flush();
    if (line.startsWith("### ")) out.push(<div key={k} className="text-base font-bold text-white">{inline(line.slice(4), k)}</div>);
    else if (line.startsWith("## ")) out.push(<div key={k} className="text-xl font-bold text-white">{inline(line.slice(3), k)}</div>);
    else if (line.startsWith("# ")) out.push(<div key={k} className="text-2xl font-bold text-white">{inline(line.slice(2), k)}</div>);
    else if (line.startsWith("-# ")) out.push(<div key={k} className="text-xs text-[#949ba4]">{inline(line.slice(3), k)}</div>);
    else if (line.trim()) out.push(<div key={k}>{inline(line, k)}</div>);
    else out.push(<div key={k} className="h-3" />);
  });
  flush();
  return <>{out}</>;
}

export default function DiscordPreview({
  post,
  webhookName = "SouCampus Showcase",
  reactions = [],
  accentColor,
}: {
  post: ShowcasePost;
  webhookName?: string;
  /** Цвет плашки контейнера (канал); нет — блоки без рамки. */
  accentColor?: number;
  /** Реакции, которые поставит бот (/setup showcase_reactions) — только для вида. */
  reactions?: string[];
}) {
  const { main, links } = postText(post);
  const images = post.imageUrls.slice(0, 4);
  return (
    <div className="rounded-lg bg-[#313338] p-4 font-[system-ui] text-[15px] leading-snug text-[#dbdee1]">
      <div className="flex gap-3">
        {post.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- аватар по ссылке, как в Discord
          <img src={post.avatarUrl} alt="" className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-[#5865f2]" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-white">{post.username || webhookName}</span>
            <span className="rounded bg-[#5865f2] px-1 text-[10px] font-semibold uppercase text-white">App</span>
            <span className="text-xs text-[#949ba4]">Today</span>
          </div>
          <div
            // Контейнер Components V2: тёмная подложка и цветная полоса
            // слева. Цвет — данные канала, поэтому style, а не класс.
            className={accentColor === undefined ? "space-y-1" : "max-w-[600px] space-y-1 rounded-lg border-l-4 bg-[#2b2d31] p-3"}
            style={accentColor === undefined ? undefined : { borderLeftColor: hexColor(accentColor) }}
          >
          <Markdown text={main} />
          {links && (
            <div className="pt-2">
              <Markdown text={links} />
            </div>
          )}
          {images.length > 0 && (
            <div className={`mt-2 grid max-w-[550px] gap-1 ${images.length > 1 ? "grid-cols-2" : ""}`}>
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- внешняя картинка как есть
                <img key={i} src={src} alt="" className="max-h-[340px] w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
          {post.buttons.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {post.buttons.map((b, i) => (
                <a key={i} href={b.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-[#4e5058] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#6d6f78]">
                  {b.label} <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          )}
          </div>
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {reactions.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-[#5865f2] bg-[#5865f2]/15 px-2 py-0.5 text-sm">
                  {inline(r, `r${i}`)} <span className="text-xs font-semibold text-[#c9cdfb]">1</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
