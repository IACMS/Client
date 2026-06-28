export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", script: "latin" as const },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", script: "ethiopic" as const },
  { code: "om", name: "Afaan Oromo", nativeName: "Afaan Oromoo", script: "latin" as const },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ", script: "ethiopic" as const },
  { code: "so", name: "Somali", nativeName: "Soomaali", script: "latin" as const },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_STORAGE_KEY = "iacms-language";

export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

export function languageUsesEthiopicScript(code: string): boolean {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.script === "ethiopic";
}
