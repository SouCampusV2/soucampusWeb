"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();
function notifyAll() {
  listeners.forEach((notify) => notify());
}

// Источник правды — localStorage, а НЕ класс .dark на <html>.
//
// Раньше правдой был именно класс: getSnapshot читал
// documentElement.classList, и это оказалось той самой причиной, по
// которой «на всём сайте иногда сама включалась светлая тема, а в
// админке было стабильно темно». Класс на <html> ставит блокирующий
// скрипт из layout.tsx, но сам <html> рендерит React
// (`<html className="...">` без dark — сервер сохранённый выбор не
// знает). Стоит React пересобрать корень дерева — а он это делает,
// например восстанавливаясь после расхождения гидратации, — как
// className переписывается тем, что в рендере, и .dark молча пропадает.
// Выбор при этом никуда не девался, он лежал в localStorage, поэтому
// F5 возвращал тёмную тему.
//
// Расхождения гидратации случаются там, где первый кадр зависит от
// браузера: корзина в localStorage, аватар из сессии, useHydrated. Всё
// это живёт в группе (site) и ничего этого нет в админке — отсюда и
// «на сайте иногда, в админке никогда». Две кнопки переключателя ни при
// чём: ThemeToggle в футере и ThemeToggle в шапке админки — один и тот
// же компонент поверх одного провайдера, ломать друг друга им нечем.
//
// Теперь класс — это ПРОЕКЦИЯ сохранённого выбора, и она чинится сама
// (см. эффект в провайдере ниже): даже если React снова сотрёт
// className, ближайший же рендер вернёт .dark на место.
function readStored(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // localStorage может быть недоступен (приватный режим, запрет на
    // сторонние данные). Тогда правдой остаётся то, что на экране.
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
}

// Подписка на чужие изменения: событие storage прилетает, когда тему
// переключили в ДРУГОЙ вкладке — иначе вкладки разъезжаются до
// перезагрузки. Своё изменение storage не шлёт, его разносит notifyAll.
function subscribe(callback: () => void) {
  listeners.add(callback);
  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) callback();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

// На сервере нет ни DOM, ни localStorage — всегда "light". Скрипт в
// <head> мог уже добавить .dark к моменту гидратации, поэтому getSnapshot
// и getServerSnapshot законно расходятся на первом чтении.
// useSyncExternalStore сделан ровно для этого: на гидратации отдаёт
// серверное значение (разметка совпадает, предупреждения нет), сразу
// после — настоящее, без setState в эффекте.
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  // Приводим DOM к сохранённому выбору. Без списка зависимостей
  // намеренно: эффект должен отрабатывать ПОСЛЕ КАЖДОГО рендера, потому
  // что чинит он не своё состояние, а чужую порчу — className, который
  // мог переписать React между прошлым рендером и этим. Дважды один и
  // тот же класс не «доставится»: classList.toggle с явным вторым
  // аргументом идемпотентен, лишних мутаций и перерисовок нет.
  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === "dark";
    if (root.classList.contains("dark") !== dark) root.classList.toggle("dark", dark);
    if (root.style.colorScheme !== theme) root.style.colorScheme = theme;
  });

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Записать не вышло — выбор не переживёт перезагрузку, но в этой
      // сессии сработать обязан: красим DOM сразу, а не ждём эффекта,
      // иначе readStored вернёт старое значение и кнопка «не нажмётся».
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    notifyAll();
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
