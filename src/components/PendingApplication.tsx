"use client";

import { useState } from "react";
import { Clock, PencilSimple } from "@phosphor-icons/react";
import { Button, INLINE_LINK } from "@/components/Button";
import { CreatorApplicationForm } from "@/components/CreatorApplicationForm";
import { LocalTime } from "@/components/LocalTime";
import type { CreatorApplication } from "@/lib/creator-applications";

// Поданная заявка, пока её не разобрали (24.11, просьба владельца).
//
// Раньше здесь было только «Application sent» и дата: что именно человек
// написал, он уже не видел, и поправить опечатку в нике Discord — по
// которому с ним и свяжутся — было нельзя. Теперь видно статус, всё
// поданное и есть Edit.
//
// Клиентский — только из-за переключения «смотреть / править». Что
// показывать (ждёт заявка или нет) решает сервер в CreatorStatusCard.
export function PendingApplication({
  application,
}: {
  application: CreatorApplication;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-md text-left">
      <div className="flex items-center justify-center gap-2">
        <Clock size={20} className="text-zinc-400" aria-hidden />
        <span className="rounded-full bg-zinc-950/[0.05] px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
          In review
        </span>
      </div>
      <h2 className="mt-3 text-center text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Your creator application
      </h2>
      <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Sent <LocalTime value={application.createdAt} shape="date" />. We read
        every one. The answer shows up right here and in your notifications.
      </p>

      {editing ? (
        <div className="mt-6">
          <CreatorApplicationForm
            initial={{
              about: application.about,
              portfolio: application.portfolioUrl ?? "",
              discord: application.discord ?? "",
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <dl className="mt-6 space-y-4 rounded-2xl bg-zinc-950/[0.03] p-5 text-sm dark:bg-white/[0.04]">
            <Field label="About your building">
              <span className="whitespace-pre-line">{application.about}</span>
            </Field>
            <Field label="Portfolio link">
              {application.portfolioUrl ? (
                <a
                  href={application.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`${INLINE_LINK} break-all`}
                >
                  {application.portfolioUrl}
                </a>
              ) : (
                <Empty />
              )}
            </Field>
            <Field label="Discord">
              {application.discord ?? <Empty />}
            </Field>
          </dl>
          <div className="mt-4 flex justify-center">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Edit application
              <PencilSimple size={16} weight="bold" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="italic text-zinc-400 dark:text-zinc-500">Not given</span>;
}
