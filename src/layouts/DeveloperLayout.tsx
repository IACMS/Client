import { Outlet, NavLink, Link } from "react-router-dom";

export default function DeveloperLayout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-white border-b-2 border-teal-400 pb-0.5 font-semibold transition-colors text-sm tracking-wide"
      : "text-slate-300 hover:text-white transition-colors text-sm tracking-wide pb-0.5 border-b-2 border-transparent";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] selection:bg-[#145660] selection:text-white flex flex-col justify-between">
      {/* 1. Top Navigation Bar (Compact h-16, matching HomePage and Dashboard) */}
      <header className="bg-[#0b282d]/95 backdrop-blur-md border-b border-teal-900/60 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <Link className="flex items-center gap-2.5 group" to="/">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#145660] to-[#0a2327] border border-teal-500/30 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-teal-300 text-xl">terminal</span>
            </div>
            <span className="font-serif text-2xl font-bold text-white tracking-wider">IACMS</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium tracking-wide">
            <Link className="text-slate-300 hover:text-white transition-colors flex items-center gap-1" to="/">
              <span className="material-symbols-outlined text-base">home</span>
              <span>Home</span>
            </Link>
            <NavLink to="/developers/api" className={navLinkClass}>
              API Reference
            </NavLink>
            <NavLink to="/developers/guides" className={navLinkClass}>
              Guides
            </NavLink>
            <NavLink to="/developers/webhooks" className={navLinkClass}>
              Webhooks
            </NavLink>
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

      {/* Main Content Area */}
      <main className="w-full flex-1">
        <Outlet />
      </main>

      {/* Institutional Footer (Matching Landing Page) */}
      <footer className="bg-[#06171b] text-slate-400 border-t border-teal-900/40 pt-16 pb-12 mt-20">
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
                The Inter-Agency Case Management System is the official platform for secure, multi-tenant case governance,
                automated workflows, and inter-agency coordination across public sector institutions.
              </p>
            </div>

            {/* Col 2: Platform */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Documentation</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/developers/api" className="hover:text-teal-300 transition-colors">
                    GraphQL Partner API
                  </Link>
                </li>
                <li>
                  <Link to="/developers/guides" className="hover:text-teal-300 transition-colors">
                    Integration Guides
                  </Link>
                </li>
                <li>
                  <Link to="/developers/webhooks" className="hover:text-teal-300 transition-colors">
                    Webhook Feeds
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-teal-300 transition-colors">
                    Agency Portal Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Agencies */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Partner Sectors</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Children Services (DCS)
                  </Link>
                </li>
                <li>
                  <Link to="/#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Police Protection Desks
                  </Link>
                </li>
                <li>
                  <Link to="/#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Family Court Registry
                  </Link>
                </li>
                <li>
                  <Link to="/#who-we-serve" className="hover:text-teal-300 transition-colors">
                    Public Hospital Social Work
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Architecture */}
            <div>
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">Security</h5>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <span className="text-slate-400">Zero-Trust Tenant Isolation</span>
                </li>
                <li>
                  <span className="text-slate-400">Kafka Event Streaming</span>
                </li>
                <li>
                  <span className="text-slate-400">Scoped API Keys (X-API-Key)</span>
                </li>
                <li>
                  <span className="text-slate-400">Immutable Audit Outbox</span>
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
