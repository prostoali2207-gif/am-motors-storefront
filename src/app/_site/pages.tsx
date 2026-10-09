import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { GeneralRequest } from "@/components/general-request";
import { InventoryList } from "@/components/inventory-list";
import { InventoryPageHeader } from "@/components/inventory-page-header";
import { InventoryUnavailable } from "@/components/inventory-unavailable";
import { NightShiftShowroom } from "@/components/night-shift-showroom";
import { VehicleDetail } from "@/components/vehicle-detail";
import { vehicleTitle } from "@/domain/vehicle";
import type { Locale } from "@/i18n/locales";
import { messages } from "@/i18n/messages";
import { getVehicle, listAvailableVehicles } from "@/inventory/queries";
import { siteOrigin } from "@/lib/site-origin";
import { alternates } from "./metadata";

/*
 * Route bodies shared by the three language trees (app/(en), app/ar, app/ru). The route files
 * stay one-liners that pass their locale, so every language renders the same states and rules.
 */

type IdParams = { params: Promise<{ id: string }> };

/** Inventory-first homepage: no hero, the available cars start in the first mobile viewport. */
export function homePage(locale: Locale) {
  return async function HomePage() {
    const result = await listAvailableVehicles();
    return (
      <>
        {result.kind === "ok" && result.vehicles.length > 0 ? (
          <NightShiftShowroom
            vehicles={result.vehicles}
            locale={locale}
            serverOrigin={siteOrigin(await headers())}
          />
        ) : (
          <>
            <InventoryPageHeader title={messages(locale).homeTitle} result={result} locale={locale} />
            <InventoryList result={result} headingLevel={2} locale={locale} />
          </>
        )}
        {/* General-request inquiry where browsing ends: after the list, the empty or the unavailable state. */}
        <GeneralRequest locale={locale} />
      </>
    );
  };
}

export function homeMetadata(locale: Locale) {
  return async function generateMetadata(): Promise<Metadata> {
    return { alternates: await alternates(locale, { kind: "home" }) };
  };
}

export function carsPage(locale: Locale) {
  return async function CarsPage() {
    const result = await listAvailableVehicles();
    return (
      <>
        {result.kind === "ok" && result.vehicles.length > 0 ? (
          <NightShiftShowroom
            vehicles={result.vehicles}
            locale={locale}
            serverOrigin={siteOrigin(await headers())}
          />
        ) : (
          <>
            <InventoryPageHeader title={messages(locale).carsTitle} result={result} locale={locale} />
            <InventoryList result={result} headingLevel={2} locale={locale} />
          </>
        )}
        {/* General-request inquiry where browsing ends: after the list, the empty or the unavailable state. */}
        <GeneralRequest locale={locale} />
      </>
    );
  };
}

export function carsMetadata(locale: Locale) {
  return async function generateMetadata(): Promise<Metadata> {
    return { title: messages(locale).carsMetaTitle, alternates: await alternates(locale, { kind: "cars" }) };
  };
}

// No loading.tsx for the VDP segments on purpose: an unknown ID must return a real 404 status,
// which requires the response not to be streamed before `notFound()` runs.

export function vehicleMetadata(locale: Locale) {
  return async function generateMetadata(props: IdParams): Promise<Metadata> {
    const { id } = await props.params;
    const result = await getVehicle(id);
    const t = messages(locale);

    switch (result.kind) {
      case "ok":
        // The title is built from public Sheet values only and is the same in every language.
        return {
          title: vehicleTitle(result.vehicle),
          alternates: await alternates(locale, { kind: "vehicle", id: result.vehicle.id }),
        };
      case "not-found":
        return { title: t.carNotFoundTitle, robots: { index: false } };
      case "unavailable":
        return { title: t.unavailableMetaTitle, robots: { index: false } };
      default: {
        const unhandled: never = result;
        return unhandled;
      }
    }
  };
}

export function vehiclePage(locale: Locale) {
  return async function VehiclePage(props: IdParams) {
    const { id } = await props.params;
    const result = await getVehicle(id);

    switch (result.kind) {
      case "ok":
        // The VDP URL in WhatsApp messages uses the origin the visitor actually used.
        return <VehicleDetail vehicle={result.vehicle} locale={locale} serverOrigin={siteOrigin(await headers())} />;
      case "not-found":
        notFound();
      case "unavailable":
        return (
          <section className="status-page">
            <h1 className="page-title">{messages(locale).vehicleDetailsTitle}</h1>
            <InventoryUnavailable locale={locale} />
            <GeneralRequest locale={locale} />
          </section>
        );
      default: {
        const unhandled: never = result;
        return unhandled;
      }
    }
  };
}

/** Any other path inside a language tree → that language's 404 page (real 404 status). */
export function unmatchedPage() {
  return function UnmatchedPage(): never {
    notFound();
  };
}
