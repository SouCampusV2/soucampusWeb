import Link from "next/link";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";
import { getPendingApplications } from "@/lib/creator-applications";
import { ApplicationActions } from "@/components/ApplicationActions";
import { INLINE_LINK } from "@/components/Button";
import { creatorHref } from "@/lib/creators";

// Очередь заявок на статус креатора.
//
// Устроена как очередь карт и намеренно так же выглядит: то же решение
// («пустить или нет»), тот же формат отказа с причиной. Разница в том,
// ЧТО разбирается — не файл, а человек. Отсюда и смысл заявок: спамера
// отсекаешь один раз, а не на каждой присланной карте.
//
// Права проверяет layout админки; у /api/admin/applications своя проверка.
export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const applications = await getPendingApplications();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Creator applications
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {applications.length === 0
          ? "Nothing waiting."
          : `${applications.length} ${
              applications.length === 1 ? "person" : "people"
            } waiting to be let in.`}
      </p>

      {applications.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <UserPlus size={40} weight="thin" className="mx-auto text-zinc-300 dark:text-zinc-700" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            When someone applies from their settings, they show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-6">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  <Link
                    href={creatorHref(application.displayName)}
                    className={INLINE_LINK}
                  >
                    {application.displayName}
                  </Link>
                </h2>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(application.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Адрес — рабочая ссылка: пока нет раздела сообщений,
                  ответить человеку можно только письмом, и лишний шаг
                  «скопировать вручную» тут ни к чему. */}
              {application.email && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <a href={`mailto:${application.email}`} className={INLINE_LINK}>
                    {application.email}
                  </a>
                </p>
              )}

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {application.about}
              </p>

              <dl className="mt-4 space-y-1 text-sm">
                {application.portfolioUrl && (
                  <div className="flex gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Portfolio</dt>
                    <dd className="min-w-0 flex-1 truncate">
                      {/* Ссылка чужая и непроверенная: noopener, чтобы
                          открытая вкладка не получила доступ к нашей. */}
                      <a
                        href={application.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={INLINE_LINK}
                      >
                        {application.portfolioUrl}
                      </a>
                    </dd>
                  </div>
                )}
                {application.discord && (
                  <div className="flex gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Discord</dt>
                    <dd className="font-medium text-zinc-950 dark:text-zinc-50">
                      {application.discord}
                    </dd>
                  </div>
                )}
              </dl>

              <ApplicationActions applicationId={application.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
