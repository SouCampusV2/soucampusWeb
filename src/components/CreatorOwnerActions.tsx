"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, GearSix, PencilSimple } from "@phosphor-icons/react";
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

      // ?view=visitor — «как видят другие» (24.11): владелец смотрит свой
      // профиль без своих кнопок. Читаем адрес в эффекте, а не через
      // useSearchParams: страница профиля статическая, и хук потребовал
      // бы Suspense вокруг всей шапки.
      const asVisitor = new URLSearchParams(window.location.search).get("view") === "visitor";
      const owner = session?.user.id === creatorId && !asVisitor;
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

const ICON_BUTTON =
  "inline-flex size-10 items-center justify-center rounded-full border border-zinc-950/[0.08] text-zinc-600 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white";

export function CreatorOwnerActions({
  creatorId,
}: {
  /** profiles.id владельца открытой страницы. */
  creatorId: string;
}) {
  const { isOwner, isCreator } = useOwner(creatorId, true);
  const pathname = usePathname();

  if (!isOwner || isCreator === null) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
      {/* Настройки и «как видят другие» — маленькими круглыми иконками,
          серыми (24.11: кнопка-таблетка Settings владельцу не понравилась,
          «небольшую иконочку, и не оранжевым»). Подпись — в title и
          aria-label. «Как видят другие» — обычная ссылка с перезагрузкой:
          кнопки владельца проверяются один раз при загрузке. */}
      <Link href="/settings" aria-label="Settings" title="Settings" className={ICON_BUTTON}>
        <GearSix size={20} weight="bold" aria-hidden />
      </Link>
      <a href={`${pathname}?view=visitor`} aria-label="View as visitor" title="View as visitor" className={ICON_BUTTON}>
        <Eye size={20} weight="bold" aria-hidden />
      </a>
    </div>
  );
}
