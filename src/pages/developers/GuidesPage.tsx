import GuideStep from "../../components/developers/GuideStep";

export default function GuidesPage() {
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
              STEP-BY-STEP INTEGRATION
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-white mb-4">
            Developer <span className="text-[#E05326] italic font-editorial">Guides</span>
          </h1>

          <p className="text-teal-100/80 font-normal leading-relaxed text-base sm:text-lg max-w-3xl">
            Learn how to authenticate agency services, mint scoped partner API keys, execute GraphQL queries across
            workflow stages, and listen to real-time case events.
          </p>
        </div>
      </section>

      {/* Main Guides Stream */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Guide 1: Getting Started */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            FOUNDATION
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Getting Started</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            The IACMS API employs a two-tier authentication architecture: authenticate via REST with tenant credentials to
            obtain a session token, then generate long-lived, scoped API keys for programmatic GraphQL Partner Gateway access.
          </p>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm mb-12">
            <h3 className="text-xs font-mono font-bold tracking-widest text-[#0f3d44] uppercase mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E05326] text-base">alt_route</span>
              INTEGRATION ARCHITECTURE LIFECYCLE
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="text-[10px] font-mono font-bold text-[#E05326] mb-1">STEP 01</div>
                <div className="text-sm font-semibold text-slate-900">Authenticate</div>
                <div className="text-xs font-mono text-slate-500 mt-1">POST /api/v1/auth/login</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="text-[10px] font-mono font-bold text-[#145660] mb-1">STEP 02</div>
                <div className="text-sm font-semibold text-slate-900">Create API Key</div>
                <div className="text-xs font-mono text-slate-500 mt-1">POST /api/v1/api-keys</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="text-[10px] font-mono font-bold text-emerald-600 mb-1">STEP 03</div>
                <div className="text-sm font-semibold text-slate-900">Query GraphQL</div>
                <div className="text-xs font-mono text-slate-500 mt-1">POST /api/v1/graphql</div>
              </div>
            </div>
          </div>
        </section>

        {/* Guide 2: Authentication Flow */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            SECURITY PROTOCOL
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Authentication Flow</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            Access starts by authenticating with email, password, and tenant code to receive a signed JWT access token.
          </p>

          <GuideStep
            step={1}
            title="Log in to obtain a JWT access token"
            code={`curl -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@dcs-01.gov.example",
    "password": "password123",
    "tenantCode": "DCS-01"
  }'`}
            language="bash"
          >
            <p>
              Send an HTTP POST request with your agency credentials. You will receive an <code>accessToken</code> (valid for
              1 hour) and a long-lived <code>refreshToken</code>.
            </p>
          </GuideStep>

          <GuideStep step={2} title="Store credentials securely in secrets management">
            <p>
              Inject the <strong>access token</strong> into the <code>Authorization: Bearer &lt;token&gt;</code> header for all subsequent
              REST management requests. Never expose JWT tokens in client-side bundles or public repositories.
            </p>
          </GuideStep>

          <GuideStep
            step={3}
            title="Exchange refresh token on expiry"
            code={`curl -X POST http://localhost:3000/api/v1/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{ "refreshToken": "d2VibWFrZXIucmVmcmVzaC50b2tlbi..." }'`}
            language="bash"
          >
            <p>
              When your access token expires (HTTP 401 with <code>AUTH_TOKEN_EXPIRED</code>), exchange your refresh token for a
              new access token without prompting for user credentials.
            </p>
          </GuideStep>
        </section>

        {/* Guide 3: Creating API Keys */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
            PARTNER ACCESS
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Creating &amp; Managing API Keys</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            API keys grant headless, programmatic access to the GraphQL Partner API. Each key is tightly bound to a tenant
            and permission scopes.
          </p>

          <GuideStep
            step={1}
            title="Create an API key with explicit permission scopes"
            code={`curl -X POST http://localhost:3000/api/v1/api-keys \\
  -H "Authorization: Bearer <your_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Police Records Interop Gateway",
    "scopes": [
      "cases:read",
      "cases:create",
      "workflows:read",
      "referrals:read"
    ]
  }'`}
            language="bash"
          >
            <p>
              Specify the exact scopes your service needs. Available scopes include:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "cases:read",
                "cases:create",
                "cases:update",
                "workflows:read",
                "workflowSteps:read",
                "referrals:read",
                "referrals:create",
                "assignments:read",
                "auditLogs:read",
                "departments:read",
                "metrics:read",
              ].map((s) => (
                <code key={s} className="text-xs font-mono bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                  {s}
                </code>
              ))}
            </div>
          </GuideStep>

          <GuideStep step={2} title="Record the secret key immediately">
              <p className="text-xs sm:text-sm text-amber-900 font-medium flex items-start gap-1.5">
                <span className="material-symbols-outlined text-amber-700 text-base shrink-0 mt-0.5">warning</span>
                <span>
                  The raw API key secret (e.g. <code>iacms_live_xK7mN...</code>) is returned only once in the HTTP response. Store
                  it in an environment variable or secrets manager. It cannot be recovered later.
                </span>
              </p>
          </GuideStep>

          <GuideStep
            step={3}
            title="Authenticate GraphQL operations with X-API-Key"
            code={`curl -X POST http://localhost:3000/api/v1/graphql \\
  -H "X-API-Key: iacms_live_xK7mN9pQ2rS4tU6vW8xY0zA..." \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "{ metrics { totalCases openCases } }" }'`}
            language="bash"
          >
            <p>
              Include the token in the <code>X-API-Key</code> request header. The gateway validates both the cryptographic hash
              and the required scope directive (<code>@requireScope</code>) before query execution.
            </p>
          </GuideStep>
        </section>

        {/* Guide 4: Making Your First GraphQL Query */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            DATA RETRIEVAL
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Making Your First GraphQL Query</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            Querying with GraphQL ensures your agency database requests only the specific fields it needs, minimizing network
            overhead and eliminating manual schema adjustments.
          </p>

          <GuideStep
            step={1}
            title="Compose your query document"
            code={`query GetActiveIntakeCases {
  cases(filter: { status: "open" }, pagination: { limit: 5 }) {
    data {
      id
      caseNumber
      title
      priority
      currentStep { name key }
      originatingDepartment { name code }
    }
    pagination { total hasMore }
  }
}`}
            language="graphql"
          >
            <p>
              Request fields like <code>caseNumber</code>, <code>currentStep</code>, and <code>originatingDepartment</code> to
              display a synchronized case list in your agency&apos;s internal software.
            </p>
          </GuideStep>

          <GuideStep
            step={2}
            title="Send the request via HTTP POST in Node.js"
            code={`const response = await fetch("http://localhost:3000/api/v1/graphql", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.IACMS_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    query: \`query GetActiveIntakeCases {
      cases(filter: { status: "open" }, pagination: { limit: 5 }) {
        data { id caseNumber title priority }
        pagination { total hasMore }
      }
    }\`
  })
});

const { data } = await response.json();
console.log("Synchronized cases:", data.cases.data);`}
            language="javascript"
          >
            <p>
              The payload must be a JSON object containing a <code>query</code> string and an optional <code>variables</code> object.
            </p>
          </GuideStep>
        </section>

        {/* Guide 5: Best Practices */}
        <section className="mb-12">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
            STANDARDS &amp; GOVERNANCE
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Rate Limits &amp; Best Practices</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            To preserve high availability across all participating public sector agencies, the GraphQL Partner Gateway enforces
            rate limits and query complexity analysis.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold font-serif text-[#0f3d44]">1,000 req/min</div>
              <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">Per API Key Limit</div>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold font-serif text-[#0f3d44]">Depth 10</div>
              <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">Max AST Query Depth</div>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold font-serif text-[#0f3d44]">100 Items</div>
              <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">Max Pagination Limit</div>
            </div>
          </div>

          <div className="rounded-2xl border-l-4 border-l-[#145660] border border-slate-200/90 bg-teal-50/50 p-6">
            <h3 className="text-xs font-mono font-bold text-[#0f3d44] uppercase tracking-widest mb-3">
              RECOMMENDED INTEGRATION PATTERNS
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#145660] text-sm mt-0.5">check_circle</span>
                <span><strong>Principle of Least Privilege:</strong> Issue separate API keys with minimal scopes for each consuming system.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#145660] text-sm mt-0.5">check_circle</span>
                <span><strong>Bounded Pagination:</strong> Always supply a <code>limit</code> and <code>offset</code> to avoid unbounded collection traversals.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#145660] text-sm mt-0.5">check_circle</span>
                <span><strong>Backoff Retry:</strong> On HTTP 429 status codes, implement exponential backoff with jitter before retrying.</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
