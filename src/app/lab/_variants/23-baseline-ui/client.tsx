"use client";

import Image from "next/image";
import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { CaretDown, X } from "@phosphor-icons/react";
import { cn } from "./cn";

// baseline-ui: всё с клавиатурой и фокусом — только на доступных
// примитивах (Base UI), руками фокус и клавиши не пишутся. Анимация —
// только там, где она нужна (открытие диалога и панели), только
// transform/opacity, до 200ms, кривые — стандартные Tailwind.

type Build = { slug: string; title: string; tag: string; image: string; summary: string; size: string; deadline: string; price: string };

export function BuildDialog({ build }: { build: Build }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="group flex w-full flex-col gap-1 text-left">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
          <Image src={build.image} alt="" fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
        </span>
        <span className="mt-2 font-medium text-zinc-900 group-hover:underline">{build.title}</span>
        <span className="text-sm text-zinc-500">{build.tag}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl transition-[opacity,transform] duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="relative aspect-[16/9] bg-zinc-100">
            <Image src={build.image} alt={build.title} fill sizes="560px" className="object-cover" />
          </div>
          <div className="p-6">
            <Dialog.Title className="text-xl font-semibold text-balance text-zinc-900">{build.title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-pretty text-zinc-600">{build.summary}</Dialog.Description>
            <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div><dt className="text-zinc-500">Size</dt><dd className="font-medium tabular-nums">{build.size}</dd></div>
              <div><dt className="text-zinc-500">Built in</dt><dd className="font-medium">{build.deadline}</dd></div>
              <div><dt className="text-zinc-500">Price</dt><dd className="font-medium">{build.price}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close className="inline-flex h-10 items-center rounded-md border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50">Close</Dialog.Close>
              <Link href={`/portfolio/${build.slug}`} className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">Open build</Link>
            </div>
          </div>
          <Dialog.Close aria-label="Close" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-zinc-700 shadow-sm hover:bg-white">
            <X size={16} weight="bold" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Review = { slug: string; name: string; role: string; text: string };

export function ReviewTabs({ reviews }: { reviews: Review[] }) {
  return (
    <Tabs.Root defaultValue={reviews[0]?.slug}>
      <Tabs.List className="relative flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
        {reviews.map((r) => (
          <Tabs.Tab
            key={r.slug}
            value={r.slug}
            className={cn(
              "relative z-10 h-8 rounded-md px-3 text-sm font-medium text-zinc-600 outline-none",
              "focus-visible:ring-2 focus-visible:ring-blue-600",
              "data-[active]:text-zinc-900"
            )}
          >
            {r.name}
          </Tabs.Tab>
        ))}
        {/* Индикатор едет через transform: baseline-ui запрещает анимировать
            left/width. Ширина меняется мгновенно — вкладки близки по размеру. */}
        <Tabs.Indicator className="absolute inset-y-1 left-0 z-0 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out" />
      </Tabs.List>
      {reviews.map((r) => (
        <Tabs.Panel key={r.slug} value={r.slug} className="mt-6 outline-none">
          <figure>
            <blockquote className="text-lg text-pretty text-zinc-900">{r.text}</blockquote>
            <figcaption className="mt-3 text-sm text-zinc-500">{r.name}, {r.role}</figcaption>
          </figure>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

export function StepsAccordion({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <Accordion.Root defaultValue={[steps[0]?.title]} className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {steps.map((st, i) => (
        <Accordion.Item key={st.title} value={st.title}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center gap-4 px-4 py-4 text-left font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-blue-600">
              <span className="text-sm text-zinc-500 tabular-nums">{i + 1}</span>
              <span className="flex-1">{st.title}</span>
              <CaretDown size={16} className="text-zinc-500 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          {/* Высоту не анимируем (layout-свойство, запрет скилла): панель
              открывается сразу и лишь проявляется через opacity. */}
          <Accordion.Panel className="overflow-hidden transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <p className="px-4 pb-4 pl-11 text-pretty text-zinc-600">{st.text}</p>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
