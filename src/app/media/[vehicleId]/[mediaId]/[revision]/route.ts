import type { NextRequest } from "next/server";

import { isPublicMediaToken } from "@/adapters/google-drive-media/public-media";
import { getVehicleImage } from "@/inventory/queries";
import { MEDIA_CACHE_CONTROL } from "@/lib/media-cache-policy";
import { isResponsiveMediaWidth } from "@/lib/media-image-loader";

/**
 * Controlled media path: `/media/<vehicle ID>/<media ID>/<revision>`.
 *
 * Serves only a current image of a public vehicle's authoritative Drive folder, re-encoded
 * server-side without EXIF/GPS or any other metadata. Drive credentials, file IDs and URLs never
 * reach the browser. The URL changes when the file content changes (`revision`), so a
 * successful response is cacheable by browsers and the CDN; `next/image` builds responsive
 * variants from it.
 *
 * Cache lifetime: see `src/lib/media-cache-policy.ts` (~1 h worst case across the /media,
 * optimized-image and browser layers; no purge tooling in V1).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/media/[vehicleId]/[mediaId]/[revision]">) {
  const { vehicleId, mediaId, revision } = await ctx.params;
  if (!isPublicMediaToken(mediaId, 22) || !isPublicMediaToken(revision, 12)) return notFound();

  // Keep legacy /media paths valid for existing VDPs and shared links.
  // Width variants are finite so no visitor can trigger arbitrary Sharp resizes.
  const rawWidth = new URL(request.url).searchParams.get("w");
  const width = rawWidth === null ? undefined : Number(rawWidth);
  if (rawWidth !== null && (!/^\\d{1,4}$/.test(rawWidth) || !isResponsiveMediaWidth(width!))) return notFound();
  const result = width === undefined
    ? await getVehicleImage(vehicleId, mediaId, revision)
    : await getVehicleImage(vehicleId, mediaId, revision, width);
  switch (result.kind) {
    case "ok":
      return new Response(result.bytes as Uint8Array<ArrayBuffer>, {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Content-Length": String(result.bytes.byteLength),
          "Cache-Control": MEDIA_CACHE_CONTROL,
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      });
    case "not-found":
      return notFound();
    case "unavailable":
      return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}
