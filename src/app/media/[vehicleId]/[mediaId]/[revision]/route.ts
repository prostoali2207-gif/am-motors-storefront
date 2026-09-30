import type { NextRequest } from "next/server";

import { isPublicMediaToken } from "@/adapters/google-drive-media/public-media";
import { getVehicleImage } from "@/inventory/queries";
import { MEDIA_CACHE_CONTROL } from "@/lib/media-cache-policy";

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
export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[vehicleId]/[mediaId]/[revision]">) {
  const { vehicleId, mediaId, revision } = await ctx.params;
  if (!isPublicMediaToken(mediaId, 22) || !isPublicMediaToken(revision, 12)) return notFound();

  const result = await getVehicleImage(vehicleId, mediaId, revision);
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
