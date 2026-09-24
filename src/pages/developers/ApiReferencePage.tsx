import { useEffect, useState } from "react";
import { apiDocs } from "../../data/api-docs";
import { graphqlDocs } from "../../data/api-graphql-docs";
import EndpointBlock from "../../components/developers/EndpointBlock";
import GraphQLBlock from "../../components/developers/GraphQLBlock";

export default function ApiReferencePage() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      const allIds = [
        ...apiDocs.flatMap((s) => s.endpoints.map((e) => e.id)),
        ...graphqlDocs.flatMap((s) => s.operations.map((o) => o.id)),
      ];
      let currentId = "";
      for (const id of allIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) currentId = id;
        }
      }
      if (currentId) setActiveId(currentId);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full">
      {/* Editorial Top Hero Banner */}
      <section className="bg-[#071f24] text-white py-14 px-6 sm:px-12 border-b border-teal-900/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#071f24] via-[#071f24]/95 to-[#0c3339]/80"></div>
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E05326]/15 border border-[#E05326]/30 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E05326] animate-pulse"></span>
            <span className="text-[#ff9879] text-xs font-bold font-mono tracking-[0.18em] uppercase">
              INTER-AGENCY API REFERENCE
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-white mb-4">
            Unified API <span className="text-[#E05326] italic font-editorial">Reference</span>
          </h1>

          <p className="text-teal-100/80 font-normal leading-relaxed text-base sm:text-lg max-w-3xl mb-8">
            The IACMS developer interface combines high-performance REST endpoints for authentication and webhook management
            with a comprehensive GraphQL Partner API for secure case queries and multi-jurisdictional referrals.
          </p>

          {/* Configuration Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl">
            <div className="rounded-xl border border-teal-500/20 bg-[#082329]/90 backdrop-blur p-4">
              <div className="text-[10px] font-mono uppercase text-teal-300 tracking-wider mb-1">REST BASE URL</div>
              <code className="text-xs text-white font-mono break-all">http://localhost:3000/api/v1</code>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-[#082329]/90 backdrop-blur p-4">
              <div className="text-[10px] font-mono uppercase text-teal-300 tracking-wider mb-1">GRAPHQL GATEWAY</div>
              <code className="text-xs text-white font-mono break-all">POST /api/v1/graphql</code>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-[#082329]/90 backdrop-blur p-4">
              <div className="text-[10px] font-mono uppercase text-teal-300 tracking-wider mb-1">JWT AUTH</div>
              <code className="text-xs text-teal-200/90 font-mono">Authorization: Bearer</code>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-[#082329]/90 backdrop-blur p-4">
              <div className="text-[10px] font-mono uppercase text-teal-300 tracking-wider mb-1">PARTNER API KEY</div>
              <code className="text-xs text-teal-200/90 font-mono">X-API-Key: &lt;key&gt;</code>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="flex w-full max-w-7xl mx-auto px-4 sm:px-6">
        {/* Left Sticky Navigation */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-slate-200/90 pr-6 py-10 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          {/* REST API Endpoints */}
          {apiDocs.map((section) => (
            <div key={section.id} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E05326]"></div>
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#0f3d44]">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-1">
                {section.endpoints.map((ep) => {
                  const isActive = activeId === ep.id;
                  return (
                    <li key={ep.id}>
                      <a
                        href={`#${ep.id}`}
                        className={`text-xs block py-1.5 pl-3 rounded-lg border-l-2 transition-all ${
                          isActive
                            ? "border-[#E05326] text-[#E05326] font-bold bg-orange-50/70"
                            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                        }`}
                      >
                        <span
                          className={`inline-block w-12 text-[10px] font-mono font-bold ${
                            ep.method === "GET"
                              ? "text-[#145660]"
                              : ep.method === "POST"
                              ? "text-[#E05326]"
                              : ep.method === "DELETE"
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}
                        >
                          {ep.method}
                        </span>
                        {ep.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* GraphQL Operations */}
          {graphqlDocs.map((section) => (
            <div key={section.id} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#145660]"></div>
                <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#0f3d44]">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-1">
                {section.operations.map((op) => {
                  const isActive = activeId === op.id;
                  return (
                    <li key={op.id}>
                      <a
                        href={`#${op.id}`}
                        className={`text-xs block py-1.5 pl-3 rounded-lg border-l-2 transition-all ${
                          isActive
                            ? "border-[#E05326] text-[#E05326] font-bold bg-orange-50/70"
                            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                        }`}
                      >
                        <span
                          className={`inline-block w-12 text-[10px] font-mono font-bold ${
                            op.type === "query" ? "text-[#145660]" : "text-purple-700"
                          }`}
                        >
                          {op.type === "query" ? "QUERY" : "MUTTN"}
                        </span>
                        {op.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Right Content Stream */}
        <div className="flex-1 lg:pl-12 py-10 min-w-0">
          {/* REST Sections */}
          {apiDocs.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-28 mb-16">
              <div className="mb-8">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#E05326] block mb-1">
                  REST SERVICE INTERFACE
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">{section.title}</h2>
                <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
                {section.description && (
                  <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base max-w-3xl">
                    {section.description}
                  </p>
                )}
              </div>

              <div>
                {section.endpoints.map((endpoint) => (
                  <EndpointBlock key={endpoint.id} endpoint={endpoint} />
                ))}
              </div>
            </div>
          ))}

          {/* GraphQL Sections */}
          {graphqlDocs.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-28 mb-16">
              <div className="mb-8">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#145660] block mb-1">
                  GRAPHQL PARTNER GATEWAY
                </span>
                <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">{section.title}</h2>
                <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
                {section.description && (
                  <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base max-w-3xl">
                    {section.description}
                  </p>
                )}
              </div>

              <div>
                {section.operations.map((op) => (
                  <GraphQLBlock key={op.id} operation={op} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
