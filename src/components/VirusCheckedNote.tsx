import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";

// «✓ Checked for viruses» (24.11, идея владельца: видно, что сканер на
// VPS отработал, без захода на сервер). Показывается ТОЛЬКО когда сервер
// ответил scanned: true — файл действительно прошёл ClamAV, а не был
// пропущен из-за отключённого сканера (scanner-client.ts →
// checkStoredFile). Зелёный, как бейдж «Live»: это хорошая новость.
export function VirusCheckedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800 dark:bg-lime-950 dark:text-lime-300">
      <ShieldCheck size={16} weight="fill" aria-hidden className="shrink-0" />
      {children}
    </p>
  );
}
