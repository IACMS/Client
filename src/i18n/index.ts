import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import am from "./locales/am.json";
import om from "./locales/om.json";
import ti from "./locales/ti.json";
import so from "./locales/so.json";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, languageUsesEthiopicScript } from "./languages";

function applyDocumentLanguage(lng: string) {
  const lang = lng.split("-")[0];
  document.documentElement.lang = lang;
  document.documentElement.dataset.script = languageUsesEthiopicScript(lang) ? "ethiopic" : "latin";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
      ti: { translation: ti },
      so: { translation: so },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["en", "am", "om", "ti", "so"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
