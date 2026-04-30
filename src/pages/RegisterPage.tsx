import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { StubNavItem } from "@/components/StubNavItem";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAc7CUm4yqRRDQPGCDqcj9F-k4mKrmhDt60OlmT3antKoRgKyYfv20a4BjvxkfITydqlHC1Do6K66sm6L4fTiY6tqLWtvNWq05b9eA00ajNWrRPW8QMiddG4DWioBFtp8qk-Rh3TtHYvssGTL2TDxBjG0cpVMRjN18bFPc8PWvyvtD5q2_N0XHsSUgP69bCfI34Im2UxQ7OhlAKMNEyiEvbcyzzBsq9NdmQPYoimSgpoprOztv6XXRZnqVirG1igmgB5P03-0PtN1U";

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setSubmitted(true);
  }

  return (
    <div className="font-body-md text-on-surface min-h-[100dvh] flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-6 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-50 font-h1">
            IACMS
          </Link>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <span className="font-label-caps text-on-surface-variant uppercase tracking-widest">
            Portal Access Request
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="text-slate-600 hover:text-teal-700 transition-colors flex items-center gap-2 font-body-sm">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            Support
          </button>
          <Link to="/login" className="font-body-sm text-primary-container font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="min-h-full flex flex-col justify-center items-center px-gutter py-6 sm:py-8">
          <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-5 space-y-lg">
              <div className="bg-primary-container p-lg rounded-xl text-on-primary">
                <h1 className="font-h1 text-h1 mb-md text-white">Join the Network.</h1>
                <p className="font-body-lg text-body-lg text-on-primary-container mb-xl">
                  IACMS facilitates seamless inter-agency cooperation. Registering your agency ensures secure
                  data exchange and unified case management capabilities.
                </p>
                <div className="space-y-md">
                  <div className="flex items-start gap-md">
                    <div className="bg-primary-fixed/20 p-sm rounded-lg">
                      <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified_user
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-body-md font-bold">Secure Verification</h4>
                      <p className="font-body-sm text-on-primary-container">
                        All requests undergo a strict multi-tier vetting process to maintain institutional
                        security.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-md">
                    <div className="bg-primary-fixed/20 p-sm rounded-lg">
                      <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                        hub
                      </span>
                    </div>
                    <div>
                      <h4 className="font-h3 text-body-md font-bold">Centralized Directory</h4>
                      <p className="font-body-sm text-on-primary-container">
                        Once approved, your agency will be listed in the Federal Inter-Agency Division
                        directory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <img alt="" className="w-full h-full object-cover" src={HERO_IMG} />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                <div className="absolute bottom-md left-md right-md">
                  <p className="text-white font-body-sm italic">
                    &quot;Modernizing the standard of government case management through secure, rapid agency
                    integration.&quot;
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm">
                <div className="mb-lg border-b border-surface-variant pb-md">
                  <h2 className="font-h2 text-h2 text-primary">Agency Registration</h2>
                  <p className="font-body-sm text-on-surface-variant mt-xs">
                    Provide official institutional details for access authorization.
                  </p>
                </div>
                <form className="space-y-lg" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                        Agency Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        placeholder="e.g. Department of Justice"
                        type="text"
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                        Department/Division
                      </label>
                      <input
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        placeholder="e.g. Civil Rights Division"
                        type="text"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                        Primary Contact Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        placeholder="Full Legal Name"
                        type="text"
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                        Work Email
                      </label>
                      <input
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        placeholder="official@agency.gov"
                        type="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      className="w-full md:w-1/2 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                    />
                  </div>
                  <div className="space-y-sm">
                    <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider">
                      Reason for Access
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md p-md"
                      placeholder="Detail the operational necessity for portal access..."
                      rows={4}
                    />
                  </div>
                  <label className="flex items-start gap-md bg-surface-container-low p-md rounded-lg border border-outline-variant cursor-pointer">
                    <div className="flex items-center h-5 shrink-0">
                      <input
                        className="h-4 w-4 rounded text-primary focus:ring-primary border-outline-variant"
                        type="checkbox"
                        checked={agreed}
                        onChange={(ev) => setAgreed(ev.target.checked)}
                      />
                    </div>
                    <span className="font-body-sm text-on-surface-variant leading-tight">
                      I agree to the{" "}
                      <StubNavItem className="inline text-primary font-bold underline underline-offset-2 align-baseline leading-tight">
                        Inter-Agency Data Sharing Agreement
                      </StubNavItem>
                      . This includes adherence to federal privacy standards, data handling protocols, and
                      non-disclosure requirements.
                    </span>
                  </label>
                  <div className="pt-md border-t border-surface-variant">
                    <button
                      disabled={!agreed}
                      className="w-full bg-primary-container text-white py-lg rounded-lg font-h3 hover:opacity-90 transition-all flex items-center justify-center gap-md disabled:opacity-50 disabled:pointer-events-none"
                      type="submit"
                    >
                      Submit Request
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                  {submitted && (
                    <div className="mt-lg p-md bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-md">
                      <span className="material-symbols-outlined text-teal-700" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      <span className="font-body-sm text-teal-800">
                        Your request has been submitted for review. An analyst will contact you within 48
                        business hours.
                      </span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center w-full py-4 sm:py-6 px-gutter shrink-0">
        <div className="mb-4 md:mb-0">
          <p className="text-xs font-normal Inter text-slate-500 dark:text-slate-400">
            © 2024 Government Case Management System. Official Use Only.
          </p>
        </div>
        <div className="flex gap-6 flex-wrap items-center">
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
            className="text-xs font-normal Inter text-slate-500 dark:text-slate-400 hover:text-teal-600 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
