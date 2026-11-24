"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GearSix, PencilSimple } from "@phosphor-icons/react";
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
//
// Компонентов два, а не один (2026-10-25): «Edit profile» стал иконкой
// рядом с именем, а «Add a map» остался кнопкой под шапкой — то есть они
// стоят в разных местах разметки. Кто владелец, оба узнают одним хуком.
function useOwner(creatorId: string, needCreatorFlag: boolean) {
  const [isOwner, setIsOwner] = useState(false);
  // Право загружать. Пока неизвестно — null: рисовать «Add a map» до
  // ответа нельзя, гейт на /resources/new развернёт человека обратно.
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
      if (!owner || !needCreatorFlag) return;

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
  }, [creatorId, needCreatorFlag]);

  return { isOwner, isCreator };
}

/**
 * Карандаш рядом с именем — дверь в /settings. Иконкой, а не кнопкой
 * (просьба владельца 25.10): так у BuiltByBit, и действие «поправить
 * своё» не спорит с главными кнопками профиля за внимание.
 */
export function OwnerEditLink({ creatorId }: { creatorId: string }) {
  const { isOwner } = useOwner(creatorId, false);
  if (!isOwner) return null;

  return (
    // Без pageTransition: профиль — магазинная страница, а внутри
    // магазина волны нет. Зона нажатия 40px — палец, а не курсор.
    <Link
      href="/settings"
      aria-label="Edit profile"
      title="Edit profile"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
    >
      <PencilSimple size={22} weight="bold" aria-hidden />
    </Link>
  );
}

export function CreatorOwnerActions({
  creatorId,
}: {
  /** profiles.id владельца открытой страницы. */
  creatorId: string;
}) {
  const { isOwner, isCreator } = useOwner(creatorId, true);

  if (!isOwner || isCreator === null) return null;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
      {/* Настройки — кнопкой рядом с остальными действиями владельца, а не
          карандашом у ника (24.11, просьба владельца). Есть всегда: свой
          профиль правит и тот, кто не автор. */}
      <Button href="/settings" size="sm" variant="secondary">
        <GearSix size={18} weight="bold" aria-hidden /> Settings
      </Button>
      {/* Кнопка есть только у автора. Предлагать «стать автором», когда
          приём закрыт, значит вести на страницу, которая ответит отказом. */}
      {isCreator ? (
        <Button href="/resources/new" size="sm" variant="secondary">
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
