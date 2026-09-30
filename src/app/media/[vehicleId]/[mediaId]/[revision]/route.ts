import type { NextRequest } from "next/server";

import { isPublicMediaToken } from "@/adapters/google-drive-media/public-media";
import { getVehicleImage } from "@/inventory/queries";

/**
 * Controlled media path: `/media/<vehicle ID>/<media ID>/<revision>`.
 *
 * Serves only a current image of a public vehicle's authoritative Drive folder, re-encoded
 * server-side without EXIF/GPS or any other metadata. Drive credentials, file IDs and URLs never
 * reach the browser. The URL changes when the file content changes (`revision`), so a
 * successful response is cacheable by browsers and the CDN; `next/image` builds responsive
 * variants from it.
 *
 * Cache trade-off (pending review): a photo removed from Drive disappears from pages within the
 * media listing window (~5 min), but an already-cached URL can keep serving from caches for up
 * to `s-maxage`. Purging needs a cache invalidation or redeploy.
 */
const SUCCESS_CACHE = "public, max-age=86400, s-maxage=604800";

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
          "Cache-Control": SUCCESS_CACHE,
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
