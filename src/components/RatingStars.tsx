"use client";

import { useState } from "react";
import { Star, StarHalf } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Интерактивные звёзды выставления оценки (в «My purchases»). Клик —
// upsert в product_ratings (одна оценка на пару товар+пользователь). RLS
// на стороне БД разрешает вставку только тому, кто купил товар: если
// каким-то образом попробовать оценить некупленное, база отклонит, и мы
// откатим оптимистичное изменение.
//
// Шаг — половина звезды (миграция 20260811130000). Каждая звезда это две
// кнопки-половинки, а не одна: определять «попал в левую или правую
// часть» по координате курсора значило бы, что с клавиатуры и с тача
// половинку не поставить вовсе. Две настоящие кнопки обходятся табом,
// нажимаются пальцем и сами себя объявляют скринридеру.
const STEPS = [1, 2, 3, 4, 5];

export function RatingStars({
  productId,
  initialStars,
}: {
  productId: string;
  initialStars: number;
}) {
  const [stars, setStars] = useState(initialStars);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  async function rate(value: number) {
    if (saving || value === stars) return;
    const prev = stars;
    setStars(value); // оптимистично
    setSaving(true);

    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStars(prev);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("product_ratings").upsert(
      {
        product_id: productId,
        user_id: user.id,
        stars: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,user_id" },
    );

    if (error) setStars(prev); // откат, если БД отклонила
    setSaving(false);
  }

  const shown = hover || stars;

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label="Rate this map"
    >
      {STEPS.map((value) => (
        <span
          key={value}
          className="relative inline-flex p-0.5"
          onMouseLeave={() => setHover(0)}
        >
          <StarIcon value={value} shown={shown} />

          {/* Две прозрачные половинки поверх картинки. Сама звезда
              нарисована один раз под ними — иначе пришлось бы резать
              иконку пополам и следить, чтобы половины сходились. */}
          {[value - 0.5, value].map((step) => (
            <button
              key={step}
              type="button"
              disabled={saving}
              onMouseEnter={() => setHover(step)}
              onFocus={() => setHover(step)}
              onBlur={() => setHover(0)}
              onClick={() => rate(step)}
              aria-label={`${step} star${step === 1 ? "" : "s"}`}
              className={`absolute inset-y-0 w-1/2 cursor-pointer disabled:cursor-not-allowed ${
                step === value ? "right-0" : "left-0"
              }`}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

/** Целая, половина или пустая — смотря куда дотянулась текущая оценка. */
function StarIcon({ value, shown }: { value: number; shown: number }) {
  const filled = value <= shown;
  const half = !filled && value - 0.5 <= shown;

  if (half) {
    return (
      <StarHalf
        size={18}
        weight="fill"
        className="text-orange-400"
        aria-hidden
      />
    );
  }
  return (
    <Star
      size={18}
      weight={filled ? "fill" : "regular"}
      className={filled ? "text-orange-400" : "text-zinc-300 dark:text-zinc-600"}
      aria-hidden
    />
  );
}
