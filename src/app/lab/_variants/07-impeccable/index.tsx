import Image from "next/image";
import Link from "next/link";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  STEPS,
  SOCIALS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { AdvancementToasts, Inventory, Trades } from "./client";
import { labHref, labLink } from "../../_shared/pages";
import { SLUG, pixel } from "./shell";
import s from "./styles.module.css";

// Вариант 7 — impeccable (pbakaus). Ветка design-lab.
//
// Режим — Persuade (лендинг), мир — новый (new-work.md, «Create or
// replace the visual world»). Скилл велит начинать не со вкуса, а с
// культурного дома аудитории: «список визуальных систем, которые
// аудитория знает наизусть». Для игроков и владельцев серверов Minecraft
// первая в этом списке — интерфейс самой игры. Поэтому страница говорит
// на его «родной грамматике» (catalog worlds: «commit to its native
// grammar across navigation, content, controls, and states»):
//
//   hero      → титульный экран: логотип, жёлтый сплэш, каменные кнопки
//   цифры     → всплывающие «Advancement made!»
//   работы    → слоты инвентаря, тултипы с фиолетовой рамкой
//   страны    → список серверов мультиплеера
//   отзывы    → игровой чат
//   шаги      → рецепт крафта, результат — ваша карта
//   тарифы    → торговля с жителем
//
// ⚠️ Ни одного ассета Mojang: фаски, земля, рамки — CSS и SVG-паттерн,
// шрифт — Pixelify Sans (OFL). Узнаётся грамматика, а не картинки.
//
// Launcher impeccable в проект не установлен (см. .claude/skills/README),
// поэтому по его же запасному пути контекст читался из кода напрямую.

// Сила «пинга» у каждой строки: сколько из пяти столбиков горит.
const PING = [5, 5, 4, 5, 3];

export function Impeccable({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 9);
  const backdrop = work[1] ?? work[0];

  return (
    <div className={`${pixel.variable} ${s.root}`}>
      {/* ── Титульный экран ── */}
      <section className={s.title}>
        {backdrop && (
          <Image src={backdrop.image} alt="" fill priority sizes="100vw" className={s.panorama} />
        )}
        <div className={s.titleInner}>
          <div className={s.logoWrap}>
            <h1 className={s.logo}>
              SouCampus
              <span className={s.logoSub}>builds</span>
            </h1>
            <p className={s.splash} aria-hidden="true">Crafts your ideas and dreams!</p>
          </div>
          <p className="sr-only">{HERO.title}</p>
          <nav aria-label="Main" className={s.menu}>
            <Link href={labLink(SLUG, HERO.primary.href)} className={`${s.btn} ${s.btnWide}`}>{HERO.primary.label}</Link>
            <Link href={labLink(SLUG, HERO.secondary.href)} className={`${s.btn} ${s.btnWide}`}>{HERO.secondary.label}</Link>
            <div className={s.menuRow}>
              <Link href="/marketplace" className={s.btn}>Maps for sale</Link>
              <Link href={labHref(SLUG, "about")} className={s.btn}>About</Link>
            </div>
          </nav>
          <p className={s.lede}>{HERO.lede}</p>
        </div>
        <p className={s.version}>SouCampus builds</p>
        <p className={s.copyright}>Not affiliated with Mojang</p>
      </section>

      <main className={s.dirt}>
        {/* ── Достижения ── */}
        <section aria-label="In numbers" className={s.section}>
          <AdvancementToasts
            items={stats.map((stat) => ({ id: stat.id, title: `${stat.value}${stat.suffix}`, text: stat.label }))}
          />
        </section>

        {/* ── Инвентарь ── */}
        <section aria-labelledby="i-work" className={s.section}>
          <Inventory
            headingId="i-work"
            items={work.map((p) => ({
              slug: p.slug,
              title: p.title,
              tag: p.tag,
              image: p.image,
              size: p.size,
              deadline: p.deadline,
              price: p.price,
              summary: noDash(p.summary),
            }))}
          />
        </section>

        {/* ── Список серверов ── */}
        <section aria-labelledby="i-servers" className={s.section}>
          <div className={s.panelDark}>
            <h2 id="i-servers" className={s.panelTitle}>Play Multiplayer</h2>
            <p className={s.panelNote}>Clients from ten countries</p>
            <ul className={s.servers}>
              {COUNTRIES.map((c, i) => (
                <li key={c.id} className={s.server}>
                  <Image src={c.src} alt="" width={40} height={40} className={s.serverIcon} />
                  <span className={s.serverText}>
                    <span className={s.white}>{c.label}</span>
                    <span className={s.gray}>Commissioned a SouCampus build</span>
                  </span>
                  <span className={s.ping} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <i key={bar} style={{ height: `${bar * 3}px` }} data-on={bar <= PING[i % PING.length]} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Чат ── */}
        <section aria-labelledby="i-chat" className={s.section}>
          <h2 id="i-chat" className={s.heading}>What clients said in chat</h2>
          <ol className={s.chat}>
            {reviews.map((r) => (
              <li key={r.slug}>
                <span className={s.chatName}>&lt;{r.name}&gt;</span> {noDash(r.text)}{" "}
                <span className={s.gray}>[{r.role}]</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Рецепт ── */}
        <section aria-labelledby="i-craft" className={s.section}>
          <div className={s.panel}>
            <h2 id="i-craft" className={s.panelTitleDark}>Crafting a map</h2>
            <ol className={s.recipe}>
              {STEPS.map((step, i) => (
                <li key={step.title} className={s.recipeStep}>
                  <span className={s.slotBig} aria-hidden="true">
                    <span className={s.stepGlyph}>{i + 1}</span>
                  </span>
                  <span className={s.recipeName}>{step.title}</span>
                  <span className={s.recipeText}>{step.text}</span>
                </li>
              ))}
              <li className={s.recipeResult} aria-label="Result: your map">
                <span className={s.arrow} aria-hidden="true" />
                <span className={`${s.slotBig} ${s.slotResult}`}>
                  {work[0] && <Image src={work[0].image} alt="" fill sizes="80px" className={s.slotImg} />}
                </span>
                <span className={s.recipeName}>Your map</span>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Торговля ── */}
        <section aria-labelledby="i-trade" className={s.section}>
          <Trades headingId="i-trade" plans={PLANS.map((p) => ({ ...p }))} />
        </section>

        {/* ── Финал ── */}
        <section className={`${s.section} ${s.final}`}>
          <h2 className={s.finalTitle}>Tell me what you want built</h2>
          <div className={s.menuRow}>
            <Link href={labLink(SLUG, HERO.primary.href)} className={`${s.btn} ${s.btnWide}`}>{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnWide}`}>Join Discord server</a>
          </div>
        </section>

        <footer className={s.footer}>
          {SOCIALS.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </footer>
      </main>
    </div>
  );
}
