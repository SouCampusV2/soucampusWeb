"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table/kit";
import { EditorToolbar, EDITOR_CONTENT_CLASS } from "@/components/MapFormParts";

// Редактор описания карты — ОДИН на обе формы (загрузка и правка).
//
// Существует по двум причинам сразу.
//
// 1. Конфигурация была скопирована в UploadMapForm и EditMapForm слово в
//    слово (те же четыре расширения, те же настройки). Разъехавшись, они
//    дали бы тот самый баг, от которого бережёмся везде в этом проекте:
//    креатор описывает карту одним набором возможностей, а правит —
//    другим. Ровно та же болезнь, что была у градиента и у белого списка
//    санитайзера.
//
// 2. **Это точка ленивой загрузки.** Tiptap с ProseMirror весит около
//    668 КБ, и до 2026-08-09 он лежал в бандле обеих страниц целиком:
//    браузер обязан был скачать и выполнить его прежде, чем форма вообще
//    оживёт. Отсюда жалоба владельца, что «Add a map грузится миллион
//    лет». Теперь формы грузят этот файл отдельно (см. dynamic() в них),
//    и всё остальное — название, цена, категория, выбор файла —
//    работает, не дожидаясь редактора.
//
// Экземпляр редактора отдаётся наружу через onReady: форме он нужен, чтобы
// забрать HTML при отправке и вставить картинку в текст. Возвращать его
// колбэком, а не поднимать useEditor в форму, — единственный способ
// оставить импорты Tiptap внутри этого файла, иначе ленивая загрузка
// теряет смысл: тот, кто вызывает useEditor, тянет библиотеку к себе.
export function RichTextEditor({
  content,
  onReady,
  onPickImage,
}: {
  /** Готовый HTML — только у формы правки; при загрузке новой карты пусто. */
  content?: string;
  /** Обычно setState-сеттер формы: его identity стабильна между рендерами. */
  onReady: (editor: Editor | null) => void;
  onPickImage: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      // Картинки прямо в тексте описания — как на BuiltByBit, где
      // описание это полноценная страница со скринами между блоками,
      // а не только галерея сверху.
      Image.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      // Таблицы — ими креаторы описывают версии/форматы файлов.
      TableKit.configure({ table: { resizable: false } }),
    ],
    content,
    immediatelyRender: false,
    editorProps: { attributes: { class: EDITOR_CONTENT_CLASS } },
  });

  useEffect(() => {
    onReady(editor);
    // Забрать ссылку при размонтировании: иначе форма продолжит держать
    // уничтоженный редактор и упадёт на getHTML().
    return () => onReady(null);
  }, [editor, onReady]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-950/[0.08] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25 dark:border-zinc-50/[0.08]">
      <EditorToolbar editor={editor} onPickImage={onPickImage} />
      <EditorContent editor={editor} />
    </div>
  );
}

// Заглушка на время загрузки редактора. Ровно той же высоты и формы, что
// сам редактор (панель + поле), — иначе форма дёргалась бы, подставляя
// его на место, и человек промахивался бы мимо полей под ним.
export function RichTextEditorSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-zinc-950/[0.08] dark:border-zinc-50/[0.08]"
    >
      <div className="h-[42px] border-b border-zinc-950/[0.08] bg-zinc-950/[0.02] dark:border-zinc-50/[0.08] dark:bg-zinc-50/[0.02]" />
      <div className="min-h-[10rem] px-4 py-3">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-950/[0.06] dark:bg-zinc-50/[0.08]" />
      </div>
    </div>
  );
}
