import Image from "next/image";
import { DISCORD_INVITE, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, SKILLS, STUDIOS, TIMELINE, labHref } from "../../_shared/pages";
import { Book, MapInfoForm, WorldList } from "./screens";
import { SLUG, Screen } from "./shell";
import s from "./styles.module.css";

// Внутренние экраны варианта Inventory (impeccable). Скилл требует
// «commit to its native grammar across navigation, content, controls, and
// states» — поэтому страницы сайта здесь не страницы, а экраны игры, которые
// аудитория знает наизусть:
//
//   Portfolio → «Select World»: список миров с поиском и кнопками под ним
//   Contact   → «Multiplayer»: наш Discord — сервер в списке, калькулятор —
//               форма «Edit Server Info», FAQ — книга с перелистыванием
//   About     → «Advancements»: путь от шести лет до сегодня цепочкой рамок,
//               цифры — экран статистики, инструменты — хотбар
//
// ⚠️ По-прежнему ни одного ассета Mojang: всё — CSS и пиксельный шрифт.

// Сила пинга у «сервера» Discord — полная: отвечаем каждый день.
const FULL_PING = 5;

// ── Portfolio ───────────────────────────────────────────────────────────

export function InventoryPortfolio({ data }: { data: LabData }) {
  return (
    <Screen page="portfolio" title="Select World">
      <WorldList
        orderHref={labHref(SLUG, "contact")}
        worlds={data.projects.map((p) => ({
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
    </Screen>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function InventoryContact() {
  return (
    <Screen page="contact" title="Play Multiplayer">
      <section aria-labelledby="i-server" className={s.section}>
        <h2 id="i-server" className={s.srOnly}>{CONTACT.titleStart} {CONTACT.titleAccent}</h2>
        <div className={s.panelDark}>
          <ul className={s.servers}>
            <li className={`${s.server} ${s.serverSelected}`}>
              <span className={s.serverIconBlock} aria-hidden="true" />
              <span className={s.serverText}>
                <span className={s.white}>SouCampus Discord</span>
                <span className={s.gray}>{CONTACT.lede}</span>
              </span>
              <span className={s.ping} aria-label="Online, replies every day">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <i key={bar} style={{ height: `${bar * 3}px` }} data-on={bar <= FULL_PING} />
                ))}
              </span>
            </li>
          </ul>
          <div className={s.menuRow}>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnWide}`}>Join Server</a>
            <a href="#i-faq" className={`${s.btn} ${s.btnWide}`}>{CONTACT.answersTitle}</a>
          </div>
          <p className={s.panelNote}>{CONTACT.chatText}</p>
        </div>
      </section>

      <section aria-labelledby="i-faq" className={`${s.section} ${s.mpGrid}`}>
        <MapInfoForm />
        <div>
          <h2 id="i-faq" className={s.heading}>{CONTACT.faqTitle}</h2>
          <Book label={CONTACT.faqTitle} pages={FAQ.map((f) => ({ title: f.question, body: f.answer }))} />
        </div>
      </section>
    </Screen>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function InventoryAbout({ data }: { data: LabData }) {
  const cover = data.projects.find((p) => p.isFeatured) ?? data.projects[0];

  return (
    <Screen page="about" title="Advancements">
      <section aria-labelledby="i-intro" className={s.section}>
        <div className={s.twoCol}>
          <div className={s.panelDark}>
            <h2 id="i-intro" className={s.itemTitle}>{ABOUT.title}</h2>
            <p className={s.itemText}>
              <span className={s.white}>{ABOUT.leadStrong}</span> {ABOUT.lead}
            </p>
          </div>
          <div className={s.panelDark}>
            <h2 className={s.panelTitle}>Statistics</h2>
            <table className={s.statsTable}>
              <tbody>
                {ABOUT.facts.map((fact) => (
                  <tr key={fact.label}>
                    <th scope="row">{fact.label}</th>
                    <td>{fact.value}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Studios joined</th>
                  <td>{STUDIOS.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Путь — цепочка достижений. Последнее, «сегодня», — фиолетовое:
          в игре так выглядят испытания, самое трудное в дереве. */}
      <section aria-labelledby="i-path" className={s.section}>
        <h2 id="i-path" className={s.heading}>{ABOUT.eyebrow}</h2>
        <ol className={s.advTree}>
          {TIMELINE.map((item) => (
            <li key={item.age} className={s.adv}>
              <span className={s.advFrame}>{item.age.replace("Age ", "")}</span>
              <div className={s.advCard}>
                <span className={s.yellow}>{item.age}: advancement made!</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Инструменты — хотбар: девять слотов, у каждого тултип с именем.
          Слотов девять, инструментов семь — два пустых, как в игре. */}
      <section aria-labelledby="i-tools" className={s.section}>
        <h2 id="i-tools" className={s.heading}>{ABOUT.skillsTitle}</h2>
        <p className={s.itemText}>{ABOUT.skillsLede}</p>
        <ul className={s.hotbar} aria-label="Tools" style={{ marginTop: 20 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const tool = SKILLS.tools[i];
            return (
              <li key={i} className={s.hotSlot} tabIndex={tool ? 0 : -1} aria-label={tool}>
                {tool && (
                  <>
                    <span aria-hidden="true">{tool.slice(0, 2)}</span>
                    <span className={s.tooltip} role="presentation">
                      <span className={s.white}>{tool}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {/* Имена под хотбаром — для тач-экрана: наведения там нет, и без
            этой строки от инструментов остались бы две буквы. */}
        <p className={s.gray} style={{ marginTop: 8, fontSize: 15 }} aria-hidden="true">
          {SKILLS.tools.join(" · ")}
        </p>
        <ul className={s.chips} style={{ marginTop: 20 }} aria-label="Craft">
          {SKILLS.craft.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Notes" className={`${s.section} ${s.twoCol}`}>
        <div className={s.panelDark}>
          {ABOUT.closing.map((text) => (
            <p key={text.slice(0, 16)} className={s.itemText}>{text}</p>
          ))}
        </div>
        {cover && (
          <div className={s.panelDark}>
            <div className={s.itemPreview}>
              <Image src={cover.image} alt={cover.title} fill sizes="(min-width: 900px) 35vw, 90vw" className={s.cover} />
            </div>
            <p className={s.gray}>{cover.title}</p>
          </div>
        )}
      </section>
    </Screen>
  );
}
