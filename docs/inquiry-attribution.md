# Inquiry reference attribution (issue #19)

Status: **implemented behind a switch, OFF by default, pending owner approval.**
Nothing changes on the site until `INQUIRY_LOG=google-sheets` and the variables below are set,
which needs the owner's explicit approval of the rule change in `docs/business-rules.md` →
"Inquiry reference attribution — proposed".

## What it does

```
Google ad click (?gclid=… or gbraid / wbraid)
  → VDP or /cars (tab session keeps the FIRST click; no reference exists yet)
  → visitor taps a WhatsApp action (intent + car)
      ├─ that action gets its OWN reference, e.g. G-7K3M9P (same action tapped again → same ref;
      │  another car or intent → a new ref)
      ├─ prefill gets one extra line:  Inquiry: G-7K3M9P   (never the click ID)
      └─ browser beacon → POST /api/inquiry-ref → one row in the separate log Sheet:
         time · reference · handoff_initiated · unverified_client_report · click ID type/value ·
         vehicle Ref · intent · language · UTM
  → visitor may or may not press Send in WhatsApp
  → Sales records what actually happened (see "Sales procedure")
```

**One reference = one action = one car/intent.** A customer who opens two cars from the same ad
click sends two messages with two different references; each joins to exactly one handoff.

Without a Google click ID nothing is stored, sent or shown — UTM + `Ref:` work exactly as before.
Without JavaScript, or if the log is down, WhatsApp works exactly as before (server-rendered link
without a reference, or a reference that stays unmatched).

## What a row is — and is not

`handoff_initiated` = the visitor **opened** WhatsApp with the prefill. It is **not** an inquiry
and **not** a lead: the visitor may never press Send. A message counts only when Sales sees it
arrive in WhatsApp Business with the `Inquiry: G-…` line.

Expected noise, handled by Sales, never guessed:
- several rows with the same reference = the same action re-sent after a delivery retry or a
  reload; they are identical except time → **deduplicate by `inquiry_ref`, keep the earliest row**;
- a reference in WhatsApp with no row = beacon lost (network, blocker) → click unknown;
- a row with no WhatsApp message = visitor did not send → no inquiry;
- the customer deleted the `Inquiry:` line → source unknown (UTM lines may still help);
- the link was opened with long-press / "open in new tab" (no tap handler) → message without a
  reference → unknown.

Report match coverage honestly every week: references received in WhatsApp, of which matched to
a handoff row, unmatched, and handoff rows with no message. Never present unmatched as zero.

## Server-side guards — and what they do NOT prove

- `/api/inquiry-ref` answers **404** while the switch is off.
- `Origin` must equal the site's origin (and `Sec-Fetch-Site`, if sent, must be `same-origin`);
  body ≤ 2 KB; strict schema (reference format, Google click ID types only, known intent/language,
  allowlisted UTM keys).
- Vehicle handoffs are logged **only if the vehicle is currently available** in the inventory
  Sheet; sold, reserved, unknown or non-public IDs → 422, nothing written. Inventory unreadable → 503.
- Per server instance: 10/min per client, 300/min total, **2,000 appends per day**.

**Not authentication.** Any HTTP client can forge the headers and send an invented click ID. So:
every row is written as `unverified_client_report`; a row never proves a Google click happened;
only a WhatsApp message Sales actually received makes an inquiry, and only Google's acceptance of
an upload confirms a click match. The in-memory limits reset per serverless instance, so they
are a brake, not a guarantee. **Before enabling**, add a Vercel Firewall rate-limit rule for
`POST /api/inquiry-ref` (per IP, e.g. 20/min, deny on exceed) and check the log weekly for bursts
(many rows, no messages). If the log fills up or the quota is exhausted, only the log stops —
WhatsApp is unaffected.
- One API call only: `spreadsheets.values.append` with `valueInputOption=RAW` (cell text is
  never evaluated as a formula). No reads, updates or deletes.
- Logs contain fixed codes only — never click IDs, references, UTM values or vehicle IDs.
- CSP unchanged (`connect-src 'self'`); no third-party script, no cookie, no Google tag.

## Separation from the inventory (enforced in `src/inquiry-log/config.ts`)

| | Inventory | Inquiry log |
| - | - | - |
| Spreadsheet | "AM Motors — Справочник машин" | a **new, separate** spreadsheet |
| Service account | existing reader (Viewer, `spreadsheets.readonly`) | a **new** account (Editor on the log only, `spreadsheets`) |
| Changed by this work | nothing | — |

Same IDs or the same account → the switch stays off.

## One-time setup (owner / admin, after approval)

1. Create a new Google spreadsheet, e.g. **"AM Motors — Inquiry log"**. Sharing: Restricted.
2. Tab **`Handoffs`**, row 1 exactly:
   `received_at_utc | inquiry_ref | event | verification | click_id_type | click_id | vehicle_ref | intent | page_locale | utm_source | utm_medium | utm_campaign | utm_content | utm_term`
   (the site only appends below; never edit or sort this tab by hand).
3. Tab **`Outcomes`** for Sales (the site never touches it), columns as in "Sales procedure":
   `conversion_event_id | inquiry_ref | stage | event_time | vehicle_ref | verified_by | export_status | exported_at`.
4. Google Cloud: create a new service account, e.g. `inquiry-log-writer`, no project roles.
   Share the log spreadsheet with its email as **Editor**. Do **not** share the inventory Sheet with it.
5. On the new service account → Permissions → grant the same Vercel Preview principal as in
   `docs/google-sheets-setup.md` step 5 the role **Workload Identity User**
   (`roles/iam.workloadIdentityUser`). Production gets its own principal only when Production is approved.
6. Vercel → Preview env vars only first: `INQUIRY_LOG=google-sheets`,
   `INQUIRY_LOG_SPREADSHEET_ID=<log sheet id>`, `INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL=<new account>`.
7. Vercel Firewall: rate-limit rule for `POST /api/inquiry-ref` (see "Server-side guards").
8. Test on a real phone (issue #19 step 6) before Production: open
   `<preview>/cars/<available ID>?utm_source=google&utm_medium=cpc&gclid=TESTCLICKID_manual_0001`,
   tap WhatsApp, check the prefill shows `Inquiry: G-…` and no click ID, check one row appeared,
   **send** the message to the business number, then record it in `Outcomes`. Also check a sold
   VDP has no actions and writes nothing.

## Sales procedure (daily)

1. For each WhatsApp message containing `Inquiry: G-XXXXXX`, add **one** `Outcomes` row per stage
   reached, never edit a row into another stage:

   | Column | Rule |
   | - | - |
   | `conversion_event_id` | `<inquiry_ref>:<stage>`, e.g. `G-7K3M9P:inquiry_received` — unique; a duplicate ID is an error |
   | `inquiry_ref` | exactly as in the message |
   | `stage` | `inquiry_received` · `qualified` · `appointment` · `sale` |
   | `event_time` | when it happened, with time zone, e.g. `2026-10-12T14:30:00+04:00` |
   | `vehicle_ref` | the `Ref:` in the message |
   | `verified_by` | staff initials (who saw the evidence: the received message, the visit, the sale) |
   | `export_status` | `not_exported` · `exported` · `rejected` (+ `exported_at`) |

2. `inquiry_received` only for a message that actually arrived. `qualified` follows the Sales /
   Lead Conversion criteria, not the site.
3. No names, phone numbers or chat text in the log spreadsheet or in GitHub.

## Sending results back to Google Ads — NOT enabled

Deterministic join for any future export: `Outcomes` (one row per `conversion_event_id`) →
`Handoffs` deduplicated by `inquiry_ref` (earliest row) → click ID. One reference maps to one
handoff, so the join cannot multiply rows; a `conversion_event_id` is exported at most once
(`export_status`), so re-runs cannot duplicate conversions.

No import — manual or automatic — until all of this is verified against the **current** Google
documentation and the live account:
- a real conversion action exists for the chosen stage (none exists as of 2026-10-11), with its
  category and primary/secondary role decided;
- the supported upload path: Google currently recommends the **Data Manager API** for new
  integrations, and `UploadClickConversions` fails since 2026-06-15 for credentials that never
  uploaded click conversions before (Google Ads API "Conversion management categories" page,
  updated 2026-10-06); check the Ads UI options at that time instead of relying on menu names;
- accepted click-ID types (gclid vs gbraid/wbraid), maximum time after the click, time-zone format;
- a first test upload accepted by Google before any routine use.

## Privacy and retention

- Click IDs are pseudonymous online identifiers and are treated as **personal data**.
- Access to the log spreadsheet: owner + named Sales staff only; the site's writer account can
  only append. Exports or screenshots shared outside Sales mask `click_id`.
- Retention: proposed — delete `Handoffs` rows older than 90 days unless linked to a verified
  outcome still awaiting export; **owner to confirm** (open question in `docs/business-rules.md`).
- Consent: only Google Ads click IDs are processed, no cookies; if ads ever target regions with
  consent requirements (e.g. EEA), this needs review before enabling there.

## Deliberately not built

- **Google tag / gtag "WhatsApp click" conversion.** It needs a real conversion label from the
  account, a CSP change for Google hosts and a consent decision. A click is diagnostic only and
  the log above already records it first-party. Revisit only if bidding needs an on-site signal.
- **GA4.** Not needed for this measurement path; avoids a second tag.
- **Automatic WhatsApp message detection.** Needs the WhatsApp Business API; Sales records
  received messages by hand for now.
