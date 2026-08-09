import Link from "next/link";
import { SealCheck, Clock, XCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { CreatorApplicationForm } from "@/components/CreatorApplicationForm";
import type { CreatorApplication } from "@/lib/creator-applications";

// Блок «стать креатором» на /settings. Четыре состояния, и у каждого своя
// задача — поэтому не один текст с подстановками.
//
// Серверный компонент: сама форма клиентская, а решение «что показать»
// принимается по данным и в браузер уезжать не должно (иначе на секунду
// мелькала бы форма подачи у того, кто уже одобрен).
export function CreatorStatusCard({
  userId,
  isCreator,
  application,
}: {
  userId: string;
  isCreator: boolean;
  application: CreatorApplication | null;
}) {
  // Уже креатор — заявка не нужна ни в каком виде, показываем путь к делу.
  if (isCreator) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <SealCheck
            size={22}
            weight="fill"
            className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-400"
            aria-hidden
          />
          <div>
            <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
              You can publish maps
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Upload a map and it goes into review before it reaches the shop.
            </p>
            <div className="mt-4">
              <Button href="/creator/upload" size="sm">
                Add a map
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (application?.status === "pending") {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Clock size={22} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden />
          <div>
            <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
              Application sent
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Sent {new Date(application.createdAt).toLocaleDateString()}.
              We read every one — you&apos;ll hear back here.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
        Want to sell your maps here?
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Tell us what you build. Once you&apos;re approved you can upload maps
        and they&apos;ll show up in the shop after review.
      </p>

      {/* Отказ показываем ВМЕСТЕ с формой, а не вместо неё: человек должен
          прочитать причину и тут же исправиться, а не искать, где подать
          заново. */}
      {application?.status === "rejected" && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <XCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Not this time: </span>
            {application.rejectionReason ?? "No reason was given."}
          </p>
        </div>
      )}

      <CreatorApplicationForm userId={userId} />

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        Selling here means agreeing to the{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>
        .
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10 rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800">
      {children}
    </section>
  );
}
