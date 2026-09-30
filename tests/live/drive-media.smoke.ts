import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createDriveReader, DRIVE_READONLY_SCOPE, DriveSourceError } from "@/adapters/google-drive-media/drive-client";
import { MAX_IMAGE_SOURCE_BYTES, resolveFolderMedia, type FolderMedia } from "@/adapters/google-drive-media/folder-media";
import { sanitizeImage } from "@/adapters/google-drive-media/image-pipeline";
import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { createSheetsReader, SHEETS_READONLY_SCOPE } from "@/adapters/google-sheets/sheets-client";
import { readInventorySourceConfig } from "@/lib/env";

/**
 * READ-ONLY live Drive media smoke test (`npm run smoke:media`). Requires real server env vars
 * and the vehicle folders shared with the service account.
 *
 * Prints per public vehicle: ID (public), status, media state and counts. Never prints links,
 * folder/file IDs, file names, owners or bytes. Downloads and sanitizes ONE image in memory to
 * prove the pipeline end to end; nothing is written to disk.
 */
describe("live Google Drive media (read-only smoke)", () => {
  it("resolves every public vehicle's media folder through the adapter", async () => {
    const config = readInventorySourceConfig();
    if (config.kind !== "google-sheets") {
      const detail = config.kind === "invalid" ? config.problems.join(", ") : "INVENTORY_SOURCE unset";
      throw new Error(`BLOCKED: live source not configured (${detail})`);
    }

    const getAccessToken = createAccessTokenProvider(config.auth, [SHEETS_READONLY_SCOPE, DRIVE_READONLY_SCOPE]);
    const sheets = createSheetsReader({ spreadsheetId: config.spreadsheetId, getAccessToken });
    const drive = createDriveReader({ getAccessToken });

    const snapshot = await loadInventorySnapshot(sheets, {
      readMediaLinks: true,
      log: { info: (m) => console.info(`[smoke] ${m}`), warn: (m) => console.info(`[smoke] ${m}`) },
    });

    const states = new Map<string, number>();
    let sampled: FolderMedia | null = null;
    for (const vehicle of snapshot.vehicles) {
      const ref = snapshot.mediaFolders.find(([id]) => id === vehicle.id)?.[1] ?? { kind: "missing" as const };
      let media: FolderMedia;
      try {
        media = await resolveFolderMedia(drive, ref);
      } catch (error) {
        const code = error instanceof DriveSourceError ? error.code : "unknown";
        console.info(`[smoke] ${vehicle.id} (${vehicle.status}): source-error (${code})`);
        states.set("source-error", (states.get("source-error") ?? 0) + 1);
        continue;
      }
      const c = media.counts;
      console.info(
        `[smoke] ${vehicle.id} (${vehicle.status}): ${media.state}; images ${c.images}, videos ${c.videos}, ` +
          `subfolders ${c.subfolders}, unsupported ${c.unsupported}, duplicates ${c.duplicates}, oversized ${c.oversized}`,
      );
      states.set(media.state, (states.get(media.state) ?? 0) + 1);
      if (sampled === null && media.files.some((f) => f.kind === "image")) sampled = media;
    }
    console.info(`[smoke] states: ${[...states].map(([s, n]) => `${s} ${n}`).join(", ")}`);

    if (sampled) {
      const file = sampled.files.find((f) => f.kind === "image")!;
      const source = await drive.download(file.fileId, MAX_IMAGE_SOURCE_BYTES);
      const output = await sanitizeImage(source);
      const meta = await sharp(output.bytes).metadata();
      console.info(`[smoke] pipeline sample: ${source.byteLength} → ${output.bytes.byteLength} bytes, exif removed: ${meta.exif === undefined}`);
      expect(meta.exif).toBeUndefined();
    } else {
      console.info("[smoke] pipeline sample: no readable image found");
    }
  });
});
