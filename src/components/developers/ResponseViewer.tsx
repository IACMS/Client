import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ResponseViewerProps {
  response: any;
}

export default function ResponseViewer({ response }: ResponseViewerProps) {
  // By default closed as requested
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-2xl overflow-hidden bg-[#071f24] shadow-2xl border border-teal-900/60 text-slate-100">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 bg-[#0b282d]/95 backdrop-blur flex items-center justify-between hover:bg-[#0e3339] transition-colors border-b border-teal-900/60"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-teal-300" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-teal-300" />
          )}
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-teal-200/90">
            RESPONSE PAYLOAD
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-normal hidden sm:inline">
            {expanded ? "(click to collapse)" : "(click to expand)"}
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30 tracking-wider">
          200 OK
        </span>
      </button>

      {expanded && (
        <div className="text-xs sm:text-sm font-mono overflow-x-auto bg-[#071f24]">
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "1.25rem",
              background: "transparent",
              fontSize: "0.825rem",
              lineHeight: "1.6",
            }}
          >
            {JSON.stringify(response, null, 2)}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
