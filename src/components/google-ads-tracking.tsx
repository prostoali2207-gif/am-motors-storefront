"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { ADS_CONSENT_STORAGE_KEY, activateGoogleAdsMeasurement } from "@/analytics/google-ads-measurement";
import type { Locale } from "@/i18n/locales";

const copy: Record<Locale, { title: string; details: string; accept: string; decline: string; settings: string }> = {
  en: {
    title: "Optional ads measurement",
    details: "Allow Google cookies to measure WhatsApp button clicks? A click does not confirm a message or sale.",
    accept: "Allow", decline: "No thanks", settings: "Privacy settings",
  },
  ru: {
    title: "Необязательная аналитика рекламы",
    details: "Разрешить Google cookie для учёта нажатий WhatsApp? Нажатие не означает отправку сообщения.",
    accept: "Разрешить", decline: "Отказаться", settings: "Настройки приватности",
  },
  ar: {
    title: "قياس إعلاني اختياري",
    details: "هل تسمح بملفات تعريف ارتباط Google لقياس نقرات واتساب؟ النقرة لا تعني إرسال رسالة.",
    accept: "السماح", decline: "لا، شكراً", settings: "إعدادات الخصوصية",
  },
};

function readConsent(): "yes" | "no" | null {
  try {
    const consent = window.localStorage.getItem(ADS_CONSENT_STORAGE_KEY);
    return consent === "yes" || consent === "no" ? consent : null;
  } catch {
    return null;
  }
}
function storeConsent(value: "yes" | "no"): void {
  try { window.localStorage.setItem(ADS_CONSENT_STORAGE_KEY, value); } catch { /* private mode */ }
}

/** Render only when a valid Google Ads conversion ID AND action label are configured on server. */
const subscribeConsent = () => () => {};

export function GoogleAdsTracking({ tagId, label, locale }: {
  tagId: string;
  label: string;
  locale: Locale;
}) {
  // Hydration-safe: browser storage is read as an external store, not setState in an effect.
  const saved = useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
  const [chosen, setChosen] = useState<"yes" | "no" | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const choice = chosen ?? saved;
  const open = settingsOpen || choice === null;

  useEffect(() => {
    if (choice === "yes") activateGoogleAdsMeasurement(tagId, label);
  }, [choice, tagId, label]);

  useEffect(() => {
    document.body.classList.toggle("am-has-consent-prompt", open);
    return () => document.body.classList.remove("am-has-consent-prompt");
  }, [open]);

  function choose(next: "yes" | "no") {
    const prior = choice;
    storeConsent(next);
    setChosen(next);
    setSettingsOpen(false);
    if (next === "yes") activateGoogleAdsMeasurement(tagId, label);
    // Remove an already loaded tag if consent is withdrawn.
    if (next === "no" && prior === "yes") window.location.reload();
  }

  const t = copy[locale];
  return (
    <>
      <button type="button" className="am-privacy-settings" onClick={() => setSettingsOpen(true)}>
        {t.settings}
      </button>
      {open ? (
        <aside className="am-privacy-banner" aria-labelledby="am-consent-title">
          <div>
            <strong id="am-consent-title">{t.title}</strong>
            <p>{t.details}</p>
          </div>
          <div className="am-privacy-actions">
            <button type="button" onClick={() => choose("yes")}>{t.accept}</button>
            <button type="button" onClick={() => choose("no")}>{t.decline}</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
