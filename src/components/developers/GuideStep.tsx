import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface GuideStepProps {
  step: number;
  title: string;
  children: React.ReactNode;
  code?: string;
  language?: string;
}

export default function GuideStep({ step, title, children, code, language = "bash" }: GuideStepProps) {
  return (
    <div className="flex gap-5 sm:gap-7 mb-14 last:mb-0">
      {/* Step Indicator & Vertical Rule */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#145660] to-[#0a2327] border border-teal-500/30 text-white font-serif font-bold text-base shadow-md">
          {step}
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 mt-3" />
      </div>

      {/* Step Content */}
      <div className="flex-1 pb-4">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0f3d44] mb-3">
          {title}
        </h3>

        <div className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-5">
          {children}
        </div>

        {code && (
          <div className="rounded-2xl overflow-hidden bg-[#071f24] shadow-xl border border-teal-900/60 text-slate-100">
            <div className="px-4 py-2 bg-[#0b282d]/90 border-b border-teal-900/60 flex items-center justify-between text-[11px] font-mono text-teal-300/80">
              <span className="uppercase tracking-wider">{language}</span>
              <span className="text-slate-400">EXECUTION SNIPPET</span>
            </div>
            <div className="text-xs sm:text-sm font-mono overflow-x-auto bg-[#071f24]">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "1.25rem",
                  background: "transparent",
                  fontSize: "0.825rem",
                  lineHeight: "1.6",
                }}
                wrapLongLines={true}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
