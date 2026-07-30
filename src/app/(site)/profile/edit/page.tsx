import { redirect } from "next/navigation";

// Переехало в /settings (2026-07-30): пункт меню называется «Settings»,
// и адрес со страницей теперь называются так же.
export default function ProfileEditRedirect() {
  redirect("/settings");
}
