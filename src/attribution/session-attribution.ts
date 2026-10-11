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
}

// ---------------------------------------------------------------------------------------------
// Inquiry reference attribution (issue #19, pending owner approval; off unless the server
// enables it — see src/inquiry-log/config.ts). While off, no click ID is read or stored.
//
// One Google click per tab session (first touch), and ONE REFERENCE PER HANDOFF: each distinct
// WhatsApp action (intent + vehicle) gets its own reference, so one reference in a received
// message ↔ one vehicle/intent ↔ one handoff record. Repeated taps on the same action reuse its
// reference (the customer sees the same message); another car or intent gets a new one.
// ---------------------------------------------------------------------------------------------

export const PAID_CLICK_STORAGE_KEY = "am-motors:paid-click:v2";
/** Bounds storage if a script loops over actions; real sessions use a handful. */
const MAX_HANDOFFS_PER_SESSION = 50;

interface HandoffState {
  readonly ref: string;
  /** The handoff record was accepted for delivery (beacon queued or fetch answered OK). */
  readonly reported: boolean;
}

interface PaidSessionState {
  readonly click: PaidClick;
  readonly handoffs: Readonly<Record<string, HandoffState>>;
}

/** The handoff the next WhatsApp tap would create: the session click and this action's reference. */
export interface PaidHandoff {
  readonly click: PaidClick;
  readonly ref: string;
  readonly reported: boolean;
}

let inquiryRefsEnabled = false;
let paidMemory: PaidSessionState | null = null;

/** Set once per page by the server-rendered capture component. */
export function setInquiryRefsEnabled(enabled: boolean): void {
  inquiryRefsEnabled = enabled;
}

/** Stable key of a WhatsApp action: intent + public vehicle ID ("" for the general request). */
export function handoffKey(intent: string, vehicleId: string | null): string {
  return `${intent}|${vehicleId ?? ""}`;
}

function normalizePaidSession(data: unknown): PaidSessionState | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const click = normalizePaidClick(record.click);
  if (click === null) return null;
  const handoffs: Record<string, HandoffState> = {};
  const rawHandoffs = record.handoffs;
  if (typeof rawHandoffs === "object" && rawHandoffs !== null) {
    for (const [key, value] of Object.entries(rawHandoffs as Record<string, unknown>).slice(0, MAX_HANDOFFS_PER_SESSION)) {
      if (typeof value !== "object" || value === null) continue;
      const { ref, reported } = value as Record<string, unknown>;
      if (key.length <= 120 && isInquiryRef(ref)) handoffs[key] = { ref, reported: reported === true };
    }
  }
  return { click, handoffs };
}

function readPaidSession(): PaidSessionState | null {
  const store = storage();
  if (store === null) return paidMemory;
  try {
    const raw = store.getItem(PAID_CLICK_STORAGE_KEY);
    return raw === null ? paidMemory : normalizePaidSession(JSON.parse(raw));
  } catch {
    return paidMemory;
  }
}

function writePaidSession(state: PaidSessionState): void {
  paidMemory = state;
  try {
    storage()?.setItem(PAID_CLICK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the in-memory copy is used.
  }
}

/**
 * First touch, like UTM: the first Google click of the tab session is kept; later landings never
 * replace it. Returns null when disabled or when the session has no click.
 */
export function capturePaidClick(search: string): PaidClick | null {
  if (!inquiryRefsEnabled) return null;
  const stored = readPaidSession();
  if (stored !== null) return stored.click;
  const click = parsePaidClick(search);
  if (click === null) return null;
  writePaidSession({ click, handoffs: {} });
  return click;
}

/** Session paid click, capturing from the current address first. Browser only. */
export function currentPaidClick(): PaidClick | null {
  return typeof window === "undefined" ? null : capturePaidClick(window.location.search);
}

/**
 * The reference for one WhatsApp action, created on first use and then stable for the session.
 * Null when disabled, without a Google click, or past the per-session bound (the link then works
 * as before, without a reference).
 */
export function paidHandoff(key: string): PaidHandoff | null {
  if (currentPaidClick() === null) return null;
  const state = readPaidSession();
  if (state === null) return null;
  const existing = state.handoffs[key];
  if (existing !== undefined) return { click: state.click, ...existing };
  if (Object.keys(state.handoffs).length >= MAX_HANDOFFS_PER_SESSION) return null;
  const created: HandoffState = { ref: createInquiryRef(), reported: false };
  writePaidSession({ click: state.click, handoffs: { ...state.handoffs, [key]: created } });
  return { click: state.click, ...created };
}

/** Records whether this action's handoff was accepted for delivery; false re-allows a retry. */
export function setHandoffReported(key: string, reported: boolean): void {
  const state = readPaidSession();
  const existing = state?.handoffs[key];
  if (state === null || existing === undefined || existing.reported === reported) return;
  writePaidSession({ click: state.click, handoffs: { ...state.handoffs, [key]: { ...existing, reported } } });
}
