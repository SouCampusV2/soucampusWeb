"use client";

import { useEffect } from "react";

// Подсвечивает элемент, к которому привёл якорь в адресе, — «ты был
// здесь» после возврата со страницы работы.
//
// Почему не CSS `:target`: Next меняет адрес через history.pushState, а
// `:target` на это не реагирует — он обновляется только при настоящей
// смене hash. На клиентском переходе подсветка не загорелась бы никогда.
//
// Элемент сам решает, как выглядит подсветка: здесь ставится только
// `data-returned`, а стиль — вариант `data-[returned=true]:` у карточки.
// Гаснет сама: это подсказка, а не выделение, которое надо снимать.
const HIGHLIGHT_MS = 2200;

export function HashHighlight() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.returned = "true";
    const timer = setTimeout(() => delete el.dataset.returned, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      delete el.dataset.returned;
    };
  }, []);

  return null;
}
