import { Link } from "react-router-dom";
import { StubNavItem } from "@/components/StubNavItem";

const PROFILE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3a64hKMf3GCKX_IXV1C9mz_mg8HNupuA-oOKR7zH0t8sbdU7SFgymRrpA08olq-I9XKDvXhpxtryPdFYdGPuGgMw09JXx_I0ElMEC4znfBlabd69DzOwptbgynC1Pc0Xzzj57d5Xt_DsEzSIC9WrY5j16omnf_kYbAH0HJ5geopy13qIBOTPOWvJscS8-dSr166pzi9MkQZ8eM_SEUcQATKyNO7KpOMPPdHPeHINi-cigYo5oh3naWp70ofT9aTjiJEpk4YGHEEI";
const DASHBOARD_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBklXQxj2IbmLfqjsWyWT25qTbU5O-b3erTUwYeR_9rf-iLtb3UW-axXNat4qNn9_UjAM6bVf9fnIpwsmWIsVSHvtM-bqclJyNE7puTKpxV9TDXDtkym7iNxmqFiSEfCxnXioAutbEY_RiPpLJI12b86u1PQLa--eD0Y5xrDjHD20CCOTRRywohaSt09pog0VHEbz48MORGj6rt8V_SJO8QdfP6elR_knJnfFqtqXjD4wXxY9RHgSuz9xy6Hu17wKXjszrETmLQYIs";
const COLLAB_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC95coD5tpeetwQa0fE8zxN_4A4vta4rJ5V6JmqZppqkY1ngeP5zGg0YcHCsrPj05rf54nj5AVD2kE2MBUyuz-BxDHihHKuow3Ndnc-hDrx8x0iBNx7uKxd9GZpXX8MgzRv6WhRlqpwna0Y6oTl4peqMcgJF7zwVQeOXRPvkTlnHWhU-CuwafMSOy1-a84yU6YMadb8BfBorFygbyZXKxQEMK5cAKEEuAuOFUOKRoRBXlSOZgsThTs2-6MvC1k5IJyr2OeKLCyzNGA";
const SECURITY_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAW-dfOeqoin-W_ZoniJlYHW62dXz28EbnYhxOeKWC_ZV6OCGXjVe6bPebDAZKVP19Bh_3HC9wEKWv3wBFJonqC8B5pG9ZESlpNi6oUdTTNLdA16wpcmHqRkozjHdqA8KokjBONXDuEIt3aUVJTTn6wHomGdcmym8N-BYglt4XOvJe-uvKtv7bIJ-_7MAJ9utSDziaZtgHgMpEQ64eIOgHahylioNJpI3dBB5AngeitjTCB4xZZJ8XSnmdCZifAmk5R_oAeR_5OrK0";

export default function HomePage() {
  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50">
        <div className="flex items-center gap-gutter">
          <Link to="/" className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-50 font-h1">
            IACMS
          </Link>
          <nav className="hidden md:flex gap-lg items-center">
            <Link
              to="/dashboard"
              className="text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 font-body-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/cases"
              className="text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 font-body-sm font-medium transition-colors"
            >
              Cases
            </Link>
            <Link
              to="/agencies"
              className="text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 font-body-sm font-medium transition-colors"
            >
              Agencies
            </Link>
            <StubNavItem className="text-slate-600 dark:text-slate-400 font-body-sm font-medium">
              Reports
            </StubNavItem>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative hidden sm:block">
            <input
              className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-1.5 text-body-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              placeholder="Search resources..."
              type="text"
            />
          </div>
          <button
            type="button"
            className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-full"
            aria-label="Notifications"
          >
            notifications
          </button>
          <Link
            to="/register-organization"
            className="hidden md:inline-flex text-body-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300"
          >
            New organization
          </Link>
          <Link
            to="/login"
            className="hidden sm:inline-flex text-body-sm font-medium text-primary-container hover:underline"
          >
            Sign in
          </Link>
          <button
            type="button"
            className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-full"
            aria-label="Help"
          >
            help_outline
          </button>
          <Link
            to="/login"
            className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold border border-outline overflow-hidden"
          >
            <img alt="" className="rounded-full object-cover h-full w-full" src={PROFILE_IMG} />
          </Link>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative bg-primary-container text-white overflow-hidden py-2xl lg:py-[120px]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-fixed via-primary-container to-primary-container" />
          </div>
          <div className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-xl">
            <div className="md:w-3/5">
              <span className="inline-block bg-primary-fixed text-on-primary-fixed font-label-caps text-xs px-3 py-1 rounded-full mb-md">
                OFFICIAL INTER-AGENCY PORTAL
              </span>
              <h1 className="font-h1 text-[2.5rem] md:text-[3.5rem] leading-[1.1] mb-lg text-primary-fixed">
                Inter-Agency Case Management System
              </h1>
              <p className="font-body-lg text-on-primary-container max-w-xl mb-xl opacity-90">
                Secure, transparent, and efficient multi-tenant management for government agencies.
                IACMS bridges the gap between silos with institutional-grade technology.
              </p>
              <div className="flex flex-wrap gap-md">
                <Link
                  to="/register"
                  className="bg-primary-fixed text-on-primary-fixed px-lg py-md rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-sm"
                >
                  Request Agency Access
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  aria-disabled="true"
                  className="border border-on-primary-container text-on-primary-container px-lg py-md rounded-lg font-semibold opacity-75 cursor-not-allowed"
                >
                  View Documentation
                </button>
              </div>
            </div>
            <div className="md:w-2/5 mt-xl md:mt-0">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-gutter rounded-xl shadow-2xl">
                <img alt="Dashboard preview" className="rounded-lg shadow-inner w-full" src={DASHBOARD_IMG} />
                <div className="mt-md flex justify-between items-center text-xs text-on-primary-container/70 font-system-id">
                  <span>SESSION_ID: GCMS-772-901</span>
                  <span>VERIFIED ENCRYPTION: AES-256</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-2xl bg-surface">
          <div className="container mx-auto px-6">
            <div className="mb-xl text-center max-w-2xl mx-auto">
              <h2 className="font-h2 text-primary mb-sm">Unifying Public Sector Operations</h2>
              <p className="text-secondary font-body-md">
                Engineered for high-stakes coordination across diverse regulatory frameworks and
                jurisdictional boundaries.
              </p>
            </div>
            <div className="bento-grid">
              <div className="col-span-12 md:col-span-8 bg-white border border-slate-200 p-lg rounded-xl hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-lg h-full">
                  <div className="flex-1">
                    <span className="material-symbols-outlined text-primary-container text-4xl mb-md">
                      groups_3
                    </span>
                    <h3 className="font-h3 text-primary mb-sm">Multi-Agency Collaboration</h3>
                    <p className="text-secondary font-body-md mb-md">
                      Securely share sensitive case files across departments while maintaining strict
                      &quot;need-to-know&quot; access parameters. IACMS eliminates friction in
                      inter-departmental communication.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-sm text-body-sm text-secondary">
                        <span className="material-symbols-outlined text-primary-container text-sm">
                          check_circle
                        </span>
                        Cross-jurisdictional data mapping
                      </li>
                      <li className="flex items-center gap-sm text-body-sm text-secondary">
                        <span className="material-symbols-outlined text-primary-container text-sm">
                          check_circle
                        </span>
                        Shared task assignment & tracking
                      </li>
                    </ul>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 min-h-[200px]">
                    <img alt="Collaboration" className="w-full h-full object-cover min-h-[200px]" src={COLLAB_IMG} />
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 bg-primary-container text-white p-lg rounded-xl">
                <span className="material-symbols-outlined text-primary-fixed text-4xl mb-md">automation</span>
                <h3 className="font-h3 mb-sm">End-to-End Workflow Automation</h3>
                <p className="text-on-primary-container font-body-md mb-lg">
                  Reduce administrative overhead by automating routine routing, compliance checks, and
                  status notifications based on agency-specific triggers.
                </p>
                <div className="bg-white/10 rounded-lg p-md border border-white/5 font-system-id text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>IF case_priority == &apos;high&apos;</span>
                    <span className="text-primary-fixed">LOGGED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>THEN notify_agency(OIG)</span>
                    <span className="text-primary-fixed">SENT</span>
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 bg-white border border-slate-200 p-lg rounded-xl">
                <span className="material-symbols-outlined text-primary-container text-4xl mb-md">history_edu</span>
                <h3 className="font-h3 text-primary mb-sm">Immutable Audit Trails</h3>
                <p className="text-secondary font-body-md">
                  Every interaction, modification, and access attempt is recorded in a
                  cryptographically secured log that meets federal oversight requirements.
                </p>
              </div>
              <div className="col-span-12 md:col-span-8 bg-slate-100 border border-slate-200 p-lg rounded-xl flex items-center">
                <div className="flex-1">
                  <h3 className="font-h3 text-primary mb-sm">Inter-Agency Division Data Feed</h3>
                  <p className="text-secondary font-body-md mb-md">
                    Real-time oversight dashboard for senior personnel and legislative monitors.
                  </p>
                  <div className="flex gap-md">
                    <div className="bg-white p-md rounded border border-slate-200 flex-1">
                      <div className="text-label-caps text-slate-500 mb-xs">ACTIVE_NODES</div>
                      <div className="text-h2 text-primary-container">482</div>
                    </div>
                    <div className="bg-white p-md rounded border border-slate-200 flex-1">
                      <div className="text-label-caps text-slate-500 mb-xs">DAILY_TRAILS</div>
                      <div className="text-h2 text-primary-container">12.4k</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-2xl bg-white border-y border-slate-200">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-2xl">
              <div className="lg:w-1/2">
                <span className="text-primary-container font-label-caps tracking-widest block mb-sm">
                  SYSTEM ARCHITECTURE
                </span>
                <h2 className="font-h1 text-primary mb-lg">Hardened Security for National Sensitivity</h2>
                <div className="space-y-lg">
                  <div className="flex gap-md">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed/30 text-primary-container rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        security
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-lg text-primary mb-xs">FIPS-compliant encryption</h4>
                      <p className="text-secondary font-body-sm">
                        Data at rest and in transit are protected using FIPS 140-2 Level 3 validated
                        encryption modules, ensuring top-secret level protection for all digital assets.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-md">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed/30 text-primary-container rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        manage_accounts
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-lg text-primary mb-xs">RBAC control</h4>
                      <p className="text-secondary font-body-sm">
                        Granular Role-Based Access Control allows system administrators to define
                        permissions down to the individual field level within a single case record.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-md">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed/30 text-primary-container rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        visibility
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-lg text-primary mb-xs">Automated Oversight</h4>
                      <p className="text-secondary font-body-sm">
                        Integrated monitoring tools flag anomalous behaviors and potential compliance
                        violations in real-time, notifying the Office of the Inspector General
                        automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-fixed to-teal-100 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                  <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <img alt="Security operations" className="w-full h-auto" src={SECURITY_IMG} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-2xl bg-surface-container-low text-center">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="font-h1 text-primary mb-md">Ready to Modernize Your Agency&apos;s Workflow?</h2>
            <p className="text-secondary font-body-lg mb-xl">
              Join 24+ federal and state agencies already using IACMS to streamline their complex case
              management needs.
            </p>
            <div className="flex justify-center gap-md flex-wrap">
              <Link
                to="/register"
                className="bg-primary-container text-white px-xl py-md rounded-lg font-bold hover:bg-primary transition-all"
              >
                Request Agency Access
              </Link>
              <button
                type="button"
                disabled
                title="Coming soon"
                aria-disabled="true"
                className="bg-white border border-outline text-primary-container px-xl py-md rounded-lg font-bold opacity-75 cursor-not-allowed"
              >
                Contact Security Team
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-6 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center w-full gap-lg">
          <div className="flex flex-col md:flex-row items-center gap-md">
            <span className="text-teal-900 dark:text-teal-50 font-semibold font-h3 text-lg">IACMS</span>
            <p className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              © 2024 Government Case Management System. Official Use Only.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-lg items-center">
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              Privacy Policy
            </StubNavItem>
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              Terms of Service
            </StubNavItem>
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              Accessibility
            </StubNavItem>
            <Link
              to="/login"
              className="text-xs font-normal Inter text-slate-500 dark:text-slate-400 hover:text-teal-600 hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
        <div className="container mx-auto mt-lg pt-md border-t border-slate-100 flex justify-center">
          <div className="flex items-center gap-sm opacity-60">
            <span className="material-symbols-outlined text-sm">account_balance</span>
            <span className="text-[10px] font-system-id text-slate-400">
              AUTHORIZED ACCESS ONLY. FEDERAL DISCLOSURE REQ 204.B APPLIES.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
