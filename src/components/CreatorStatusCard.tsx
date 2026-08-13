import Link from "next/link";
import { Clock, XCircle, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { CreatorApplicationForm } from "@/components/CreatorApplicationForm";
import { INLINE_LINK } from "@/components/Button";
import type { CreatorApplication } from "@/lib/creator-applications";

// «Стать креатором» — на /resources, вместо списка карт у того, кому
// загружать ещё нельзя.
//
// Почему здесь, а не в настройках (решение владельца 2026-08-09): человек
// открывает «Your resources», чтобы добавить карту, и упирается в то, что
// не может. Ответ «сначала подай заявку» должен лежать ровно в этом
// месте, а не в другом разделе, куда ещё надо догадаться пойти.
//
// Серверный компонент: клиентская здесь только сама форма. Решение «что
// показать» принимается по данным и в браузер уезжать не должно — иначе у
// подавшего заявку на миг мелькала бы пустая форма подачи.
export function CreatorStatusCard({
  userId,
  application,
}: {
  userId: string;
  application: CreatorApplication | null;
}) {
  if (application?.status === "pending") {
    return (
      <Card>
        <Clock size={28} className="mx-auto text-zinc-400" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Application sent
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Sent {new Date(application.createdAt).toLocaleDateString()}. We read
          every one — the answer shows up right here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
        <SealCheck
          size={24}
          weight="fill"
          className="text-orange-600 dark:text-orange-400"
          aria-hidden
        />
      </div>
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {application?.status === "rejected"
          ? "Apply again"
          : "Publish your maps here"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Tell us what you build. Once you&apos;re approved you can upload maps,
        and each one goes live on the marketplace after a review.
      </p>

      {/* Отказ — ВМЕСТЕ с формой, а не вместо неё: человек должен прочитать
          причину и тут же исправиться, а не искать, где подать заново. */}
      {application?.status === "rejected" && (
        <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <XCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Not this time: </span>
            {application.rejectionReason ?? "No reason was given."}
          </p>
        </div>
      )}

      {/* Форма выровнена по левому краю внутри центрированной карточки:
          подписи полей читаются слева направо, по центру их не собрать. */}
      <div className="mx-auto mt-6 max-w-md text-left">
        <CreatorApplicationForm userId={userId} />

        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Selling here means agreeing to the{" "}
          <Link href="/terms" className={INLINE_LINK}>
            terms
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-[#fbfbff] p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
      {children}
    </section>
  );
}
