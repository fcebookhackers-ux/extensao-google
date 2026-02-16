import type { CookiePreferences } from "./cookieTypes";

const LS_KEY = "zapfllow:cookie_preferences";

export function readLocalPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function writeLocalPreferences(prefs: CookiePreferences) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

export function clearLocalPreferences() {
  localStorage.removeItem(LS_KEY);
}
