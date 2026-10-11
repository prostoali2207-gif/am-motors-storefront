# Inquiry reference attribution (issue #19)

Status: **implemented behind a switch, OFF by default, pending owner approval.**
Nothing changes on the site until `INQUIRY_LOG=google-sheets` and the variables below are set,
which needs the owner's explicit approval of the rule change in `docs/business-rules.md` →
"Inquiry reference attribution — proposed".

## What it does

```
Google ad click (?gclid=… or gbraid / wbraid)
  → VDP or /cars (tab session keeps the first click + one short reference, e.g. G-7K3M9P)
  → visitor taps a WhatsApp action
      ├─ prefill gets one extra line:  Inquiry: G-7K3M9P   (never the click ID)
      └─ browser beacon → POST /api/inquiry-ref → one row in the separate log Sheet:
         time · reference · handoff_initiated · click ID type/value · vehicle Ref · intent · language · UTM
  → visitor may or may not press Send in WhatsApp
  → Sales records what actually happened (see "Sales procedure")
```

Without a Google click ID nothing is stored, sent or shown — UTM + `Ref:` work exactly as before.

## What a row is — and is not

`handoff_initiated` = the visitor **opened** WhatsApp with the prefill. It is **not** an inquiry
and **not** a lead: the visitor may never press Send. A message counts only when Sales sees it
arrive in WhatsApp Business with the `Inquiry: G-…` line.

Expected noise, handled by Sales, never guessed:
- several rows with the same reference = repeated taps / several actions in one session;
- a reference in WhatsApp with no row = beacon lost (network, blocker) → click unknown;
- a row with no WhatsApp message = visitor did not send → no inquiry;
- the customer deleted the `Inquiry:` line → source unknown (UTM lines may still help).

## Server-side guards

- `/api/inquiry-ref` answers **404** while the switch is off.
- Same-origin requests only (`Sec-Fetch-Site` / `Origin`), body ≤ 2 KB, strict schema
  (reference format, Google click ID types only, known intent/language, allowlisted UTM keys).
- Vehicle handoffs are logged **only if the vehicle is currently available** in the inventory
  Sheet; sold, reserved, unknown or non-public IDs → 422, nothing written. Inventory unreadable → 503.
- Best-effort rate limit per server instance (10/min per client, 300/min total).
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
   `received_at_utc | inquiry_ref | event | click_id_type | click_id | vehicle_ref | intent | page_locale | utm_source | utm_medium | utm_campaign | utm_content | utm_term`
   (the site only appends below; never edit or sort this tab by hand).
3. Tab **`Outcomes`** for Sales (the site never touches it), suggested columns:
   `inquiry_ref | message_received_at | vehicle_ref | qualified (yes/no/unknown) | appointment_at | showed (yes/no) | sold_at | notes (no customer personal data)`.
4. Google Cloud: create a new service account, e.g. `inquiry-log-writer`, no project roles.
   Share the log spreadsheet with its email as **Editor**. Do **not** share the inventory Sheet with it.
5. On the new service account → Permissions → grant the same Vercel Preview principal as in
   `docs/google-sheets-setup.md` step 5 the role **Workload Identity User**
   (`roles/iam.workloadIdentityUser`). Production gets its own principal only when Production is approved.
6. Vercel → Preview env vars only first: `INQUIRY_LOG=google-sheets`,
   `INQUIRY_LOG_SPREADSHEET_ID=<log sheet id>`, `INQUIRY_LOG_SERVICE_ACCOUNT_EMAIL=<new account>`.
7. Test on a real phone (issue #19 step 6) before Production: open
   `<preview>/cars/<available ID>?utm_source=google&utm_medium=cpc&gclid=TESTCLICKID_manual_0001`,
   tap WhatsApp, check the prefill shows `Inquiry: G-…` and no click ID, check one row appeared,
   **send** the message to the business number, then record it in `Outcomes`. Also check a sold
   VDP has no actions and writes nothing.

## Sales procedure (daily)

1. For each WhatsApp message with an `Inquiry: G-XXXXXX` line, add a row in `Outcomes` with the
   reference, time received and the `Ref:` vehicle. That row — not the `Handoffs` row — is the inquiry.
2. Update `qualified`, `appointment_at`, `showed`, `sold_at` as the buyer moves on.
   Qualification criteria belong to Sales / Lead Conversion, not to the site.
3. Never paste phone numbers or names into the log spreadsheet or into GitHub.

## Sending results back to Google Ads (not automated here)

The join `Outcomes.inquiry_ref → Handoffs.click_id` gives the click for each **verified**
outcome (qualified / appointment / sale). Upload those as offline conversions in Google Ads
(Goals → Uploads), using the template and conversion actions the account itself provides.
Before the first upload, check the current official Google Ads documentation for: click-ID
types accepted (gclid vs gbraid/wbraid), the upload time window after the click, conversion
action category and primary/secondary setting, and consent requirements. No conversion action
exists in the account as of 2026-10-11; none is assumed here.

## Deliberately not built

- **Google tag / gtag "WhatsApp click" conversion.** It needs a real conversion label from the
  account, a CSP change for Google hosts and a consent decision. A click is diagnostic only and
  the log above already records it first-party. Revisit only if bidding needs an on-site signal.
- **GA4.** Not needed for this measurement path; avoids a second tag.
- **Automatic WhatsApp message detection.** Needs the WhatsApp Business API; Sales records
  received messages by hand for now.
