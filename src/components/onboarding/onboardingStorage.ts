export const ONBOARDING_COMPLETED_KEY = "zapflow_onboarding_completed";
export const ONBOARDING_SELECTED_TEMPLATE_KEY = "zapflow_onboarding_template";

export function getUserScopedKey(userId: string, baseKey: string) {
  return `${baseKey}:${userId}`;
}

export function safeGetLocalStorageItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetLocalStorageItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
