import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import type { ApiLanguage } from "../../data/api-docs";

type Language = ApiLanguage | "graphql";

interface CodeSnippetProps {
  snippets: Record<string, string>;
  defaultLang?: Language;
}

const LANG_LABELS: Record<string, string> = {
  curl: "cURL",
  js: "Node.js",
  python: "Python",
  graphql: "GraphQL",
};

const LANG_HIGHLIGHT: Record<string, string> = {
  curl: "bash",
  js: "javascript",
  python: "python",
  graphql: "graphql",
};

export default function CodeSnippet({ snippets, defaultLang }: CodeSnippetProps) {
  const languages = Object.keys(snippets) as Language[];
  const [language, setLanguage] = useState<Language>(defaultLang || languages[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[language]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-[#071f24] shadow-2xl border border-teal-900/60 text-slate-100">
      {/* Tab Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-teal-900/60 bg-[#0b282d]/95 backdrop-blur">
        <div className="flex items-center space-x-1.5">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-all ${
                language === lang
                  ? "bg-[#E05326]/20 border border-[#E05326]/50 text-[#ff9879] shadow-sm"
                  : "text-teal-200/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {LANG_LABELS[lang] || lang}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="text-teal-200/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/5 flex items-center gap-1 text-xs font-mono"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-[11px] text-teal-300">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="text-xs sm:text-sm font-mono overflow-x-auto bg-[#071f24]">
        <SyntaxHighlighter
          language={LANG_HIGHLIGHT[language] || "text"}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1.25rem",
            background: "transparent",
            fontSize: "0.825rem",
            lineHeight: "1.6",
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {snippets[language]}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
