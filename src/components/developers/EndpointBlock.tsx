import type { ApiEndpoint } from "../../data/api-docs";
import CodeSnippet from "./CodeSnippet";
import ResponseViewer from "./ResponseViewer";

interface EndpointBlockProps {
  endpoint: ApiEndpoint;
}

export default function EndpointBlock({ endpoint }: EndpointBlockProps) {
  const methodColors: Record<string, string> = {
    GET: "bg-teal-50 text-[#145660] border-teal-200",
    POST: "bg-[#E05326]/10 text-[#E05326] border-[#E05326]/30",
    PUT: "bg-amber-50 text-amber-700 border-amber-200",
    PATCH: "bg-amber-50 text-amber-700 border-amber-200",
    DELETE: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div id={endpoint.id} className="scroll-mt-28 border-t border-slate-200/90 py-14 first:border-t-0">
      <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">
        {/* Content Side */}
        <div className="flex-1 lg:max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border ${
                methodColors[endpoint.method] || "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {endpoint.method}
            </span>
            <code className="text-xs sm:text-sm font-mono text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200/80">
              {endpoint.path}
            </code>
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f3d44] mb-3">
            {endpoint.title}
          </h3>

          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            {endpoint.description}
          </p>

          {/* Query Parameters */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-[#145660] text-lg">filter_alt</span>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#0f3d44]">
                  Query Parameters
                </h4>
              </div>
              <ul className="divide-y divide-slate-100">
                {endpoint.parameters.map((param, idx) => (
                  <li key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <code className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {param.name}
                      </code>
                      <span className="text-[11px] font-mono text-[#145660] bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                        {param.type}
                      </span>
                      {param.required && (
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#E05326] bg-[#E05326]/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                      {param.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Body Parameters */}
          {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-[#145660] text-lg">data_object</span>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#0f3d44]">
                  Request Body Schema (JSON)
                </h4>
              </div>
              <ul className="divide-y divide-slate-100">
                {endpoint.bodyParams.map((param, idx) => (
                  <li key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <code className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {param.name}
                      </code>
                      <span className="text-[11px] font-mono text-[#145660] bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                        {param.type}
                      </span>
                      {param.required && (
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#E05326] bg-[#E05326]/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                      {param.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Code Side */}
        <div className="lg:w-[460px] xl:w-[540px] shrink-0">
          <div className="sticky top-28 space-y-4">
            <CodeSnippet snippets={endpoint.snippets} />
            <ResponseViewer response={endpoint.response} />
          </div>
        </div>
      </div>
    </div>
  );
}
