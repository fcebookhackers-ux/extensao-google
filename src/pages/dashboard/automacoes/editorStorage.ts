import type { AutomationEditorDoc } from "./editorTypes";

const STORAGE_PREFIX = "zapfllow_flow_editor_v1:";

export function getAutomationStorageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

export function loadAutomationDoc(id: string): AutomationEditorDoc | null {
  try {
    const raw = localStorage.getItem(getAutomationStorageKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as AutomationEditorDoc;
  } catch {
    return null;
  }
}

export function saveAutomationDoc(doc: AutomationEditorDoc) {
  localStorage.setItem(getAutomationStorageKey(doc.id), JSON.stringify(doc));
}
