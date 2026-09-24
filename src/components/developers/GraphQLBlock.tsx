import type { GqlOperation } from "../../data/api-graphql-docs";
import CodeSnippet from "./CodeSnippet";
import ResponseViewer from "./ResponseViewer";

interface GraphQLBlockProps {
  operation: GqlOperation;
}

function buildSnippets(op: GqlOperation) {
  const queryStr = op.query;
  const varsStr = JSON.stringify(op.variables, null, 2);

  const curl = `curl -X POST http://localhost:3000/api/v1/graphql \\
  -H "X-API-Key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
  "query": ${JSON.stringify(queryStr)},
  "variables": ${varsStr}
}'`;

  const js = `const response = await fetch('http://localhost:3000/api/v1/graphql', {
  method: 'POST',
  headers: {
    'X-API-Key': '<your_api_key>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: \`${queryStr}\`,
    variables: ${varsStr}
  })
});
const { data } = await response.json();`;

  const python = `import requests

query = """${queryStr}"""

response = requests.post(
    "http://localhost:3000/api/v1/graphql",
    headers={"X-API-Key": "<your_api_key>", "Content-Type": "application/json"},
    json={"query": query, "variables": ${varsStr}}
)
data = response.json()`;

  return { graphql: queryStr, curl, js, python };
}

export default function GraphQLBlock({ operation }: GraphQLBlockProps) {
  const snippets = buildSnippets(operation);
  const isQuery = operation.type === "query";

  return (
    <div id={operation.id} className="scroll-mt-28 border-t border-slate-200/90 py-14 first:border-t-0">
      <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">
        {/* Content Side */}
        <div className="flex-1 lg:max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border ${
                isQuery
                  ? "bg-teal-50 text-[#145660] border-teal-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              {operation.type.toUpperCase()}
            </span>
            <code className="text-xs sm:text-sm font-mono text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200/80">
              {operation.name}
            </code>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E05326]/10 text-[#E05326] text-[10px] font-mono font-bold border border-[#E05326]/30 uppercase tracking-wider">
              SCOPE: {operation.scope}
            </span>
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f3d44] mb-3">
            {operation.title}
          </h3>

          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            {operation.description}
          </p>

          {/* GraphQL Variables */}
          {operation.variables && Object.keys(operation.variables).length > 0 && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-[#145660] text-lg">tune</span>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#0f3d44]">
                  Variables Payload
                </h4>
              </div>
              <ul className="divide-y divide-slate-100">
                {Object.entries(operation.variables).map(([key, value]) => (
                  <li key={key} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <code className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {key}
                      </code>
                      <span className="text-[11px] font-mono text-[#145660] bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                        {typeof value === "object" ? (Array.isArray(value) ? "array" : "object") : typeof value}
                      </span>
                    </div>
                    <pre className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl p-3 overflow-x-auto leading-relaxed">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Code Side */}
        <div className="lg:w-[460px] xl:w-[540px] shrink-0">
          <div className="sticky top-28 space-y-4">
            <CodeSnippet snippets={snippets} defaultLang="graphql" />
            <ResponseViewer response={operation.response} />
          </div>
        </div>
      </div>
    </div>
  );
}
