import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Bold,
  DecoupledEditor,
  Essentials,
  Italic,
  List,
  Paragraph,
  Undo,
  type Editor,
} from "ckeditor5";
import { useCallback, useMemo, useRef, useState } from "react";
import { toEditorHtml } from "@/lib/transitionLetter";
import "ckeditor5/ckeditor5.css";

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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const editorConfig = useMemo(
    () => ({
      licenseKey: "GPL" as const,
      plugins: [Essentials, Bold, Italic, Paragraph, List, Undo],
      toolbar: ["bold", "italic", "|", "bulletedList", "numberedList", "|", "undo", "redo"],
      placeholder: placeholder ?? "",
    }),
    [placeholder],
  );

  const handleReady = useCallback(
    (editor: Editor) => {
      const toolbar = editor.ui.view.toolbar?.element;
      if (toolbarRef.current && toolbar && !toolbarRef.current.contains(toolbar)) {
        toolbarRef.current.appendChild(toolbar);
      }
      if (id) {
        editor.editing.view.change((writer) => {
          const root = editor.editing.view.document.getRoot();
          if (root) writer.setAttribute("id", id, root);
        });
      }
      setReady(true);
    },
    [id],
  );

  return (
    <div
      className={`letter-ckeditor border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 ${
        fill ? "flex flex-col flex-1 min-h-0 h-full" : ""
      } ${className}`}
    >
      <div
        ref={toolbarRef}
        className={`flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-slate-100 bg-slate-50 min-h-[40px] [&_.ck-toolbar]:border-0 [&_.ck-toolbar]:bg-transparent [&_.ck-toolbar]:p-0 [&_.ck-toolbar_.ck-toolbar__items]:gap-0.5 ${
          ready ? "" : "animate-pulse"
        }`}
      />
      <div
        style={fill ? undefined : { minHeight }}
        className={`relative ${
          fill
            ? "flex-1 min-h-0 overflow-y-auto [&_.ck-editor__editable]:min-h-full"
            : "min-h-[inherit] [&_.ck-editor__editable]:min-h-[inherit]"
        }`}
      >
        {!ready && (
          <div
            className="absolute inset-0 z-10 bg-slate-50 animate-pulse pointer-events-none"
            aria-hidden
          />
        )}
        <CKEditor
          editor={DecoupledEditor}
          data={toEditorHtml(value)}
          disabled={disabled}
          config={editorConfig}
          onReady={handleReady}
          onChange={(_, editor) => onChange(editor.getData())}
        />
      </div>
      <style>{`
        .letter-ckeditor .ck.ck-editor__editable {
          border: 0;
          box-shadow: none;
          padding: 0.5rem 0.75rem;
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-size: 0.875rem;
          line-height: 1.625;
          color: #1e293b;
          min-height: ${fill ? "100%" : minHeight};
        }
        .letter-ckeditor .ck.ck-editor__editable.ck-focused {
          border: 0;
          box-shadow: none;
        }
        .letter-ckeditor .ck.ck-editor__editable p { margin: 0 0 0.65em; }
        .letter-ckeditor .ck.ck-editor__editable p:last-child { margin-bottom: 0; }
        .letter-ckeditor .ck.ck-editor__editable ul,
        .letter-ckeditor .ck.ck-editor__editable ol {
          margin: 0 0 0.65em 1.25em;
          padding: 0;
        }
        .letter-ckeditor .ck.ck-editor__editable.ck-placeholder::before {
          color: #94a3b8;
        }
        .letter-ckeditor .ck.ck-button {
          border-radius: 0.25rem;
          color: #475569;
        }
        .letter-ckeditor .ck.ck-button:hover:not(.ck-disabled) {
          background: #f1f5f9;
        }
        .letter-ckeditor .ck.ck-button.ck-on {
          background: #e2e8f0;
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}
