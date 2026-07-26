"use client";

import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Интерактивные звёзды выставления оценки (в «My purchases»). Клик —
// upsert в product_ratings (одна оценка на пару товар+пользователь). RLS
// на стороне БД разрешает вставку только тому, кто купил товар: если
// каким-то образом попробовать оценить некупленное, база отклонит, и мы
// откатим оптимистичное изменение.
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
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={saving}
          onMouseEnter={() => setHover(value)}
          onMouseLeave={() => setHover(0)}
          onClick={() => rate(value)}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          className="cursor-pointer p-0.5 disabled:cursor-not-allowed"
        >
          <Star
            size={18}
            weight={value <= shown ? "fill" : "regular"}
            className={
              value <= shown
                ? "text-orange-400"
                : "text-zinc-300 dark:text-zinc-600"
            }
          />
        </button>
      ))}
    </div>
  );
}
