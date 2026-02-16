export type CookieCategory = "essential" | "analytics" | "marketing" | "functional";

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  consentVersion: string;
  decidedAt: string; // ISO
};

export const CONSENT_VERSION = "1";

export function defaultPreferences(): CookiePreferences {
  return {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
    consentVersion: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };
}
