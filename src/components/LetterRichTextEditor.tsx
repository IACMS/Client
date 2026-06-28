import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toEditorHtml } from "@/lib/transitionLetter";

type Props = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  /** Grow to fill available flex space (for fullscreen letter body). */
  fill?: boolean;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 ${
        active ? "bg-slate-200 text-slate-900" : ""
      }`}
    >
      {children}
    </button>
  );
}

export default function LetterRichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = "200px",
  className = "",
  fill = false,
}: Props) {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [StarterKit],
    content: toEditorHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          "letter-rte-content px-3 py-2 text-sm font-serif leading-relaxed text-slate-800 focus:outline-none min-h-[inherit]",
        "data-placeholder": placeholder ?? "",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={`border border-slate-200 rounded-lg bg-slate-50 animate-pulse ${fill ? "flex-1 min-h-0" : ""} ${className}`}
        style={fill ? undefined : { minHeight }}
      />
    );
  }

  return (
    <div
      className={`border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 ${
        fill ? "flex flex-col flex-1 min-h-0 h-full" : ""
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
        <ToolbarButton
          label={t("modals.editor.bold")}
          disabled={disabled}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </ToolbarButton>
        <ToolbarButton
          label={t("modals.editor.italic")}
          disabled={disabled}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </ToolbarButton>
        <ToolbarButton
          label={t("modals.editor.bulletList")}
          disabled={disabled}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </ToolbarButton>
        <ToolbarButton
          label={t("modals.editor.numberedList")}
          disabled={disabled}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
        </ToolbarButton>
        <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden />
        <ToolbarButton
          label={t("modals.editor.undo")}
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </ToolbarButton>
        <ToolbarButton
          label={t("modals.editor.redo")}
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <span className="material-symbols-outlined text-[18px]">redo</span>
        </ToolbarButton>
      </div>
      <div
        style={fill ? undefined : { minHeight }}
        className={
          fill
            ? "flex-1 min-h-0 overflow-y-auto [&_.letter-rte-content]:min-h-full"
            : "min-h-[inherit] [&_.letter-rte-content]:min-h-[inherit]"
        }
      >
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .letter-rte-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .letter-rte-content p { margin: 0 0 0.65em; }
        .letter-rte-content p:last-child { margin-bottom: 0; }
        .letter-rte-content ul, .letter-rte-content ol { margin: 0 0 0.65em 1.25em; padding: 0; }
      `}</style>
    </div>
  );
}
