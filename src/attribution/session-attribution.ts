import { firstTouch, hasAttribution, normalizeAttribution, parseAttribution, type Attribution } from "./attribution";
import {
  createInquiryRef,
  isInquiryRef,
  normalizePaidClick,
  parsePaidClick,
  type PaidClick,
} from "./paid-click";

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
  paidMemory = null;
  inquiryRefsEnabled = false;
  sentHandoffs.clear();
}

// ---------------------------------------------------------------------------------------------
// Inquiry reference attribution (issue #19, pending owner approval; off unless the server
// enables it — see src/inquiry-log/config.ts). While off, no click ID is read or stored.
// ---------------------------------------------------------------------------------------------

export const PAID_CLICK_STORAGE_KEY = "am-motors:paid-click:v1";

/** A Google click from the landing URL plus the short reference shown to the customer. */
export interface PaidSession {
  readonly click: PaidClick;
  readonly ref: string;
}

let inquiryRefsEnabled = false;
let paidMemory: PaidSession | null = null;
const sentHandoffs = new Set<string>();

/** Set once per page by the server-rendered capture component. */
export function setInquiryRefsEnabled(enabled: boolean): void {
  inquiryRefsEnabled = enabled;
}

export function inquiryRefsAreEnabled(): boolean {
  return inquiryRefsEnabled;
}

function normalizePaidSession(data: unknown): PaidSession | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const click = normalizePaidClick(record.click);
  return click !== null && isInquiryRef(record.ref) ? { click, ref: record.ref } : null;
}

function readPaidSession(): PaidSession | null {
  const store = storage();
  if (store === null) return paidMemory;
  try {
    const raw = store.getItem(PAID_CLICK_STORAGE_KEY);
    return raw === null ? paidMemory : normalizePaidSession(JSON.parse(raw));
  } catch {
    return paidMemory;
  }
}

/**
 * First touch, like UTM: the first Google click of the tab session is kept with one reference;
 * later landings never replace it. Returns null when disabled or when the session has no click.
 */
export function capturePaidSession(search: string): PaidSession | null {
  if (!inquiryRefsEnabled) return null;
  const stored = readPaidSession();
  if (stored !== null) return stored;
  const click = parsePaidClick(search);
  if (click === null) return null;
  const session: PaidSession = { click, ref: createInquiryRef() };
  paidMemory = session;
  try {
    storage()?.setItem(PAID_CLICK_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked: the in-memory copy is used.
  }
  return session;
}

/** Session paid click, capturing from the current address first. Browser only. */
export function currentPaidSession(): PaidSession | null {
  return typeof window === "undefined" ? null : capturePaidSession(window.location.search);
}

/**
 * True the first time a given handoff key is seen in this page's lifetime; repeated clicks on
 * the same button do not append repeated rows to the log.
 */
export function markHandoffOnce(key: string): boolean {
  if (sentHandoffs.has(key)) return false;
  sentHandoffs.add(key);
  return true;
}
