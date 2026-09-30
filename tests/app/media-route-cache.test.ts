// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaImageResult } from "@/domain/inventory-result";
import {
  MEDIA_CACHE_CONTROL,
  MEDIA_CACHE_SECONDS,
  MEDIA_WORST_CASE_SECONDS,
} from "@/lib/media-cache-policy";
import nextConfig from "../../next.config";

const getVehicleImage = vi.fn<(...args: string[]) => Promise<MediaImageResult>>();
vi.mock("@/inventory/queries", () => ({ getVehicleImage: (...args: string[]) => getVehicleImage(...args) }));

const { GET } = await import("@/app/media/[vehicleId]/[mediaId]/[revision]/route");

const MEDIA_ID = "A".repeat(22);
const REV = "B".repeat(12);

function call(vehicleId = "TEST-0001", mediaId = MEDIA_ID, revision = REV) {
  const ctx = { params: Promise.resolve({ vehicleId, mediaId, revision }) };
  return GET(new Request(`http://test.invalid/media/${vehicleId}/${mediaId}/${revision}`) as never, ctx as never);
}

function directives(header: string | null): Map<string, string> {
  return new Map(
    (header ?? "").split(",").map((part) => {
      const [key, value = ""] = part.trim().split("=");
      return [key.toLowerCase(), value];
    }),
  );
}

beforeEach(() => getVehicleImage.mockReset());

describe("media cache policy (V1, no purge tooling)", () => {
  it("bounds a removed photo to about one hour across all cache layers", () => {
    expect(MEDIA_CACHE_SECONDS).toBe(1200);
    expect(MEDIA_WORST_CASE_SECONDS).toBeLessThanOrEqual(3600);
  });

  it("keeps next/image minimumCacheTTL equal to the /media lifetime (not the 4 h Next 16 default)", () => {
    expect(nextConfig.images?.minimumCacheTTL).toBe(MEDIA_CACHE_SECONDS);
  });

  it("gives browser and CDN the same short lifetime: no longer s-maxage, no immutable, no SWR", () => {
    const d = directives(MEDIA_CACHE_CONTROL);
    expect(d.has("public")).toBe(true);
    expect(Number(d.get("max-age"))).toBe(MEDIA_CACHE_SECONDS);
    // Next's optimizer takes s-maxage first, then max-age: both must be the bounded value.
    expect(Number(d.get("s-maxage"))).toBe(MEDIA_CACHE_SECONDS);
    for (const extending of ["immutable", "stale-while-revalidate", "stale-if-error"]) {
      expect(d.has(extending)).toBe(false);
    }
  });
});

describe("GET /media/[vehicleId]/[mediaId]/[revision]", () => {
  it("serves an image with the bounded cache header", async () => {
    getVehicleImage.mockResolvedValue({ kind: "ok", bytes: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=1200, s-maxage=1200");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(getVehicleImage).toHaveBeenCalledWith("TEST-0001", MEDIA_ID, REV);
  });

  it("never caches not-found or unavailable responses", async () => {
    getVehicleImage.mockResolvedValue({ kind: "not-found" });
    const missing = await call();
    expect([missing.status, missing.headers.get("cache-control")]).toEqual([404, "no-store"]);

    getVehicleImage.mockResolvedValue({ kind: "unavailable", reason: "source-error" });
    const down = await call();
    expect([down.status, down.headers.get("cache-control")]).toEqual([503, "no-store"]);
  });

  it("rejects malformed tokens without any lookup", async () => {
    const response = await call("TEST-0001", "TESTFILEID_raw_drive_id", REV);
    expect([response.status, response.headers.get("cache-control")]).toEqual([404, "no-store"]);
    expect(getVehicleImage).not.toHaveBeenCalled();
  });
});
