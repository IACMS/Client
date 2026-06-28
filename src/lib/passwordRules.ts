/** Matches auth-service `validatePassword`: min 8, at least one letter and one number. */

import i18n from "@/i18n";

export function getPasswordHint(): string {
  return i18n.t("auth.passwordHint");
}

/** @deprecated use getPasswordHint() for translated UI */
export const PASSWORD_HINT = "At least 8 characters, including at least one letter and one number.";

export function isPasswordValid(password: string): boolean {
  if (!password || password.length < 8 || password.length > 128) return false;
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}
