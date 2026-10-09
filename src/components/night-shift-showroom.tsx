"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { vehicleTitle, type Vehicle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { WhatsAppLink } from "./whatsapp-link";

const copy: Record<Locale, {
  eyebrow: string; first: string; second: string; count: string; catalogue: string;
  all: string; preview: string; view: string; details: string; previous: string;
  next: string; choose: string; noPhoto: string;
}> = {
  en: { eyebrow: "UAE / Cars available", first: "ON THE", second: "LOT.", count: "in stock",
    catalogue: "The inventory", all: "All", preview: "AM / Stock preview", view: "View car",
    details: "Open car details", previous: "Previous car", next: "Next car",
    choose: "Preview", noPhoto: "Photos unavailable" },
  ru: { eyebrow: "ОАЭ / В наличии", first: "НАШИ", second: "АВТО.", count: "в наличии",
    catalogue: "Каталог автомобилей", all: "Все", preview: "AM / Обзор автомобиля", view: "Смотреть авто",
    details: "Открыть страницу автомобиля", previous: "Предыдущее авто", next: "Следующее авто",
    choose: "Показать", noPhoto: "Фото недоступны" },
  ar: { eyebrow: "الإمارات / سيارات متوفرة", first: "سيارات", second: "متوفرة", count: "متوفرة",
    catalogue: "قائمة السيارات", all: "الكل", preview: "AM / عرض السيارة", view: "تفاصيل السيارة",
    details: "فتح تفاصيل السيارة", previous: "السيارة السابقة", next: "السيارة التالية",
    choose: "عرض", noPhoto: "الصور غير متوفرة" },
};

/**
 * Client-side presentation only. Available stock, prices, specs and approved images are
 * provided by the existing read-only inventory repository; no fixtures/fallbacks.
 */
export function NightShiftShowroom({
  vehicles, locale, serverOrigin,
}: {
  vehicles: readonly Vehicle[]; locale: Locale; serverOrigin: string | null;
}) {
  const t = copy[locale];
  const common = messages(locale);
  const [make, setMake] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const featureRef = useRef<HTMLElement | null>(null);
  const makes = [...new Set(vehicles.map((v) => v.make))];
  const filtered = make === null ? vehicles : vehicles.filter((v) => v.make === make);
  const selectedIndex = Math.max(0, filtered.findIndex((v) => v.id === selectedId));
  const selected = filtered[selectedIndex];
  if (!selected) return null;

  const cover = vehicleImages(selected.media)[0];
  const vehicleUrl = localizedPath(locale, { kind: "vehicle", id: selected.id });
  const inquiry = {
    kind: "vehicle" as const, intent: "question" as const, id: selected.id,
    title: vehicleTitle(selected), path: vehicleUrl, locale,
  };

  function revealOnMobile() {
    if (typeof window === "undefined" || window.innerWidth >= 960) return;
    window.requestAnimationFrame(() => {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
      featureRef.current?.scrollIntoView({
        behavior: reduced ? "instant" : "smooth",
        block: "start",
      });
    });
  }
  function choose(id: string) { setSelectedId(id); revealOnMobile(); }
  function chooseMake(value: string | null) { setMake(value); setSelectedId(null); }
  function move(delta: number) {
    const next = filtered[(selectedIndex + delta + filtered.length) % filtered.length];
    if (next) setSelectedId(next.id);
  }

  return (
    <section className="ns-storefront" aria-label={common.availableCarsLabel}>
      <header className="ns-mast">
        <div>
          <p className="ns-eyebrow">{t.eyebrow}</p>
          <h1 className="ns-mast-heading"><span>{t.first}</span> <em>{t.second}</em></h1>
        </div>
        <div className="ns-stock-count" aria-label={common.availableCount(vehicles.length)}>
          <strong>{vehicles.length}</strong><span>{t.count}</span>
        </div>
      </header>

      <div className="ns-shop">
        <section className="ns-index" aria-labelledby="ns-inventory-heading">
          <div className="ns-index-top">
            <h2 id="ns-inventory-heading">{t.catalogue}</h2>
            <span>{filtered.length} / {vehicles.length}</span>
          </div>
          <div className="ns-filters" role="group" aria-label={t.catalogue}>
            <button type="button" aria-pressed={make === null} onClick={() => chooseMake(null)}>
              {t.all} / {vehicles.length}
            </button>
            {makes.map((option) => (
              <button key={option} type="button" aria-pressed={make === option}
                onClick={() => chooseMake(option)}><bdi>{option}</bdi></button>
            ))}
          </div>
          <ol className="ns-index-list">
            {filtered.map((vehicle, index) => (
              <li key={vehicle.id} className={vehicle.id === selected.id ? "ns-selected" : undefined}>
                <div className="ns-index-entry">
                  <button type="button" className="ns-select"
                    aria-pressed={vehicle.id === selected.id}
                    onClick={() => choose(vehicle.id)}
                    aria-label={t.choose + ": " + vehicleTitle(vehicle)}>
                    <span className="ns-row-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="ns-row-description">
                      <span className="ns-row-eyebrow"><bdi>{makeYearLine(vehicle)}</bdi></span>
                      <span className="ns-row-model"><bdi>{modelLine(vehicle)}</bdi></span>
                      <span className="ns-row-facts"><bdi>{keyFacts(vehicle, locale).join(" · ")}</bdi></span>
                    </span>
                    <span className="ns-row-price"><bdi>{vehicle.priceAed === null ? "" : formatPriceAed(vehicle.priceAed, locale)}</bdi></span>
                  </button>
                  <Link className="ns-row-go"
                    href={localizedPath(locale, { kind: "vehicle", id: vehicle.id })}
                    prefetch={false}
                    aria-label={t.details + ": " + vehicleTitle(vehicle)}>↗</Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ns-feature" ref={featureRef}
          aria-label={t.preview + ": " + vehicleTitle(selected)}>
          <div className="ns-feature-top">
            <span>{t.preview}</span>
            <strong><bdi>{selected.id}</bdi></strong>
          </div>
          <div className={"ns-feature-image " + (cover ? "ns-has-photo" : "ns-no-photo")}>
            {cover ? (
              <Image key={cover.id} src={cover.src} alt={vehicleTitle(selected)}
                fill priority sizes="(min-width: 960px) 58vw, 100vw" />
            ) : <span className="ns-missing-photo" role="status">{t.noPhoto}</span>}
            <div className="ns-feature-gradient" aria-hidden="true" />
            <div className="ns-feature-info">
              <p><bdi>{makeYearLine(selected)}</bdi></p>
              <h2><bdi>{modelLine(selected)}</bdi></h2>
              {selected.priceAed !== null ? (
                <div className="ns-feature-price"><bdi>{formatPriceAed(selected.priceAed, locale)}</bdi></div>
              ) : null}
            </div>
          </div>
          <div className="ns-feature-actions">
            <WhatsAppLink className="ns-action-primary" inquiry={inquiry}
              serverOrigin={serverOrigin}>{common.chatOnWhatsApp} ↗</WhatsAppLink>
            <Link href={vehicleUrl} className="ns-action-secondary" prefetch={false}>{t.view} ↗</Link>
          </div>
          <div className="ns-feature-bottom">
            <span>{String(selectedIndex + 1).padStart(2, "0")} / {String(filtered.length).padStart(2, "0")} · {keyFacts(selected, locale)[0] ?? selected.id}</span>
            <div className="ns-arrows">
              <button type="button" onClick={() => move(-1)} aria-label={t.previous} disabled={filtered.length <= 1}>←</button>
              <button type="button" onClick={() => move(1)} aria-label={t.next} disabled={filtered.length <= 1}>→</button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
