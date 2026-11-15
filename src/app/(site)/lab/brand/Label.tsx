// Подпись варианта в лаборатории: крупный номер, чтобы владелец мог
// ответить «нравится З2 и А4». Без "use client" — годится и серверу, и клиенту.
export function Label({ n, name, note }: { n: string; name: string; note?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-4 pt-12">
      <p className="text-sm font-semibold text-orange-600">
        <span className="mr-2 rounded-full bg-orange-500 px-2.5 py-0.5 text-zinc-950">{n}</span>
        {name}
      </p>
      {note && <p className="mt-1 text-sm text-zinc-500">{note}</p>}
    </div>
  );
}
