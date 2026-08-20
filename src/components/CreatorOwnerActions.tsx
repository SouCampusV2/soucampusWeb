"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { CREATOR_SIGNUPS_OPEN } from "@/lib/flags";

// Дополнительные кнопки, которые видит ТОЛЬКО сам владелец страницы
// креатора: обычный посетитель их не должен видеть вовсе.
//
// Проверка — на клиенте: /creator/[username] собирается заранее (статика),
// один HTML на всех, и сервер не знает, кто его откроет. Пока ответ не
// пришёл — не рисуем ничего (не заглушку): появление лишней кнопки у
// чужого человека хуже, чем её задержка у владельца.
//
// Сверяем по id профиля — он же id пользователя (profiles.id ссылается на
// auth.users.id один-к-одному). Сравнение по нику было бы хрупким: ник
// можно сменить, а id никогда не меняется.
//
// Это НЕ защита: любой может подделать у себя в браузере что угодно.
// Кнопки ведут на страницы, которые сами проверяют пользователя на
// сервере (/settings, /resources — за редиректом на /login), поэтому
// показ лишней кнопки ничего не открывает.
export function CreatorOwnerActions({
  creatorId,
  variant = "header",
}: {
  /** profiles.id владельца открытой страницы. */
  creatorId: string;
  /** "header" — кнопки в шапке профиля; "empty" — призыв в пустом списке. */
  variant?: "header" | "empty";
}) {
  const [isOwner, setIsOwner] = useState(false);
  // Право загружать. Пока неизвестно — null: рисовать «Add a map» до
  // ответа нельзя, гейт на /creator/upload развернёт человека обратно.
  const [isCreator, setIsCreator] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      const owner = session?.user.id === creatorId;
      setIsOwner(owner);
      if (!owner) return;

      // Свою строку profiles человек читать вправе (RLS «read own
      // profile»), поэтому отдельного роута не нужно.
      const { data } = await supabase
        .from("profiles")
        .select("is_creator")
        .eq("id", creatorId)
        .maybeSingle();
      if (active) setIsCreator(Boolean(data?.is_creator));
    })();
    return () => {
      active = false;
    };
  }, [creatorId]);

  if (!isOwner || isCreator === null) return null;

  // Ещё не креатор — ведём на /resources, где лежит форма заявки
  // (CreatorStatusCard), а не на форму загрузки: туда его не пустят.
  //
  // Пока приём заморожен, «стать автором» не предлагается вовсе — не
  // отключённой кнопкой и не текстом «пока закрыто». О возможности,
  // которой сейчас нет, человек знать не должен: обещание, которое
  // площадка не выполнит сегодня, хуже, чем его отсутствие. Вместо него
  // единственное, что ему тут и нужно, — витрина.
  if (variant === "empty") {
    if (!isCreator && !CREATOR_SIGNUPS_OPEN) {
      return (
        <div className="mt-6">
          <Button href="/marketplace" size="md">
            Browse maps
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <Button href={isCreator ? "/creator/upload" : "/resources"} size="md">
          {isCreator ? "Add your first map" : "Become a creator"}
        </Button>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {isCreator
            ? "Submitted maps are reviewed before they go live on the marketplace."
            : "Apply once — after that you can upload maps to the marketplace."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
      <Button href="/settings" size="sm" variant="secondary" pageTransition>
        Edit profile
      </Button>
      {/* Вторая кнопка есть только у автора. У остального — одна
          «Edit profile»: предлагать «стать автором», когда приём
          закрыт, значит вести на страницу, которая ответит отказом. */}
      {isCreator ? (
        <Button href="/creator/upload" size="sm" variant="secondary">
          Add a map
        </Button>
      ) : (
        CREATOR_SIGNUPS_OPEN && (
          <Button href="/resources" size="sm" variant="secondary">
            Become a creator
          </Button>
        )
      )}
    </div>
  );
}
