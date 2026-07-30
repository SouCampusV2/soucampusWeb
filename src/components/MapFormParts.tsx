"use client";

import type { Editor } from "@tiptap/react";
import {
  Image as ImageIcon,
  Table as TableIcon,
  TextB,
  TextItalic,
  ListBullets,
  ListNumbers,
  TextHOne,
  TextHTwo,
  LinkSimple,
} from "@phosphor-icons/react";
import { RICH_TEXT_CLASS } from "@/lib/rich-text";

// Общие части форм карты — их две (создание UploadMapForm и правка
// EditMapForm), и панель редактора с текстовым полем в них обязаны быть
// одинаковыми. Копия неминуемо разъехалась бы: добавили кнопку в одну
// форму, забыли в другой.

// Содержимое редактора оформляем ровно теми же классами, что страница
// товара (RICH_TEXT_CLASS), плюс рамка самого поля ввода. Иначе креатор
// вёрстает вслепую: видит одно, покупатель получает другое.
export const EDITOR_CONTENT_CLASS = `min-h-[10rem] rounded-b-2xl px-4 py-3 text-sm text-zinc-950 focus:outline-none dark:text-zinc-50 ${RICH_TEXT_CLASS}`;

export function EditorToolbar({
  editor,
  onPickImage,
}: {
  editor: Editor | null;
  onPickImage: () => void;
}) {
  if (!editor) return null;

  const items: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "Bold",
      icon: <TextB size={16} weight="bold" />,
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: <TextItalic size={16} weight="bold" />,
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Heading",
      icon: <TextHOne size={16} weight="bold" />,
      active: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subheading",
      icon: <TextHTwo size={16} weight="bold" />,
      active: editor.isActive("heading", { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bullet list",
      icon: <ListBullets size={16} weight="bold" />,
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: <ListNumbers size={16} weight="bold" />,
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Link",
      icon: <LinkSimple size={16} weight="bold" />,
      active: editor.isActive("link"),
      onClick: () => {
        const url = window.prompt("Link URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
    },
    {
      label: "Insert image",
      icon: <ImageIcon size={16} weight="bold" />,
      active: false,
      onClick: onPickImage,
    },
    {
      label: "Insert table",
      icon: <TableIcon size={16} weight="bold" />,
      active: editor.isActive("table"),
      onClick: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-zinc-950/[0.08] bg-zinc-950/[0.02] px-2 py-1.5 dark:border-zinc-50/[0.08] dark:bg-zinc-50/[0.03]">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          className={`rounded-lg p-1.5 transition-colors ${
            item.active
              ? "bg-orange-500 text-zinc-950 dark:bg-orange-400"
              : "text-zinc-600 hover:bg-zinc-950/[0.06] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.08]"
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  required,
  maxLength,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {hint && (
          <span className="font-normal text-zinc-500 dark:text-zinc-400"> {hint}</span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}
