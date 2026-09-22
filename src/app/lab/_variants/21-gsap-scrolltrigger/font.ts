import { Archivo } from "next/font/google";

// Шрифт варианта Scroll: Archivo с осью ширины (font-stretch 75–125%).
// Отдельным модулем — им пользуются и лендинг, и страницы студии.
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--st-sans", preload: false });
