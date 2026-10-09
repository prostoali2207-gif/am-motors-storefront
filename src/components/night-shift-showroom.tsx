"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { vehicleTitle, type Vehicle } from "@/domain/vehicle";
import { vehicleImages } from "@/domain/vehicle-media";
import { localizedPath, type Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { formatPriceAed, keyFacts, makeYearLine, modelLine } from "./format";
import { WhatsAppLink } from "./whatsapp-link";

const copy: Record<Locale, {
  eyebrow: string; first: string; second: string; count: string; catalogue: string;
  all: string; view: string; noPhoto: string; reference: string;
}> = {
  en: { eyebrow: "UAE / Cars available", first: "ON THE", second: "LOT.",
    count: "in stock", catalogue: "The inventory", all: "All", view: "View car",
    noPhoto: "Photos unavailable", reference: "Ref" },
  ru: { eyebrow: "ОАЭ / В наличии", first: "НАШИ", second: "АВТО.",
    count: "в наличии", catalogue: "Каталог автомобилей", all: "Все", view: "Смотреть авто",
    noPhoto: "Фото недоступны", reference: "Ref" },
  ar: { eyebrow: "الإمارات / سيارات متوفرة", first: "سيارات", second: "متوفرة",
    count: "متوفرة", catalogue: "قائمة السيارات", all: "الكل", view: "تفاصيل السيارة",
    noPhoto: "الصور غير متوفرة", reference: "Ref" },
};

/**
 * Photo-first vertical vehicle cards, explicitly approved as the mobile catalog interaction.
 *
 * Every vehicle is visible just by scrolling; there is no selected-car preview or
 * duplicated selection interaction. The source order, statuses, fields, images, VDP URLs
 * and WhatsApp prefills all continue to come from the existing public repository.
 *
 * Only approved Drive Website/ covers are used; unavailable photos are never substituted.
 */
export function NightShiftShowroom({
  vehicles, locale, serverOrigin,
}: {
  vehicles: readonly Vehicle[];
  locale: Locale;
  serverOrigin: string | null;
}) {
  const t = copy[locale];
  const common = messages(locale);
  const [make, setMake] = useState<string | null>(null);
  const available = vehicles.filter((vehicle) => vehicle.status === "available");
  const makes = [...new Set(available.map((vehicle) => vehicle.make))];
  const filtered = make === null ? available : available.filter((vehicle) => vehicle.make === make);

  return (
    <section className="ns-storefront" aria-label={common.availableCarsLabel}>
      <header className="ns-mast">
        <div>
          <p className="ns-eyebrow">{t.eyebrow}</p>
          <h1 className="ns-mast-heading"><span>{t.first}</span> <em>{t.second}</em></h1>
        </div>
        <div className="ns-stock-count" aria-label={common.availableCount(available.length)}>
          <strong>{available.length}</strong><span>{t.count}</span>
        </div>
      </header>

      <div className="ns-catalog">
        <div className="ns-catalog-heading">
          <h2 id="ns-inventory-heading">{t.catalogue}</h2>
          <span>{filtered.length} / {available.length}</span>
        </div>

        <div className="ns-filters" role="group" aria-label={t.catalogue}>
          <button type="button" aria-pressed={make === null} onClick={() => setMake(null)}>
            {t.all} / {available.length}
          </button>
          {makes.map((option) => (
            <button key={option} type="button" aria-pressed={make === option}
              onClick={() => setMake(option)}><bdi>{option}</bdi></button>
          ))}
        </div>

        <ul className="ns-photo-grid" aria-label={common.availableCarsLabel}>
          {filtered.map((vehicle, index) => {
            const title = vehicleTitle(vehicle);
            const cover = vehicleImages(vehicle.media)[0];
            const path = localizedPath(locale, { kind: "vehicle", id: vehicle.id });
            const facts = keyFacts(vehicle, locale);
            const inquiry = {
              kind: "vehicle" as const,
              intent: "question" as const,
              id: vehicle.id, title, path, locale,
            };
            return (
              <li key={vehicle.id}>
                <article className={cover ? "ns-photo-card" : "ns-photo-card ns-photo-card--no-photo"}>
                  {cover ? (
                    <Link className="ns-photo-card-media" href={path} prefetch={false}
                      aria-label={title}>
                      <Image src={cover.src} alt="" fill
                        sizes="(min-width: 1180px) 45vw, (min-width: 720px) 47vw, 100vw"
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : undefined} />
                      <span className="ns-photo-card-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    </Link>
                  ) : (
                    <div className="ns-photo-card-unavailable">
                      <span className="ns-photo-card-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <span>{t.noPhoto}</span>
                    </div>
                  )}
                  <div className="ns-photo-card-details">
                    <div className="ns-photo-card-overline">
                      <span><bdi>{makeYearLine(vehicle)}</bdi></span>
                      <span><bdi>{t.reference}: {vehicle.id}</bdi></span>
                    </div>
                    <div className="ns-photo-card-headline">
                      <h3>
                        <Link href={path} prefetch={false}><bdi>{modelLine(vehicle)}</bdi></Link>
                      </h3>
                      {vehicle.priceAed !== null ? (
                        <p className="ns-photo-card-price"><bdi>{formatPriceAed(vehicle.priceAed, locale)}</bdi></p>
                      ) : null}
                    </div>
                    {facts.length > 0 ? (
                      <ul className="ns-photo-card-facts">
                        {facts.map((fact, factIndex) => <li key={factIndex}><bdi>{fact}</bdi></li>)}
                      </ul>
                    ) : null}
                    <div className="ns-photo-card-actions">
                      <WhatsAppLink className="ns-card-whatsapp" inquiry={inquiry}
                        serverOrigin={serverOrigin}>{common.chatOnWhatsApp} <span aria-hidden="true">↗</span></WhatsAppLink>
                      <Link className="ns-card-view" href={path} prefetch={false}>
                        {t.view} <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
