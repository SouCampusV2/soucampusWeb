"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "../styles.module.css";

type Work = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  size: string;
  deadline: string;
  price: string;
  image: string;
};

// Лента работ, которую двигает вертикальный скролл (taste-skill,
// «Horizontal-Pan»).
//
// Как устроено: секция высокая, внутри неё липкий блок высотой в экран,
// а в нём дорожка карточек. Пока секция проезжает, дорожка сдвигается
// влево ровно настолько, чтобы последняя карточка встала к правому краю.
// Высота секции = высота экрана + лишняя ширина дорожки: тогда пиксель
// скролла вниз равен пикселю движения вбок, и лента не «скользит».
//
// ⚠️ Только широкие экраны и только без prefers-reduced-motion. На
// телефоне и при просьбе «меньше движения» это обычный ряд с
// горизонтальной прокруткой и прилипанием (CSS, без JS) — поведение
// выключает медиазапрос, а не проверка в коде, поэтому первый кадр
// у всех верный.
//
// Скролл слушается пассивно и сводится к одному кадру через
// requestAnimationFrame; двигается только transform.
export function WorkPan({ projects }: { projects: Work[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const query = window.matchMedia(
      "(min-width: 900px) and (prefers-reduced-motion: no-preference)"
    );
    let frame = 0;
    let extra = 0;

    function measure() {
      if (!section || !track) return;
      if (!query.matches) {
        section.style.height = "";
        track.style.transform = "";
        return;
      }
      extra = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + extra}px`;
      update();
    }

    function update() {
      frame = 0;
      if (!section || !track || !query.matches) return;
      const top = section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, -top / (extra || 1)));
      track.style.transform = `translate3d(${-progress * extra}px,0,0)`;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    query.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      query.removeEventListener("change", measure);
    };
  }, []);

  return (
    <section ref={sectionRef} className={s.pan} aria-labelledby="work-title">
      <div className={s.panSticky}>
        <div className={s.panHead}>
          <h2 id="work-title" className={s.h2}>
            Recent builds
          </h2>
          <Link href="/portfolio" className={s.textLink}>
            The whole portfolio
          </Link>
        </div>
        <div ref={trackRef} className={s.track}>
          {projects.map((p) => (
            <article key={p.slug} className={s.work}>
              <Link href={`/portfolio/${p.slug}`} className={s.workImage}>
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 900px) 56vw, 88vw"
                />
              </Link>
              <div className={s.workBody}>
                <h3 className={s.workTitle}>
                  <Link href={`/portfolio/${p.slug}`}>{p.title}</Link>
                </h3>
                <p className={s.workSummary}>{p.summary}</p>
                <dl className={s.workFacts}>
                  <div>
                    <dt>Type</dt>
                    <dd>{p.tag}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{p.size}</dd>
                  </div>
                  <div>
                    <dt>Built in</dt>
                    <dd>{p.deadline}</dd>
                  </div>
                  <div>
                    <dt>Price</dt>
                    <dd>{p.price}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
