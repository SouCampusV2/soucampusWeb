"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";
import { PASSWORD_RULES } from "@/lib/password";

// Чеклист требований к паролю под полем ввода. Вынесен из AuthForm,
// когда появился сброс пароля: показывать правила надо в обоих местах
// одинаково, а копия быстро разъехалась бы с оригиналом.
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2.5 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${
              ok
                ? "text-lime-600 dark:text-lime-400"
                : "text-zinc-500 dark:text-zinc-500"
            }`}
          >
            {ok ? <CheckCircle size={14} weight="fill" /> : <Circle size={14} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
