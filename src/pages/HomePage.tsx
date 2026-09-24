import { useState } from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const agencyTabs = [
    {
      id: "admin-welfare",
      title: "Public Administration & Social Welfare",
      shortName: "Civil Administration & Welfare",
      icon: "account_balance",
      badge: "GOV-CIVIL",
      description:
        "Frontline public services, citizen case intake, vulnerability assessments, and coordinated community support programs.",
      subAgencies: [
        { name: "Public Intake & Triage Desk", code: "INTAKE-01", role: "Citizen Inquiries & Priority Screening" },
        { name: "Case Assessment & Welfare Unit", code: "CASE-MGMT", role: "Long-term Assessment & Care Planning" },
        { name: "Inter-Departmental Referral Desk", code: "REF-DESK", role: "Cross-Agency Handover & Tracking" },
        { name: "Field Support & Inspection Services", code: "FIELD-OPS", role: "On-site Inquiries & Welfare Verifications" },
      ],
      telemetry: "Real-time case dossiers synchronized across civil bureaus, regulatory bodies, and legal registries.",
    },
    {
      id: "law-enforcement",
      title: "Law Enforcement & Public Safety",
      shortName: "Law Enforcement & Safety",
      icon: "local_police",
      badge: "JUSTICE-OPS",
      description:
        "Confidential incident logging, evidentiary case dossiers, inter-jurisdictional inquiries, and formal execution of official warrants.",
      subAgencies: [
        { name: "Incident Desk & Dispatch Unit", code: "INCIDENT-LOG", role: "Emergency Incident & Complaint Intake" },
        { name: "Special Investigations Unit", code: "SIU-DESK", role: "Evidence Collection & Case File Dossiers" },
        { name: "Warrants & Orders Execution Desk", code: "ORDERS-EXEC", role: "Court Order & Restraining Order Service" },
      ],
      telemetry: "Encrypted chain-of-custody tracking, tamper-evident digital evidence, and immediate referral pipelines.",
    },
    {
      id: "judiciary",
      title: "Judicial Bodies & Court Registries",
      shortName: "Judicial & Court Registries",
      icon: "gavel",
      badge: "COURT-REG",
      description:
        "Centralized electronic docket management, formal hearing review procedures, judicial directives, and discovery disclosures.",
      subAgencies: [
        { name: "Central Court File Registry", code: "DOCKET-REG", role: "Electronic Case Filing & Records Indexing" },
        { name: "Hearing & Review Chambers", code: "HEAR-CHAMBERS", role: "Magistrate Bench Orders & Legal Findings" },
        { name: "Dispute Mediation & Arbitration", code: "MEDIATION", role: "Alternative Conflict Resolution Workspaces" },
      ],
      telemetry: "Automated court calendar notifications, hearing outcome sync, and digital order dispatch across partner agencies.",
    },
    {
      id: "regulatory",
      title: "Regulatory Oversight & Inspectors General",
      shortName: "Regulatory Oversight & OIG",
      icon: "policy",
      badge: "OVERSIGHT-SEC",
      description:
        "Institutional compliance monitoring, administrative inquiries, whistleblower case workflows, and independent audits.",
      subAgencies: [
        { name: "Complaints & Whistleblower Desk", code: "INTAKE-OIG", role: "Confidential Grievance & Tip Processing" },
        { name: "Audit & Institutional Review Unit", code: "AUDIT-UNIT", role: "Procedural Compliance & Governance Audits" },
        { name: "Policy Enforcement Desk", code: "POLICY-ENF", role: "Sanctions, Recommendations & Follow-up" },
      ],
      telemetry: "Zero-leakage case isolation, privileged audit trails, and multi-tenant firewall enforcement.",
    },
    {
      id: "emergency-care",
      title: "Public Health & Emergency Social Services",
      shortName: "Public Health & Emergency Support",
      icon: "health_and_safety",
      badge: "HEALTH-CIVIC",
      description:
        "Emergency social assessments, crisis intervention, vulnerable population triage, and continuity-of-care handovers.",
      subAgencies: [
        { name: "Emergency Social Intervention Desk", code: "EMERG-DESK", role: "Crisis Triage & Immediate Protective Care" },
        { name: "Clinical Case Liaison Unit", code: "CLINICAL-LIAISON", role: "Inter-Agency Health & Social Assessments" },
        { name: "Continuity & Reintegration Desk", code: "CARE-CONTINUITY", role: "Long-term Multi-Agency Support Plans" },
      ],
      telemetry: "Strict data privacy boundaries with authorized case sharing across civic and health institutions.",
    },
  ];

  return (
    <div className="font-sans bg-[#f8f9fa] text-[#191c1d] antialiased selection:bg-[#145660] selection:text-white min-h-screen">
      {/* 1. Top Navigation Bar (Compact h-16 standard with dashboard-aligned styling) */}
      <header className="bg-[#0b282d]/95 backdrop-blur-md border-b border-teal-900/60 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <Link className="flex items-center gap-2.5 group" to="/">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#145660] to-[#0a2327] border border-teal-500/30 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-teal-300 text-xl">shield_lock</span>
            </div>
            <span className="font-serif text-2xl font-bold text-white tracking-wider">IACMS</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium tracking-wide">
            <Link className="text-white border-b-2 border-teal-400 pb-0.5 font-semibold transition-colors" to="/">
              Home
            </Link>
            <a className="text-slate-300 hover:text-white transition-colors" href="#about">
              About
            </a>
            <a className="text-slate-300 hover:text-white transition-colors" href="#solutions">
              Capabilities
            </a>
            <a className="text-slate-300 hover:text-white transition-colors" href="#who-we-serve">
              Agencies
            </a>
            <a className="text-slate-300 hover:text-white transition-colors" href="#architecture">
              Architecture
            </a>
            <Link className="text-teal-300 hover:text-white transition-colors flex items-center gap-1.5" to="/developers/api">
              <span>Developer API</span>
              <span className="text-[9px] bg-teal-800/80 px-1.5 py-0.2 rounded text-teal-200 uppercase font-mono">Docs</span>
            </Link>
          </nav>

          {/* Header Action: Compact & Dashboard-Aligned */}
          <div className="flex items-center gap-2.5">
            <Link
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#145660] hover:bg-[#003e46] text-white text-xs font-medium border border-teal-500/40 shadow-sm transition-all"
              to="/login"
            >
              <span className="material-symbols-outlined text-[17px] text-teal-300">login</span>
              <span>Agency Portal</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative bg-[#071f24] text-white pt-16 md:pt-20 pb-28 overflow-hidden border-b border-teal-900/40">
          {/* Background overlay */}
          <div className="absolute inset-0 z-0">
            <img
              alt="Inter-Agency Operations"
              className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity filter contrast-125"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVi6VBpfjKHA4-bENZ1pn-xrZKWJPAbsyuJVA2MYYEsgULTVjgnRO3-SUBEeXQtZvwbCoz2K0KnY2_ueDmKV5_WC9niV_FsyH1lrh8k0xHuTsYFlynPc9EQV-Bv3EEG8mo2YawGYY9qzarcDNEDxSi68xe5dsv2DF_adQhQqInmTJh7oJUJg-TQTWDsqIhH0pi0BTreJxya2NeCA4BMfFa-tlwjz0aXdadGSvaEJ8"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071f24] via-[#071f24]/90 to-[#071f24]/75"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#071f24] via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="max-w-3xl">
              {/* Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[4.15rem] leading-[1.08] font-normal tracking-[-0.01em] text-white mb-6">
                Unified Case Governance,<br />
                <span className="font-sans font-bold text-white">Across All Agencies.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-teal-100/85 font-normal leading-relaxed mb-8 max-w-2xl">
                A multi-tenant case management and referral platform engineered to streamline cross-jurisdictional workflows,
                eliminate operational silos, and deliver accountable public sector coordination.
              </p>

              {/* CTA Buttons (Dashboard-aligned colors, zero emojis) */}
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#145660] hover:bg-[#003e46] text-white font-medium text-sm border border-teal-400/30 shadow-md transition-all hover:translate-y-[-1px]"
                  to="/login"
                >
                  <span className="material-symbols-outlined text-lg text-teal-300">login</span>
                  <span>Sign In to Agency Portal</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-teal-300/30 hover:border-teal-300/60 bg-teal-950/40 text-teal-100 font-medium text-sm transition-all hover:bg-teal-950/70"
                  to="/developers/api"
                >
                  <span className="material-symbols-outlined text-lg">api</span>
                  <span>Partner API Reference</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Overlapping Bento Cards Container */}
          <div className="relative z-20 max-w-7xl mx-auto px-6 mt-16 lg:mt-20" id="solutions">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200/90 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-7">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono tracking-widest text-[#145660] font-semibold uppercase">
                    Core Platform Capabilities
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs text-slate-500 font-medium">Inter-Agency Case Orchestration</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono hidden sm:flex">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>ENTERPRISE ARCHITECTURE • KAFKA STREAMING • ZERO-TRUST ISOLATION</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <div className="group p-2">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-[#145660] mb-4 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      account_tree
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#0f3d44] mb-2 group-hover:text-[#145660] transition-colors">
                    Automated Workflow Engine
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Custom stage-gate transitions from initial intake and evaluation through multi-tier approvals and formal resolution,
                    enforcing mandatory role authorizations, compliance checklists, and SLA resolution timers.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="group p-2 md:border-l md:border-slate-200 md:pl-8">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-[#145660] mb-4 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">sync_alt</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#0f3d44] mb-2 group-hover:text-[#145660] transition-colors">
                    Cross-Agency Referral Pipelines
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Instant, bi-directional case forwarding between institutional departments and external oversight bodies
                    with status handshakes, escalation deadlines, and continuous progress visibility.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="group p-2 md:border-l md:border-slate-200 md:pl-8">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300/70 flex items-center justify-center text-slate-800 mb-4 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#0f3d44] mb-2 group-hover:text-slate-900 transition-colors">
                    Immutable Audit &amp; Isolation
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Strict multi-tenant database partitioning and cryptographic audit logging recording every case inspection,
                    stage progression, document attachment, and inter-agency referral decision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Defining Excellence in Case Governance Section */}
        <section className="py-20 bg-white overflow-hidden" id="about">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Side: Editorial Layout with Typographic Watermark & Photo */}
              <div className="lg:col-span-6 relative">
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-100">
                  {/* Typographic background watermark */}
                  <div className="absolute -top-12 -left-8 text-slate-900/10 font-serif font-black watermark-text select-none z-0">
                    JUSTICE
                  </div>
                  {/* Editorial Photography */}
                  <img
                    alt="Agency case officers reviewing dossiers"
                    className="relative z-10 w-full h-[440px] object-cover object-center"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHIKvcqwblsAzZxsEQOTHFOwclA4OJrxl1HNTTQMijUT7cRoW_Wy62AzA4LJI03JaC9Rg5CXSB9zIluyp6qI2Onwq8qeq85RR5PrGAk5xjBIjx7eSmrlq_dTcMZRLXypfSdumtKRL7X-FzdgWahBkYerKSJReX2XEPHgSSyICd47dROMXv4cciQTDUZl8cPTcbAZiYYHvtCXNal3AojoxmaACIMKPfdz07T_xLk3E"
                  />
                  {/* Bottom badge overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#0b282d]/90 backdrop-blur-md border border-teal-500/20 p-3.5 rounded-xl flex items-center justify-between text-white">
                    <div>
                      <p className="text-[11px] uppercase font-mono tracking-wider text-teal-300">INTER-AGENCY DOSSIER</p>
                      <p className="text-sm font-semibold">Live Case Synchronization Across Partner Sectors</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-teal-600 text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Editorial Content */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase">
                    ABOUT THE IACMS PLATFORM
                  </span>
                  <div className="w-10 h-0.5 bg-teal-600"></div>
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl leading-[1.18] text-[#0f3d44]">
                  Defining Excellence in Inter-Agency Governance
                </h2>

                <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base">
                  When complex cases span multiple jurisdictions and regulatory boundaries, institutional partners must coordinate
                  without friction. IACMS eliminates paper-based bottlenecks and disjointed communication by connecting public sector
                  departments, regulatory oversight bodies, law enforcement, and judicial registries on a single secure system.
                </p>

                <p className="text-slate-600 font-normal leading-relaxed text-sm">
                  From initial intake and evidence collation to inter-agency escalation and final resolution, IACMS provides complete
                  accountability, maintaining verifiable chain of custody, departmental data boundaries, and strict statutory compliance.
                </p>

                <div className="p-4 sm:p-5 rounded-xl bg-teal-50/70 border-l-4 border-[#145660] text-[#0f3d44]">
                  <p className="font-serif italic text-sm sm:text-base font-medium">
                    &ldquo;IACMS unites public sector departments and oversight authorities on a single trusted platform, replacing
                    fragmented communication with auditable, high-velocity case workflows.&rdquo;
                  </p>
                  <div className="mt-2 text-xs font-mono tracking-wider text-[#145660] font-semibold uppercase">
                    — Office of Systems Standards &amp; Interoperability
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Who We Serve Accordion/Tabs */}
        <section className="py-20 bg-[#f8f9fa] border-t border-slate-200" id="who-we-serve">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
                INSTITUTIONAL DOMAINS
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#0f3d44] font-normal mb-3">
                Tailored Workspaces for Every Public Sector Pillar
              </h2>
              <div className="w-10 h-0.5 bg-teal-600 mb-3"></div>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                IACMS provides dedicated department workspaces engineered to respect the statutory mandates, confidentiality rules,
                and operating procedures of diverse public organizations.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Interactive Left List */}
              <div className="lg:col-span-6 space-y-3.5">
                {agencyTabs.map((tab, idx) => {
                  const isActive = activeTab === idx;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTab(idx)}
                      className={`cursor-pointer rounded-xl border transition-all ${
                        isActive
                          ? "bg-white border-slate-200 shadow-md p-5 border-l-4 border-l-teal-600"
                          : "bg-white border-slate-200 p-4 hover:border-slate-300 shadow-sm flex items-center justify-between group"
                      }`}
                    >
                      {isActive ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-teal-700 text-2xl">{tab.icon}</span>
                              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0f3d44]">{tab.title}</h3>
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#145660] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                              {tab.badge}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 mb-4">{tab.description}</p>
                          <div className="space-y-2">
                            {tab.subAgencies.map((sub, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="material-symbols-outlined text-[#145660] text-lg">account_tree</span>
                                  <div>
                                    <div className="text-xs sm:text-sm font-semibold text-slate-800">{sub.name}</div>
                                    <div className="text-[11px] text-slate-500">{sub.role}</div>
                                  </div>
                                </div>
                                <span className="text-xs font-mono text-slate-600 font-semibold">{sub.code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-[#0f3d44] transition-colors">
                              {tab.icon}
                            </span>
                            <div>
                              <h4 className="font-serif text-lg font-bold text-slate-700 group-hover:text-[#0f3d44] transition-colors">
                                {tab.shortName}
                              </h4>
                              <p className="text-xs text-slate-500">{tab.description.slice(0, 75)}...</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">
                            chevron_right
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Side Companion Media */}
              <div className="lg:col-span-6">
                <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
                  <img
                    alt="Operations Monitoring"
                    className="w-full h-[450px] object-cover object-right opacity-85"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVi6VBpfjKHA4-bENZ1pn-xrZKWJPAbsyuJVA2MYYEsgULTVjgnRO3-SUBEeXQtZvwbCoz2K0KnY2_ueDmKV5_WC9niV_FsyH1lrh8k0xHuTsYFlynPc9EQV-Bv3EEG8mo2YawGYY9qzarcDNEDxSi68xe5dsv2DF_adQhQqInmTJh7oJUJg-TQTWDsqIhH0pi0BTreJxya2NeCA4BMfFa-tlwjz0aXdadGSvaEJ8"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-[#082329]/95 backdrop-blur-md border border-teal-500/20 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {agencyTabs[activeTab].badge} ACTIVE
                      </span>
                      <span className="text-xs text-slate-400 font-mono">SECURE INTERFACE</span>
                    </div>
                    <p className="font-serif text-lg font-semibold text-white">
                      {agencyTabs[activeTab].title}
                    </p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {agencyTabs[activeTab].telemetry}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. System Architecture & Standards */}
        <section className="py-20 bg-white border-y border-slate-200 relative" id="architecture">
          <div className="max-w-7xl mx-auto px-6">
            {/* Key Standards Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 mb-14 opacity-85">
              <div className="flex items-center gap-2 text-slate-700 font-semibold font-serif text-sm">
                <span className="material-symbols-outlined text-2xl text-teal-800">lock</span>
                <span>Zero-Trust Multi-Tenancy</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold font-serif text-sm">
                <span className="material-symbols-outlined text-2xl text-teal-800">schema</span>
                <span>Configurable Workflows</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold font-serif text-sm">
                <span className="material-symbols-outlined text-2xl text-teal-800">dataset</span>
                <span>Event-Driven Architecture</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold font-serif text-sm">
                <span className="material-symbols-outlined text-2xl text-teal-800">verified</span>
                <span>Immutable Audit Outbox</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold font-serif text-sm">
                <span className="material-symbols-outlined text-2xl text-teal-800">api</span>
                <span>GraphQL Partner Gateway</span>
              </div>
            </div>

            {/* Section Title & Subtitle */}
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
                SYSTEM ARCHITECTURE &amp; SECURITY
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#0f3d44] font-normal mb-3">
                Enterprise Reliability &amp; Data Governance
              </h2>
              <div className="w-10 h-0.5 bg-teal-600 mx-auto mb-3"></div>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                IACMS is architected for strict institutional confidentiality, resilient high-availability case processing,
                and seamless programmatic integration between agency records systems.
              </p>
            </div>

            {/* 4-Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {/* Card 1 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="h-16 flex items-center justify-center mb-3">
                    <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#145660] group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-3xl">domain</span>
                    </div>
                  </div>
                  <div className="w-8 h-0.5 bg-teal-600 mx-auto mb-3"></div>
                  <h4 className="font-serif text-base font-bold text-center text-slate-900 mb-2">
                    Zero-Trust Multi-Tenancy
                  </h4>
                  <p className="text-xs text-center text-slate-600 leading-relaxed mb-6">
                    Multi-tenant data partitioning ensuring cases, evidence, and internal notes are accessible solely by authorized department personnel.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">SPECIFICATION REF</span>
                  <span className="font-mono text-xs font-bold text-slate-700">ARCH-TENANT-ISO</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="h-16 flex items-center justify-center mb-3">
                    <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#145660] group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-3xl">bolt</span>
                    </div>
                  </div>
                  <div className="w-8 h-0.5 bg-teal-600 mx-auto mb-3"></div>
                  <h4 className="font-serif text-base font-bold text-center text-slate-900 mb-2">
                    Kafka Event Streaming
                  </h4>
                  <p className="text-xs text-center text-slate-600 leading-relaxed mb-6">
                    High-throughput event bus powering instant inter-agency notifications, referral handshakes, and async delivery pipelines.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">MESSAGE BUS</span>
                  <span className="font-mono text-xs font-bold text-slate-700">EVENT-KAFKA-SYNC</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="h-16 flex items-center justify-center mb-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-800 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-3xl">key</span>
                    </div>
                  </div>
                  <div className="w-8 h-0.5 bg-teal-600 mx-auto mb-3"></div>
                  <h4 className="font-serif text-base font-bold text-center text-slate-900 mb-2">
                    Granular Access Governance
                  </h4>
                  <p className="text-xs text-center text-slate-600 leading-relaxed mb-6">
                    Fine-grained role permissions distinguishing intake caseworkers, supervisors, investigators, reviewers, and platform administrators.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">ACCESS CONTROL</span>
                  <span className="font-mono text-xs font-bold text-slate-700">RBAC-SEC-SUITE</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="h-16 flex items-center justify-center mb-3">
                    <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#145660] group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-3xl">code</span>
                    </div>
                  </div>
                  <div className="w-8 h-0.5 bg-teal-600 mx-auto mb-3"></div>
                  <h4 className="font-serif text-base font-bold text-center text-slate-900 mb-2">
                    GraphQL Partner Gateway
                  </h4>
                  <p className="text-xs text-center text-slate-600 leading-relaxed mb-6">
                    Dedicated external integration gateway enabling authorized government databases to query cases, transitions, and metrics.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400">INTEGRATION GATEWAY</span>
                  <span className="font-mono text-xs font-bold text-slate-700">GATEWAY-GQL-PARTNER</span>
                </div>
              </div>
            </div>

            {/* Architecture Details Banner */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4">
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#145660] uppercase block mb-1">
                  INTEROPERABILITY
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#0f3d44] font-normal mb-1">Developer Tools</h3>
                <div className="w-10 h-0.5 bg-teal-600"></div>
              </div>
              <div className="lg:col-span-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <p className="text-slate-600 text-xs sm:text-sm max-w-md leading-relaxed">
                  Connect your agency&apos;s legacy records management system directly via scoped API keys, GraphQL queries,
                  and real-time event webhooks.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/developers/api"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#145660] hover:bg-[#003e46] text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
                  >
                    <span>Explore API Reference</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                  <Link
                    to="/developers/guides"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold tracking-wide transition-all hover:bg-slate-50"
                  >
                    <span>Integration Guides</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#0c3339] to-[#071f24] text-white relative overflow-hidden" id="portal">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-mono mb-5 border border-teal-500/30">
              <span>AUTHORIZED AGENCY PERSONNEL ONLY</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal mb-4">
              Ready to Coordinate Across Agency Boundaries?
            </h2>
            <p className="text-teal-100/80 text-sm sm:text-base mb-8 max-w-2xl mx-auto">
              Sign in with your department credentials to manage active cases, process inter-agency referrals,
              and review automated workflow transitions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <Link
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#145660] hover:bg-[#003e46] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:translate-y-[-1px] border border-teal-400/30"
                to="/login"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Sign In to Agency Portal</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
              <Link
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-teal-300/30 text-teal-100 hover:bg-white/5 text-sm font-medium transition-all"
                to="/developers/api"
              >
                <span className="material-symbols-outlined text-lg">api</span>
                <span>View Developer API Docs</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Institutional Footer */}
      <footer className="bg-[#06171b] text-slate-400 border-t border-teal-900/40 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Col 1: Identity */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#145660] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-lg">shield_lock</span>
                </div>
                <span className="font-serif text-2xl font-bold text-white tracking-wide">IACMS</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                The Inter-Agency Case Management System is the official platform for secure, multi-tenant case governance
                and inter-agency coordination across public sector institutions.
              </p>
            </div>

            {/* Col 2: Platform */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Platform</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/login" className="hover:text-teal-300 transition-colors">
                    Agency Portal Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/developers/api" className="hover:text-teal-300 transition-colors">
                    GraphQL Partner API
                  </Link>
                </li>
                <li>
                  <Link to="/developers/guides" className="hover:text-teal-300 transition-colors">
                    Developer Guides
                  </Link>
                </li>
                <li>
                  <Link to="/developers/webhooks" className="hover:text-teal-300 transition-colors">
                    Webhook Event Feeds
                  </Link>
                </li>
                <li>
                  <a href="#solutions" className="hover:text-teal-300 transition-colors">
                    Workflow Engine
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Sectors */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Sectors</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a href="#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Civil Administration &amp; Welfare
                  </a>
                </li>
                <li>
                  <a href="#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Law Enforcement &amp; Safety
                  </a>
                </li>
                <li>
                  <a href="#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Judicial &amp; Court Registries
                  </a>
                </li>
                <li>
                  <a href="#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Regulatory Oversight &amp; OIG
                  </a>
                </li>
                <li>
                  <a href="#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Public Health &amp; Emergency Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Architecture */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Architecture</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a href="#architecture" className="hover:text-teal-300 transition-colors">
                    Multi-Tenant Isolation
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-teal-300 transition-colors">
                    Kafka Event Streaming
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-teal-300 transition-colors">
                    Role-Based Access Control
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-teal-300 transition-colors">
                    Audit Outbox Logging
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-teal-300 transition-colors">
                    MinIO Object Storage
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Disclaimer Bar */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-teal-400">shield</span>
              <span>OFFICIAL INTER-AGENCY OPERATIONAL SYSTEM. AUTHORIZED PERSONNEL ONLY.</span>
            </div>
            <div>
              <span>&copy; {new Date().getFullYear()} Inter-Agency Case Management System (IACMS). All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
