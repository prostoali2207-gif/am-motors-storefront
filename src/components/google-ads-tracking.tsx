"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { ADS_CONSENT_STORAGE_KEY, activateGoogleAdsMeasurement } from "@/analytics/google-ads-measurement";
import type { Locale } from "@/i18n/locales";

const copy: Record<Locale, {
  title: string; details: string; advancedNotice: string;
  accept: string; decline: string; settings: string;
}> = {
  en: {
    title: "Help us improve car ads",
    details: "Allow Google to count WhatsApp button clicks using cookies, so we can learn which car ads are useful. Google does not receive your WhatsApp messages. Cookies are optional.",
    advancedNotice: "If you decline, Google still receives limited measurement signals without advertising cookies.",
    accept: "Allow measurement", decline: "Don't allow", settings: "Privacy settings",
  },
  ru: {
    title: "Помогите улучшить рекламу автомобилей",
    details: "Разрешите Google учитывать нажатия WhatsApp с помощью файлов cookie — так мы поймём, какие объявления полезны. Google не получает вашу переписку. Использование cookie необязательно.",
    advancedNotice: "При отказе Google всё равно получает ограниченные сигналы без рекламных cookies.",
    accept: "Разрешить учёт", decline: "Не разрешать", settings: "Настройки приватности",
  },
  ar: {
    title: "ساعدنا في تحسين إعلانات السيارات",
    details: "اسمح لـ Google بقياس النقرات على زر واتساب باستخدام ملفات تعريف الارتباط، لنعرف الإعلانات المفيدة. لا يحصل Google على رسائلك في واتساب. ملفات تعريف الارتباط اختيارية.",
    advancedNotice: "إذا رفضت، ستظل Google تتلقى إشارات قياس محدودة دون ملفات تعريف ارتباط إعلانية.",
    accept: "السماح بالقياس", decline: "عدم السماح", settings: "إعدادات الخصوصية",
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

export function GoogleAdsTracking({ tagId, label, locale, advanced = false }: {
  tagId: string;
  label: string;
  locale: Locale;
  /** Staged on Preview only until explicit privacy review and Production approval. */
  advanced?: boolean;
}) {
  // Hydration-safe: browser storage is read as an external store, not setState in an effect.
  const saved = useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
  const [chosen, setChosen] = useState<"yes" | "no" | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const choice = chosen ?? saved;
  const open = settingsOpen || choice === null;

  useEffect(() => {
    // Advanced mode loads the Google tag even on "Decline"; denied consent
    // forbids ad cookies but still permits Google's limited cookieless pings.
    // Basic mode (Production) never loads Google without explicit opt-in.
    if (advanced || choice === "yes") {
      activateGoogleAdsMeasurement(tagId, label, choice === "yes");
    }
  }, [advanced, choice, tagId, label]);

  useEffect(() => {
    document.body.classList.toggle("am-has-consent-prompt", open);
    return () => document.body.classList.remove("am-has-consent-prompt");
  }, [open]);

  function choose(next: "yes" | "no") {
    const prior = choice;
    storeConsent(next);
    setChosen(next);
    setSettingsOpen(false);
    if (advanced || next === "yes") {
      activateGoogleAdsMeasurement(tagId, label, next === "yes");
    }
    // Only Basic mode removes an already-loaded tag on withdrawal.
    if (!advanced && next === "no" && prior === "yes") window.location.reload();
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
            <p>{t.details}{advanced ? <> {t.advancedNotice}</> : null}</p>
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
