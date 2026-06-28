import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";

type LanguageSwitcherProps = {
  /** Compact style for top nav bars; full style for settings forms. */
  variant?: "compact" | "full";
  className?: string;
};

const selectBaseClass =
  "w-full appearance-none bg-white dark:bg-slate-900 border border-outline-variant rounded-lg text-sm text-on-surface transition-all outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container font-body-md";

export default function LanguageSwitcher({ variant = "compact", className = "" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0] as LanguageCode;
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === current) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function selectLanguage(code: LanguageCode) {
    void i18n.changeLanguage(code);
    setOpen(false);
  }

  if (variant === "full") {
    return (
      <div className={className} ref={rootRef}>
        <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" id="language-select-label">
          {t("language.label")}
        </label>
        <div className="relative">
          <button
            type="button"
            id="language-select"
            aria-labelledby="language-select-label"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`${selectBaseClass} flex items-center justify-between gap-2 px-3.5 py-3 text-left`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-outline-variant text-[18px] shrink-0">translate</span>
              <span className="truncate">
                {currentLang.nativeName} <span className="text-on-surface-variant">({currentLang.name})</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-outline-variant text-[20px] shrink-0">expand_more</span>
          </button>
          {open ? (
            <ul
              role="listbox"
              aria-labelledby="language-select-label"
              className="absolute z-50 mt-1 w-full rounded-lg border border-outline-variant bg-white dark:bg-slate-900 shadow-lg py-1 max-h-60 overflow-y-auto"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <li key={lang.code} role="option" aria-selected={lang.code === current}>
                  <button
                    type="button"
                    onClick={() => selectLanguage(lang.code)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 ${
                      lang.code === current ? "bg-primary-container/5 text-primary font-semibold" : "text-on-surface"
                    }`}
                  >
                    <span>
                      {lang.nativeName} <span className="text-on-surface-variant font-normal">({lang.name})</span>
                    </span>
                    {lang.code === current ? (
                      <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <label id="language-switcher-label" className="sr-only">
        {t("language.select")}
      </label>
      <button
        type="button"
        id="language-switcher"
        aria-labelledby="language-switcher-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${selectBaseClass} flex items-center gap-2 pl-9 pr-8 py-2 min-w-[8.5rem] max-w-[11rem] bg-surface-container-low dark:bg-slate-800`}
      >
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline-variant text-[18px] pointer-events-none">
          translate
        </span>
        <span className="truncate">{currentLang.nativeName}</span>
        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline-variant text-[18px] pointer-events-none">
          expand_more
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-labelledby="language-switcher-label"
          className="absolute right-0 z-[70] mt-1 min-w-[11rem] rounded-lg border border-outline-variant bg-white dark:bg-slate-900 shadow-xl py-1"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <li key={lang.code} role="option" aria-selected={lang.code === current}>
              <button
                type="button"
                onClick={() => selectLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 ${
                  lang.code === current ? "bg-primary-container/5 text-primary font-semibold" : "text-on-surface"
                }`}
              >
                <span className="truncate">{lang.nativeName}</span>
                {lang.code === current ? (
                  <span className="material-symbols-outlined text-primary text-[16px] shrink-0">check</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
