import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const WEBHOOK_EVENTS = [
  { event: "case.created", description: "Triggered whenever a new child welfare or police protection case is logged." },
  { event: "case.updated", description: "Triggered when case priority, assignee, or clinical assessment notes are updated." },
  { event: "case.transition", description: "Triggered when a case advances through a workflow stage gate (e.g. Intake to Investigation)." },
  { event: "case.closed", description: "Triggered when a case reaches its terminal resolution step with formal closure remarks." },
  { event: "case.assigned", description: "Triggered when a supervisor reassigns case primary ownership to another officer." },
  { event: "referral.created", description: "Triggered when an inter-agency referral is dispatched to an external partner tenant." },
  { event: "referral.accepted", description: "Triggered when the receiving agency formally accepts ownership of the referred matter." },
  { event: "referral.rejected", description: "Triggered when a referral is returned to the originating department with reasons." },
  { event: "referral.completed", description: "Triggered when the secondary agency completes their requested assistance action." },
  { event: "user.invited", description: "Triggered when an agency administrator invites a new caseworker or magistrate." },
];

const PAYLOAD_EXAMPLE = JSON.stringify(
  {
    id: "evt_9a1b2c3d_4e5f",
    type: "case.created",
    timestamp: "2026-09-24T12:00:00Z",
    tenantId: "tenant_dcs01",
    data: {
      id: "case_01J8A",
      caseNumber: "CAS-2026-0001",
      title: "Immediate welfare triage for Doe household",
      priority: "high",
      status: "open",
      workflowKey: "standard-case",
      originatingDepartment: {
        code: "CP-INTAKE",
        name: "Child Protection Intake Desk",
      },
      createdBy: "usr_12345",
    },
  },
  null,
  2
);

const VERIFY_CODE = `import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your agency's Express.js webhook receiver:
app.post('/webhooks/iacms-receiver', (req, res) => {
  const signature = req.headers['x-iacms-signature'];
  const isValid = verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.IACMS_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
  }

  const event = req.body;
  console.log(\`Received \${event.type} for case \${event.data.caseNumber}\`);

  // Return a 200 OK immediately to acknowledge delivery
  res.status(200).json({ received: true });
});`;

export default function WebhooksDocPage() {
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
              REAL-TIME EVENT BUS
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-white mb-4">
            Inter-Agency <span className="text-[#E05326] italic font-editorial">Webhooks</span>
          </h1>

          <p className="text-teal-100/80 font-normal leading-relaxed text-base sm:text-lg max-w-3xl">
            Stream real-time case updates, referral acceptances, and judicial orders directly into your agency database
            without polling or manual exports.
          </p>
        </div>
      </section>

      {/* Main Content Stream */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Section 1: How It Works */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            ARCHITECTURE
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">How Webhooks Work</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-8">
            When an event takes place in the case management engine (such as a case transition or emergency hospital referral),
            IACMS formats a structured JSON payload, signs it with your shared secret, and posts it directly to your registered HTTPS endpoint.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-10">
            {[
              { step: "01", title: "Action Occurs", desc: "Caseworker executes workflow step" },
              { step: "02", title: "Kafka Event", desc: "Event dispatched to event stream" },
              { step: "03", title: "Signed POST", desc: "HTTPS delivery with HMAC signature" },
              { step: "04", title: "200 Acknowledged", desc: "Receiving endpoint logs payload" },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm text-center">
                <div className="text-[10px] font-mono font-bold text-[#E05326] tracking-widest mb-1">
                  STEP {s.step}
                </div>
                <div className="text-sm font-serif font-bold text-[#0f3d44] mb-1">{s.title}</div>
                <div className="text-xs text-slate-500 leading-tight">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Event Types */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
            CATALOG
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Subscribed Event Types</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-6">
            Configure webhooks to listen to any subset of operational events across the case lifecycle.
          </p>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#0b282d] text-teal-100 font-mono text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3.5">Event Name</th>
                  <th className="px-5 py-3.5">Trigger Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WEBHOOK_EVENTS.map((evt, idx) => (
                  <tr key={evt.event} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <code className="text-xs font-mono font-bold text-[#E05326] bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded">
                        {evt.event}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 leading-relaxed">{evt.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Payload Format */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            SCHEMA
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Payload Structure</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-6">
            Every webhook delivery uses a standardized envelope format containing an event UUID, UTC timestamp,
            tenant identifier, and the domain payload.
          </p>

          <div className="rounded-2xl overflow-hidden bg-[#071f24] shadow-xl border border-teal-900/60 text-slate-100">
            <div className="px-4 py-2.5 bg-[#0b282d] border-b border-teal-900/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-teal-200/80 font-bold uppercase tracking-wider">SAMPLE JSON PAYLOAD</span>
              <span className="text-[#ff9879] bg-[#E05326]/20 border border-[#E05326]/40 px-2 py-0.5 rounded">
                case.created
              </span>
            </div>
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
                {PAYLOAD_EXAMPLE}
              </SyntaxHighlighter>
            </div>
          </div>
        </section>

        {/* Section 4: Signature Verification */}
        <section className="mb-20">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
            CRYPTOGRAPHY
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Verifying Signatures</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-6">
            To prevent spoofing or replay attacks, all requests include an <code>X-IACMS-Signature</code> header containing
            the HMAC-SHA256 signature calculated with your endpoint secret.
          </p>

          <div className="rounded-2xl overflow-hidden bg-[#071f24] shadow-xl border border-teal-900/60 text-slate-100 mb-8">
            <div className="px-4 py-2.5 bg-[#0b282d] border-b border-teal-900/60 text-[11px] font-mono text-teal-200/80 font-bold uppercase tracking-wider">
              Node.js HMAC-SHA256 Verification Sample
            </div>
            <div className="text-xs sm:text-sm font-mono overflow-x-auto bg-[#071f24]">
              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "1.25rem",
                  background: "transparent",
                  fontSize: "0.825rem",
                  lineHeight: "1.6",
                }}
              >
                {VERIFY_CODE}
              </SyntaxHighlighter>
            </div>
          </div>
        </section>

        {/* Section 5: Delivery Retry Schedule */}
        <section className="mb-12">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#E05326] uppercase block mb-1">
            RELIABILITY
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0f3d44] mb-2">Automatic Retry Schedule</h2>
          <div className="w-12 h-0.5 bg-[#E05326] mb-4"></div>
          <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base mb-6">
            If your service responds with a status code other than 2xx or times out (&gt; 30 seconds), IACMS retries using
            exponential backoff to preserve delivery guarantees during network interruptions.
          </p>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#0b282d] text-teal-100 font-mono text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-3.5">Attempt</th>
                  <th className="px-5 py-3.5">Delay Window</th>
                  <th className="px-5 py-3.5">Execution Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { attempt: "1st Retry", delay: "1 Minute", note: "Immediate failover re-delivery" },
                  { attempt: "2nd Retry", delay: "5 Minutes", note: "Second exponential increment" },
                  { attempt: "3rd Retry", delay: "30 Minutes", note: "Mid-tier recovery window" },
                  { attempt: "4th Retry", delay: "2 Hours", note: "Extended agency system maintenance" },
                  { attempt: "5th Retry", delay: "24 Hours", note: "Final delivery attempt before alert" },
                ].map((row, idx) => (
                  <tr key={row.attempt} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3.5 font-bold text-[#0f3d44]">{row.attempt}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#E05326] font-semibold">{row.delay}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
