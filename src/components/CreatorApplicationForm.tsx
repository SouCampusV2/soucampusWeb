"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Заявка на статус креатора.
//
// Пишется НАПРЯМУЮ из браузера, а не через route handler, — и это тот
// редкий случай, когда так правильно. Человек создаёт свою собственную
// строку, и политика "submit own application" уже ограничивает и автора
// (user_id = auth.uid()), и статус (только pending). Служебный ключ здесь
// не нужен: ему нечего обходить.
//
// Сравни с публикацией карты: там нужен route handler, потому что ставить
// is_published не разрешено ни одной политикой и не должно быть.
const MAX_ABOUT = 2000;

export function CreatorApplicationForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [about, setAbout] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [discord, setDiscord] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (about.trim().length === 0) return;

    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const { error: insertError } = await supabase
      .from("creator_applications")
      .insert({
        user_id: userId,
        about: about.trim().slice(0, MAX_ABOUT),
        portfolio_url: portfolio.trim() || null,
        discord: discord.trim() || null,
      });

    setPending(false);

    if (insertError) {
      // Частичный уникальный индекс не даёт завести вторую ОТКРЫТУЮ
      // заявку. Это не поломка, а именно то поведение, которое нужно, —
      // объясняем человеку по-человечески вместо кода ошибки.
      setError(
        insertError.code === "23505"
          ? "You already have an application waiting. We'll get back to you on it."
          : "Could not send the application. Try again in a moment."
      );
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="about"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Tell us about your building
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          What you build, how long you&apos;ve been at it, anything you&apos;d
          want a client to know.
        </p>
        <textarea
          id="about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={5}
          required
          maxLength={MAX_ABOUT}
          className="w-full rounded-2xl border border-zinc-950/[0.08] px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        />
      </div>

      <TextField
        id="portfolio"
        label="Portfolio link"
        hint="PlanetMinecraft, YouTube, ArtStation — wherever your work lives."
        value={portfolio}
        onChange={setPortfolio}
      />
      <TextField
        id="discord"
        label="Discord"
        hint="So we can reach you about the application."
        value={discord}
        onChange={setDiscord}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" size="md" disabled={pending || !about.trim()}>
        {pending ? "Sending…" : "Send application"}
      </Button>
    </form>
  );
}
