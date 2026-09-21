-- ============================================================
-- Шлюз записи, пути №5, №9–13: две функции для сервера.
-- 2026-09-21.
--
-- Первая половина пары. ВТОРАЯ — 20260921130000_social_gateway_policies,
-- и порядок между ними обязателен:
--
--   эта миграция  ДОБАВЛЯЕТ  → прогонять ДО деплоя кода;
--   вторая        УДАЛЯЕТ    → прогонять ПОСЛЕ деплоя кода.
--
-- ⚠️ ЗАЧЕМ ФАЙЛОВ ДВА, А НЕ ОДИН. 15.09 на этом уже попались: миграцию
-- map_write_gateway назвали «удаляющей» по заголовку, а один её раздел
-- МЕНЯЛ функцию, нужную новому коду, — и в окне между деплоем и
-- прогоном сохранение карты с картинками падало. Правило оттуда: «после
-- деплоя» проверяется по КАЖДОМУ разделу файла. Здесь проверено — и
-- разделы разъехались по двум файлам, потому что срок у них разный.
--
-- Новый код зовёт обе функции ниже сразу, как только окажется на
-- Vercel. Прогонишь этот файл позже деплоя — комментарии и оценки
-- отвечают «не сработало» до прогона.
-- ============================================================

-- ------------------------------------------------------------
-- 1. has_purchased_for — «купил ли ЭТОТ человек».
--
-- У has_purchased(product_id) человек берётся из JWT: auth.uid() и
-- auth.email(). Шлюз ходит служебным ключом, JWT у него пустой, и та
-- функция под ним отвечает «нет» ВСЕГДА. То есть проверку покупки надо
-- было либо повторить в TypeScript, либо назвать человека явно.
--
-- ⚠️ Выбрано второе, и это не вкусовщина. Правило с подвохом: заказ
-- засчитывается и по user_id, и по почте ГОСТЕВОГО заказа — иначе
-- покупка, сделанная до регистрации, перестала бы считаться. Две копии
-- такого правила однажды ответят по-разному, и человек молча потеряет
-- право, за которое заплатил.
--
-- Тело — дословно то же, что у has_purchased, с заменой источника
-- человека. Старая функция остаётся: её зовут политики чтения и сам
-- клиент («уже куплено» на странице карты).
-- ------------------------------------------------------------
create or replace function public.has_purchased_for(
  p_product_id uuid,
  p_user_id    uuid,
  p_email      text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'paid'
      and (
        o.user_id = p_user_id
        or (o.user_id is null and p_email is not null and o.customer_email = p_email)
      )
  );
$$;

-- ⚠️ ГЛАВНАЯ СТРОКА ЭТОГО РАЗДЕЛА. Postgres выдаёт execute на новую
-- функцию роли PUBLIC ПО УМОЛЧАНИЮ — то есть без revoke её звал бы
-- любой посетитель из консоли браузера, назвав ЛЮБОЙ user_id и ЛЮБУЮ
-- почту. Функция security definer, заказы она видит все: это был бы
-- способ проверять чужие покупки перебором.
--
-- То же правило ловили на consume_rate_limit 23.08. Оно не про
-- конкретную функцию — разрешение здесь выдаётся само и молча.
revoke all on function public.has_purchased_for(uuid, uuid, text) from public;
revoke all on function public.has_purchased_for(uuid, uuid, text) from anon, authenticated;
grant execute on function public.has_purchased_for(uuid, uuid, text) to service_role;

-- ------------------------------------------------------------
-- 2. soft_delete_comment_for — то же удаление, но с явным человеком.
--
-- Причина та же: soft_delete_comment решает, КТО удалил, по auth.uid(),
-- а у служебного ключа его нет — под шлюзом она отвечала бы
-- «comment_forbidden» всем.
--
-- ⚠️ Разбор «кто удалил» ОСТАЁТСЯ В БАЗЕ, и это главное решение здесь.
-- Право удалить есть у троих — написавший, автор карты, площадка, — и
-- метку ставит функция сама. Перенеси этот разбор в обработчик, и автор
-- карты сможет пометить чужое удаление как «передумал сам»: ровно то,
-- ради чего 21.08 функцию и заводили вместо политики.
--
-- Тело повторяет soft_delete_comment дословно, кроме источника
-- человека. Копия в базе — цена того, что вызывающих стало два (шлюз и
-- админка); повторять её в TypeScript было бы дороже.
-- ------------------------------------------------------------
create or replace function public.soft_delete_comment_for(
  p_comment_id uuid,
  p_actor      uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  who text;
begin
  select pc.*, p.creator_id
    into c
    from public.product_comments pc
    join public.products p on p.id = pc.product_id
   where pc.id = p_comment_id;

  if not found then
    -- Не «нет прав», а «нет такого»: сообщать постороннему, что
    -- комментарий существует, незачем.
    raise exception 'comment_not_found' using errcode = 'no_data_found';
  end if;

  if c.deleted_by is not null then
    return; -- Уже удалён. Повтор — не ошибка, просто нечего делать.
  end if;

  if p_actor = c.user_id then
    who := 'author';
  elsif p_actor = c.creator_id then
    who := 'creator';
  else
    raise exception 'comment_forbidden' using errcode = 'insufficient_privilege';
  end if;

  update public.product_comments
     set deleted_by = who, deleted_at = now()
   where id = p_comment_id;
end;
$$;

-- Та же оговорка, что выше: без revoke эту функцию звал бы кто угодно,
-- подставив ЛЮБОГО p_actor, — то есть удалял бы чужие комментарии от
-- чужого имени.
revoke all on function public.soft_delete_comment_for(uuid, uuid) from public;
revoke all on function public.soft_delete_comment_for(uuid, uuid) from anon, authenticated;
grant execute on function public.soft_delete_comment_for(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260921120000_social_gateway_functions')
on conflict (version) do nothing;
