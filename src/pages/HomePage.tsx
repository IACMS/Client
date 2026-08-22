import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StubNavItem } from "@/components/StubNavItem";

const DASHBOARD_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBklXQxj2IbmLfqjsWyWT25qTbU5O-b3erTUwYeR_9rf-iLtb3UW-axXNat4qNn9_UjAM6bVf9fnIpwsmWIsVSHvtM-bqclJyNE7puTKpxV9TDXDtkym7iNxmqFiSEfCxnXioAutbEY_RiPpLJI12b86u1PQLa--eD0Y5xrDjHD20CCOTRRywohaSt09pog0VHEbz48MORGj6rt8V_SJO8QdfP6elR_knJnfFqtqXjD4wXxY9RHgSuz9xy6Hu17wKXjszrETmLQYIs";
const COLLAB_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC95coD5tpeetwQa0fE8zxN_4A4vta4rJ5V6JmqZppqkY1ngeP5zGg0YcHCsrPj05rf54nj5AVD2kE2MBUyuz-BxDHihHKuow3Ndnc-hDrx8x0iBNx7uKxd9GZpXX8MgzRv6WhRlqpwna0Y6oTl4peqMcgJF7zwVQeOXRPvkTlnHWhU-CuwafMSOy1-a84yU6YMadb8BfBorFygbyZXKxQEMK5cAKEEuAuOFUOKRoRBXlSOZgsThTs2-6MvC1k5IJyr2OeKLCyzNGA";
const SECURITY_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAW-dfOeqoin-W_ZoniJlYHW62dXz28EbnYhxOeKWC_ZV6OCGXjVe6bPebDAZKVP19Bh_3HC9wEKWv3wBFJonqC8B5pG9ZESlpNi6oUdTTNLdA16wpcmHqRkozjHdqA8KokjBONXDuEIt3aUVJTTn6wHomGdcmym8N-BYglt4XOvJe-uvKtv7bIJ-_7MAJ9utSDziaZtgHgMpEQ64eIOgHahylioNJpI3dBB5AngeitjTCB4xZZJ8XSnmdCZifAmk5R_oAeR_5OrK0";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50">
        <Link to="/" className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-50 font-h1">
          IACMS
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="text-sm font-semibold text-primary-container border border-primary-container/30 px-5 py-2 rounded-lg hover:bg-primary-container/5 transition-colors"
          >
            {t("nav.signIn")}
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
                {t("home.heroBadge")}
              </span>
              <h1 className="font-h1 text-[2.5rem] md:text-[3.5rem] leading-[1.1] mb-lg text-primary-fixed">
                {t("home.heroTitle")}
              </h1>
              <p className="font-body-lg text-on-primary-container max-w-xl mb-xl opacity-90">
                {t("home.heroSubtitle")}
              </p>
              <div className="flex flex-wrap gap-md">
                <Link
                  to="/register"
                  className="bg-primary-fixed text-on-primary-fixed px-lg py-md rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-sm"
                >
                  {t("home.requestAccess")}
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <button
                  type="button"
                  disabled
                  title={t("common.comingSoon")}
                  aria-disabled="true"
                  className="border border-on-primary-container text-on-primary-container px-lg py-md rounded-lg font-semibold opacity-75 cursor-not-allowed"
                >
                  {t("home.viewDocumentation")}
                </button>
              </div>
            </div>
            <div className="md:w-2/5 mt-xl md:mt-0">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-gutter rounded-xl shadow-2xl">
                <img alt="Dashboard preview" className="rounded-lg shadow-inner w-full" src={DASHBOARD_IMG} />
                <div className="mt-md flex justify-between items-center text-xs text-on-primary-container/70 font-system-id">
                  <span>{t("home.sessionId")}</span>
                  <span>{t("home.verifiedEncryption")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-2xl bg-surface">
          <div className="container mx-auto px-6">
            <div className="mb-xl text-center max-w-2xl mx-auto">
              <h2 className="font-h2 text-primary mb-sm">{t("home.featuresTitle")}</h2>
              <p className="text-secondary font-body-md">
                {t("home.featuresSubtitle")}
              </p>
            </div>
            <div className="bento-grid">
              <div className="col-span-12 md:col-span-8 bg-white border border-slate-200 p-lg rounded-xl hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-lg h-full">
                  <div className="flex-1">
                    <span className="material-symbols-outlined text-primary-container text-4xl mb-md">
                      groups_3
                    </span>
                    <h3 className="font-h3 text-primary mb-sm">{t("home.collaborationTitle")}</h3>
                    <p className="text-secondary font-body-md mb-md">
                      {t("home.collaborationBody")}
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-sm text-body-sm text-secondary">
                        <span className="material-symbols-outlined text-primary-container text-sm">
                          check_circle
                        </span>
                        {t("home.collaborationItem1")}
                      </li>
                      <li className="flex items-center gap-sm text-body-sm text-secondary">
                        <span className="material-symbols-outlined text-primary-container text-sm">
                          check_circle
                        </span>
                        {t("home.collaborationItem2")}
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
                <h3 className="font-h3 mb-sm">{t("home.automationTitle")}</h3>
                <p className="text-on-primary-container font-body-md mb-lg">
                  {t("home.automationBody")}
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
                <h3 className="font-h3 text-primary mb-sm">{t("home.auditTitle")}</h3>
                <p className="text-secondary font-body-md">
                  {t("home.auditBody")}
                </p>
              </div>
              <div className="col-span-12 md:col-span-8 bg-slate-100 border border-slate-200 p-lg rounded-xl flex items-center">
                <div className="flex-1">
                  <h3 className="font-h3 text-primary mb-sm">{t("home.dataFeedTitle")}</h3>
                  <p className="text-secondary font-body-md mb-md">
                    {t("home.dataFeedBody")}
                  </p>
                  <div className="flex gap-md">
                    <div className="bg-white p-md rounded border border-slate-200 flex-1">
                      <div className="text-label-caps text-slate-500 mb-xs">{t("home.activeNodes")}</div>
                      <div className="text-h2 text-primary-container">482</div>
                    </div>
                    <div className="bg-white p-md rounded border border-slate-200 flex-1">
                      <div className="text-label-caps text-slate-500 mb-xs">{t("home.dailyTrails")}</div>
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
                  {t("home.architectureLabel")}
                </span>
                <h2 className="font-h1 text-primary mb-lg">{t("home.securityTitle")}</h2>
                <div className="space-y-lg">
                  <div className="flex gap-md">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-fixed/30 text-primary-container rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        security
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-lg text-primary mb-xs">{t("home.encryptionTitle")}</h4>
                      <p className="text-secondary font-body-sm">
                        {t("home.encryptionBody")}
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
                      <h4 className="font-h3 text-lg text-primary mb-xs">{t("home.rbacTitle")}</h4>
                      <p className="text-secondary font-body-sm">
                        {t("home.rbacBody")}
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
                      <h4 className="font-h3 text-lg text-primary mb-xs">{t("home.oversightTitle")}</h4>
                      <p className="text-secondary font-body-sm">
                        {t("home.oversightBody")}
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
            <h2 className="font-h1 text-primary mb-md">{t("home.ctaTitle")}</h2>
            <p className="text-secondary font-body-lg mb-xl">
              {t("home.ctaBody")}
            </p>
            <div className="flex justify-center gap-md flex-wrap">
              <Link
                to="/register"
                className="bg-primary-container text-white px-xl py-md rounded-lg font-bold hover:bg-primary transition-all"
              >
                {t("home.requestAccess")}
              </Link>
              <button
                type="button"
                disabled
                title={t("common.comingSoon")}
                aria-disabled="true"
                className="bg-white border border-outline text-primary-container px-xl py-md rounded-lg font-bold opacity-75 cursor-not-allowed"
              >
                {t("home.contactSecurity")}
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
              {t("home.footerNotice")}
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-lg items-center">
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              {t("common.privacyPolicy")}
            </StubNavItem>
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              {t("common.termsOfService")}
            </StubNavItem>
            <StubNavItem className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
              {t("common.accessibility")}
            </StubNavItem>
            <Link
              to="/login"
              className="text-xs font-normal Inter text-slate-500 dark:text-slate-400 hover:text-teal-600 hover:underline"
            >
              {t("nav.signIn")}
            </Link>
          </nav>
        </div>
        <div className="container mx-auto mt-lg pt-md border-t border-slate-100 flex justify-center">
          <div className="flex items-center gap-sm opacity-60">
            <span className="material-symbols-outlined text-sm">account_balance</span>
            <span className="text-[10px] font-system-id text-slate-400">
              {t("home.footerDisclaimer")}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
