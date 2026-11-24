import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";

// Кнопка вместо покупки на сайте, когда у карты есть страница на
// BuiltByBit (24.11, products.buy_url). Креаторам платная цена у нас
// закрыта — так платную карту можно продавать там. Стрелка «наружу»
// справа, как у всех кнопок, уводящих с сайта.
export function BuyOnBuiltByBit({ href }: { href: string }) {
  return (
    <div>
      <Button href={href} target="_blank" rel="noopener noreferrer" size="lg" className="group w-full">
        Buy on BuiltByBit
        <ArrowUpRight size={20} weight="bold" aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Button>
      <p className="mt-2 text-center text-xs text-zinc-600 dark:text-zinc-300">
        You pay and download on BuiltByBit.
      </p>
    </div>
  );
}
