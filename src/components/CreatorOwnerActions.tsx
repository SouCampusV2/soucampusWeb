"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

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
// сервере (/profile, /profile/edit — за редиректом на /login), поэтому
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

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active) setIsOwner(session?.user.id === creatorId);
    })();
    return () => {
      active = false;
    };
  }, [creatorId]);

  if (!isOwner) return null;

  if (variant === "empty") {
    return (
      <div className="mt-6">
        <Button href="/support" size="md">
          Add your first map
        </Button>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Self-serve uploading is coming — for now, send the files through
          support and they&apos;ll be published for you.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
      <Button href="/profile/edit" size="sm" variant="secondary" pageTransition>
        Edit profile
      </Button>
      <Button href="/support" size="sm" variant="secondary">
        Add a map
      </Button>
    </div>
  );
}
