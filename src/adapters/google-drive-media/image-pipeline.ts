import "server-only";

import sharp from "sharp";

/**
 * Re-encodes a source image into a browser-safe JPEG without any metadata.
 *
 * - sharp drops ALL metadata on output unless asked to keep it (`keepMetadata`/`withMetadata`
 *   are never called): EXIF (incl. GPS), XMP, IPTC and ICC comments are removed. The EXIF
 *   orientation is applied to the pixels first (`rotate()`), so dropping it is lossless.
 * - Output is resized to fit within `MAX_EDGE_PX` (never enlarged), so huge originals are not
 *   served as-is. `next/image` derives the responsive sizes from this output.
 * - Input is verified by decoding, not trusted from the Drive MIME type: only JPEG, PNG and
 *   WebP are accepted; animated input is rejected by reading the first frame only.
 * - sharp is already the image library Next.js itself uses for optimization; no new library
 *   family is introduced.
 */
export const MAX_EDGE_PX = 2048;
const MAX_INPUT_PIXELS = 100_000_000;
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

export interface SanitizedImage {
  readonly bytes: Uint8Array;
  readonly contentType: "image/jpeg";
}

export class ImagePipelineError extends Error {
  constructor(readonly code: "unsupported-format" | "decode-failed") {
    super(`image pipeline: ${code}`);
    this.name = "ImagePipelineError";
  }
}

export async function sanitizeImage(input: Uint8Array): Promise<SanitizedImage> {
  const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", pages: 1 } as const;

  let format: string | undefined;
  try {
    format = (await sharp(input, options).metadata()).format;
  } catch {
    throw new ImagePipelineError("decode-failed");
  }
  if (format === undefined || !ACCEPTED_FORMATS.has(format)) {
    throw new ImagePipelineError("unsupported-format");
  }

  try {
    const output = await sharp(input, options)
      .rotate()
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { bytes: new Uint8Array(output), contentType: "image/jpeg" };
  } catch {
    throw new ImagePipelineError("decode-failed");
  }
}
