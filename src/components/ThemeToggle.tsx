"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";

// Кнопка «солнце/луна». Жила внутри ContactFooter — и это значило, что
// тему можно переключить только там, где есть футер. В админке футера нет
// намеренно (она вне группы (site)), поэтому тёмная тема там включалась
// разве что заходом на сайт и возвратом назад.
//
// Провайдер темы общий для всего приложения (корневой layout), так что
// кнопке достаточно переехать в свой файл — состояние уже глобальное.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:text-orange-500 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-orange-400 ${className}`}
    >
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
