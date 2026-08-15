-- ============================================================
-- Поправки к таблице переходов — 2026-08-15.
--
-- Написано после сверки КАЖДОЙ кнопки интерфейса с перечнем разрешённых
-- переходов из миграции 20260815130000. Такую сверку следовало сделать
-- сразу: обе дыры ниже — не новые ошибки, а то, что я не проверил, когда
-- перечень составлял.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Была ли карта когда-нибудь одобрена.
--
-- Нужно для восстановления. Сейчас restore всегда ведёт в 'hidden', то
-- есть «одобрена, но не на витрине». Для карты, которую до удаления
-- разобрали и приняли, это верно. А для заявки, удалённой прямо из
-- очереди, — нет: она возвращается уже одобренной, и автор выкладывает
-- её на витрину одной кнопкой, минуя разбор. Дыра не теоретическая:
-- «Delete» в каталоге админки показывается и у pending.
--
-- Отдельный флаг, а не вывод из submission_kind или rejection_*: те
-- отвечают на вопрос «откуда карта пришла в очередь в последний раз», а
-- здесь нужен факт из прошлого, который нельзя потерять при следующей
-- правке.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists was_approved boolean not null default false;

comment on column public.products.was_approved is
  'Карта хотя бы раз побывала на витрине. Решает, куда возвращать её из deleted: одобренную — в hidden, неразобранную — в pending.';

-- Всё, что уже прошло модерацию: live, спрятанное автором, снятое
-- площадкой. pending и rejected — не проходили по определению.
update public.products
set was_approved = true
where state in ('live', 'hidden', 'suspended')
   or (state = 'deleted' and status = 'published');

-- Дальше флаг ставится сам, в момент выхода на витрину.
create or replace function public.mark_product_approved()
returns trigger
language plpgsql
as $$
begin
  if new.state = 'live' then
    new.was_approved := true;
  end if;
  return new;
end;
$$;

-- Имя с 'a' — чтобы триггер отработал ДО products_guard_state: тот
-- смотрит на was_approved, решая, законен ли возврат из удалённых.
drop trigger if exists a_products_mark_approved on public.products;
create trigger a_products_mark_approved
  before insert or update on public.products
  for each row execute function public.mark_product_approved();

-- ------------------------------------------------------------
-- 2. Переходы — с учётом обеих дыр.
--
--   * в 'deleted' можно из ЛЮБОГО состояния. Удаление — это «убрать из
--     каталога», и оно осмысленно на любой стадии, включая заявку,
--     которую разбирать не станут. Раньше pending и rejected были
--     забыты, и кнопка «Delete» у них падала бы с ошибкой.
--
--   * из 'deleted' теперь два выхода вместо одного:
--       was_approved → 'hidden'   (карта уже была на витрине)
--       иначе        → 'pending'  (в очередь, разбирать заново)
--     Публикация мимо модерации так становится невозможной, а не просто
--     не предусмотренной.
-- ------------------------------------------------------------
create or replace function public.guard_product_state()
returns trigger
language plpgsql
as $$
begin
  if new.state = old.state then
    return new;
  end if;

  -- Удалить можно что угодно и когда угодно.
  if new.state = 'deleted' then
    return new;
  end if;

  if old.state = 'deleted' then
    if new.was_approved and new.state = 'hidden' then
      return new;
    end if;
    if not new.was_approved and new.state = 'pending' then
      return new;
    end if;
    raise exception
      'Восстановление: одобренная карта возвращается в hidden, неразобранная — в pending (была одобрена: %, просят: %)',
      new.was_approved, new.state
      using errcode = 'check_violation';
  end if;

  if not (
    (old.state = 'pending'   and new.state in ('live', 'rejected')) or
    (old.state = 'rejected'  and new.state in ('pending')) or
    (old.state = 'live'      and new.state in ('hidden', 'suspended', 'pending')) or
    (old.state = 'hidden'    and new.state in ('live', 'pending', 'suspended')) or
    (old.state = 'suspended' and new.state in ('pending', 'live'))
  ) then
    raise exception 'Недопустимый переход состояния карты: % → %', old.state, new.state
      using errcode = 'check_violation';
  end if;

  if new.state = 'suspended' and coalesce(new.suspension_reason, '') = '' then
    raise exception 'Снятие карты требует причины'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
