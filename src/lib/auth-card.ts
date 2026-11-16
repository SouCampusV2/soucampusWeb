// Карточка двухшагового входа: одна строка классов для привязки
// приложения (TwoStepSetup) и для ввода кода (TwoStepChallenge). До 17.11
// у каждого компонента была своя копия — отчёт 16.11; следующая правка
// отступа или радиуса попала бы в один файл и забыла про второй.
export const AUTH_CARD =
  "mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950";
