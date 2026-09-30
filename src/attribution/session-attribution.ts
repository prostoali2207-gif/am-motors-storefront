import { firstTouch, hasAttribution, normalizeAttribution, parseAttribution, type Attribution } from "./attribution";

/**
 * Browser-side first-touch store for the current tab session.
 *
 * `sessionStorage` (first-party, per tab, cleared when the tab closes). No cookies, nothing sent
 * to a server, no third-party script. If storage is blocked, an in-memory copy still carries the
 * attribution across client-side navigation for the lifetime of the page.
 *
 * Stores only the allowlisted parameters from ./attribution.ts — never vehicle or Sheet data.
 */
export const ATTRIBUTION_STORAGE_KEY = "am-motors:attribution:v1";

let memory: Attribution = {};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readStored(): Attribution {
  const store = storage();
  if (store === null) return memory;
  try {
    const raw = store.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw === null ? memory : normalizeAttribution(JSON.parse(raw));
  } catch {
    return memory;
  }
}

/**
 * Records attribution from a landing URL's query string (first touch wins) and returns the
 * session's attribution. Safe to call on every page and before every WhatsApp click.
 */
export function captureAttribution(search: string): Attribution {
  const stored = readStored();
  const current = firstTouch(stored, parseAttribution(search));
  if (current !== stored && hasAttribution(current)) {
    memory = current;
    try {
      storage()?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Storage full or blocked: the in-memory copy is used.
    }
  }
  return current;
}

/** Session attribution, capturing from the current address first. Browser only. */
export function currentAttribution(): Attribution {
  return typeof window === "undefined" ? {} : captureAttribution(window.location.search);
}

/** Test helper: forget the in-memory copy. */
export function resetAttributionMemoryForTests(): void {
  memory = {};
}
