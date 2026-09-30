import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VehicleLookupResult } from "@/domain/inventory-result";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

const state = vi.hoisted(() => ({
  lookup: { kind: "not-found" } as unknown,
  host: "site.test" as string | null,
}));

vi.mock("@/inventory/queries", () => ({
  getVehicle: async () => state.lookup,
  listAvailableVehicles: async () => ({ kind: "empty" }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.host === null ? {} : { host: state.host, "x-forwarded-proto": "https" }),
}));

import { alternates } from "@/app/_site/metadata";
import { carsMetadata, homeMetadata, vehicleMetadata, vehiclePage } from "@/app/_site/pages";

const APP = join(process.cwd(), "src/app");
const TREES = { en: "(en)", ar: "ar", ru: "ru" } as const;
const ROUTE_FILES = [
  "layout.tsx",
  "page.tsx",
  "error.tsx",
  "not-found.tsx",
  "[...rest]/page.tsx",
  "cars/page.tsx",
  "cars/[id]/page.tsx",
  "cars/[id]/not-found.tsx",
];

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  state.lookup = { kind: "not-found" };
  state.host = "site.test";
});

describe("route families", () => {
  it.each(Object.entries(TREES))("%s has every route file and passes its own locale", (locale, dir) => {
    for (const file of ROUTE_FILES) {
      const path = join(APP, dir, file);
      expect(existsSync(path), `${dir}/${file}`).toBe(true);
      const text = readFileSync(path, "utf8");
      const locales = [...text.matchAll(/["'](en|ar|ru)["']/g)].map((m) => m[1]);
      expect(locales.every((l) => l === locale), `${dir}/${file} uses only "${locale}"`).toBe(true);
    }
  });

  it("keeps the English URLs unprefixed: no /en tree and the English pages sit in a route group", () => {
    expect(existsSync(join(APP, "en"))).toBe(false);
    expect(existsSync(join(APP, "page.tsx"))).toBe(false);
    expect(existsSync(join(APP, "layout.tsx"))).toBe(false);
  });
});

describe("VDP route", () => {
  it.each(["en", "ar", "ru"] as const)("unknown ID → notFound() (404) in %s", async (locale) => {
    state.lookup = { kind: "not-found" } satisfies VehicleLookupResult;
    await expect(vehiclePage(locale)(params("TEST-9999"))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("renders the localized unavailable state (not a 404, not 'no cars')", async () => {
    state.lookup = { kind: "unavailable", reason: "source-error" } satisfies VehicleLookupResult;
    const html = renderToStaticMarkup(await vehiclePage("ar")(params("TEST-0001")));
    expect(html).toContain("تفاصيل السيارة");
    expect(html).toContain("قائمة السيارات غير متاحة مؤقتاً");
  });

  it("gives a sold car no conversion actions in any language", async () => {
    state.lookup = { kind: "ok", vehicle: syntheticSold } satisfies VehicleLookupResult;
    for (const locale of ["en", "ar", "ru"] as const) {
      const html = renderToStaticMarkup(await vehiclePage(locale)(params("TEST-0002")));
      expect(html).not.toContain("wa.me");
    }
  });
});

describe("metadata", () => {
  it("self-canonical plus en/ar/ru/x-default alternates for a VDP", async () => {
    state.lookup = { kind: "ok", vehicle: syntheticAvailable } satisfies VehicleLookupResult;
    const meta = await vehicleMetadata("ar")(params("TEST-0001"));
    expect(meta.title).toBe("2001 Testmake Fixture Alpha Synthetic Trim");
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates).toEqual({
      canonical: "https://site.test/ar/cars/TEST-0001",
      languages: {
        en: "https://site.test/cars/TEST-0001",
        ar: "https://site.test/ar/cars/TEST-0001",
        ru: "https://site.test/ru/cars/TEST-0001",
        "x-default": "https://site.test/cars/TEST-0001",
      },
    });
  });

  it("keeps sold VDP indexing unchanged (no robots decision added)", async () => {
    state.lookup = { kind: "ok", vehicle: syntheticSold } satisfies VehicleLookupResult;
    const meta = await vehicleMetadata("ru")(params("TEST-0002"));
    expect(meta.robots).toBeUndefined();
  });

  it("noindexes not-found and unavailable VDPs with localized titles, without alternates", async () => {
    state.lookup = { kind: "not-found" };
    expect(await vehicleMetadata("ru")(params("x"))).toEqual({ title: "Автомобиль не найден", robots: { index: false } });
    state.lookup = { kind: "unavailable", reason: "source-error" };
    expect(await vehicleMetadata("ar")(params("x"))).toEqual({ title: "قائمة السيارات غير متاحة", robots: { index: false } });
  });

  it("localizes the /cars title and links the homepage and /cars across languages", async () => {
    const cars = await carsMetadata("ru")();
    expect(cars.title).toBe("Автомобили");
    expect(cars.alternates?.canonical).toBe("https://site.test/ru/cars");
    const home = await homeMetadata("en")();
    expect(home.alternates?.canonical).toBe("https://site.test/");
    expect(home.alternates?.languages).toMatchObject({ ar: "https://site.test/ar", "x-default": "https://site.test/" });
  });

  it("leaves canonical/alternates out when the origin is unknown (never guessed)", async () => {
    state.host = null;
    expect(await alternates("en", { kind: "cars" })).toBeUndefined();
  });
});
