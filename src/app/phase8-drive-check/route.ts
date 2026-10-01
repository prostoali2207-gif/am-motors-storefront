import sharp from "sharp";

import { createDriveReader, DRIVE_READONLY_SCOPE, DriveSourceError } from "@/adapters/google-drive-media/drive-client";
import { MAX_IMAGE_SOURCE_BYTES, resolveFolderMedia, type FolderMedia } from "@/adapters/google-drive-media/folder-media";
import { sanitizeImage } from "@/adapters/google-drive-media/image-pipeline";
import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { createSheetsReader, SHEETS_READONLY_SCOPE } from "@/adapters/google-sheets/sheets-client";
import { readInventorySourceConfig } from "@/lib/env";

/**
 * TEMPORARY Phase 8 read-only diagnostic — removed again before the PR is ready for review.
 *
 * Answers only on a Vercel PREVIEW deployment (behind Vercel Authentication) configured for
 * keyless `vercel-oidc`; everywhere else it is a plain 404. It does not depend on MEDIA_SOURCE
 * and changes nothing in Drive or the Sheet. Output: per public vehicle ID only its status,
 * Website-folder state and counts, plus an in-memory sanitization check of at most one
 * Website/ image. Never folder/file IDs, names, links, bytes or private fields.
 */
export async function GET(): Promise<Response> {
  const config = readInventorySourceConfig();
  if (process.env.VERCEL_ENV !== "preview" || config.kind !== "google-sheets" || config.auth.mode !== "vercel-oidc") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const getAccessToken = createAccessTokenProvider(config.auth, [SHEETS_READONLY_SCOPE, DRIVE_READONLY_SCOPE]);
  const drive = createDriveReader({ getAccessToken });
  const body: Record<string, unknown> = { authMode: config.auth.mode, mediaSourceEnv: config.media };

  try {
    const snapshot = await loadInventorySnapshot(createSheetsReader({ spreadsheetId: config.spreadsheetId, getAccessToken }), {
      readMediaLinks: true,
      log: { info: () => {}, warn: () => {} },
    });
    const vehicles: unknown[] = [];
    let sample: FolderMedia | null = null;
    for (const vehicle of snapshot.vehicles) {
      const ref = snapshot.mediaFolders.find(([id]) => id === vehicle.id)?.[1] ?? { kind: "missing" as const };
      try {
        const media = await resolveFolderMedia(drive, ref);
        vehicles.push({ id: vehicle.id, status: vehicle.status, state: media.state, counts: media.counts });
        if (sample === null && media.files.length > 0) sample = media;
      } catch (error) {
        vehicles.push({ id: vehicle.id, status: vehicle.status, state: "source-error", code: code(error) });
      }
    }
    body.vehicles = vehicles;

    if (sample) {
      const source = await drive.download(sample.files[0].fileId, MAX_IMAGE_SOURCE_BYTES);
      const output = await sanitizeImage(source);
      const meta = await sharp(output.bytes).metadata();
      body.pipelineSample = {
        sourceBytes: source.byteLength,
        outputBytes: output.bytes.byteLength,
        contentType: output.contentType,
        exifRemoved: meta.exif === undefined,
        iccRemoved: meta.icc === undefined,
        xmpRemoved: meta.xmp === undefined,
      };
    } else {
      body.pipelineSample = "no Website/ image available";
    }
  } catch (error) {
    body.error = code(error);
  }

  return Response.json(body, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

function code(error: unknown): string {
  if (error instanceof DriveSourceError) return `drive:${error.code}`;
  if (error instanceof Error && "code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.name : "unknown";
}
