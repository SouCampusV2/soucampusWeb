import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn из baseline-ui («MUST use cn utility»): clsx собирает условные
// классы, tailwind-merge убирает конфликтующие (последний выигрывает).
// Живёт в папке варианта: в остальном проекте такой утилиты нет, и
// заводить её в src/lib ради лаборатории незачем.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
