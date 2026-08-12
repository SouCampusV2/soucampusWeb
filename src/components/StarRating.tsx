import { Star, StarHalf } from "@phosphor-icons/react/dist/ssr";

// Показ оценки — только чтение. Выставление оценки живёт отдельно, в
// RatingStars: там клики, состояние и запрос в базу, а компонент обязан
// быть клиентским. Здесь ничего этого нет, поэтому серверный вариант
// иконок (dist/ssr) — карточки витрины не должны тащить в браузер
// компонент ради пяти неподвижных звёзд.
//
// Половинки (миграция 20260811130000) показываем и здесь. Раньше средний
// балл округлялся до целого — 4.5 и 4.4 выглядели одинаково, хотя это
// разные карты, а теперь ещё и сама оценка ставится с шагом 0.5.
//
// Округляем ДО БЛИЖАЙШЕЙ ПОЛОВИНЫ, а не отбрасываем хвост: 4.4 → 4.5
// честнее, чем 4.4 → 4.0. Точное число всё равно стоит рядом текстом,
// звёзды — быстрый образ, а не отчёт.
export function StarRating({
  rating,
  size = 13,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rounded;
        const half = !filled && value - 0.5 <= rounded;

        if (half) {
          return (
            <StarHalf
              key={value}
              size={size}
              weight="fill"
              aria-hidden
              className="text-orange-400"
            />
          );
        }
        return (
          <Star
            key={value}
            size={size}
            weight={filled ? "fill" : "regular"}
            aria-hidden
            className={
              filled ? "text-orange-400" : "text-zinc-300 dark:text-zinc-600"
            }
          />
        );
      })}
    </div>
  );
}
