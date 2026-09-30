// @vitest-environment node
import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";

import { ImagePipelineError, MAX_EDGE_PX, sanitizeImage } from "@/adapters/google-drive-media/image-pipeline";

/** Synthetic images generated in memory — no media files exist in the repository. */
async function syntheticJpegWithGps(width = 40, height = 20, orientation?: number): Promise<Uint8Array> {
  let image = sharp({ create: { width, height, channels: 3, background: "#808080" } }).withExif({
    IFD0: { Make: "TESTCAM-MARKER", Artist: "TEST-OWNER-MARKER" },
    IFD3: { GPSLatitudeRef: "N", GPSLatitude: "25/1 11/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "55/1 16/1 0/1" },
  });
  if (orientation) image = image.withMetadata({ orientation });
  return new Uint8Array(await image.jpeg().toBuffer());
}

describe("sanitizeImage", () => {
  it("strips EXIF (incl. GPS) and all other metadata from the output", async () => {
    const input = await syntheticJpegWithGps();
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();
    expect(Buffer.from(input).includes("TESTCAM-MARKER")).toBe(true);

    const output = await sanitizeImage(input);
    const after = await sharp(output.bytes).metadata();
    expect(output.contentType).toBe("image/jpeg");
    expect(after.format).toBe("jpeg");
    expect(after.exif).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(after.iptc).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    const bytes = Buffer.from(output.bytes);
    expect(bytes.includes("TESTCAM-MARKER")).toBe(false);
    expect(bytes.includes("TEST-OWNER-MARKER")).toBe(false);
    expect(bytes.includes("Exif")).toBe(false);
  });

  it("applies the EXIF orientation to the pixels before dropping it", async () => {
    const input = await syntheticJpegWithGps(40, 20, 6); // 90° clockwise
    const after = await sharp((await sanitizeImage(input)).bytes).metadata();
    expect([after.width, after.height]).toEqual([20, 40]);
  });

  it("bounds large originals to the maximum edge without enlarging small ones", async () => {
    const large = new Uint8Array(
      await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#123456" } }).png().toBuffer(),
    );
    const big = await sharp((await sanitizeImage(large)).bytes).metadata();
    expect([big.width, big.height]).toEqual([MAX_EDGE_PX, MAX_EDGE_PX / 2]);

    const small = await sharp((await sanitizeImage(await syntheticJpegWithGps(40, 20))).bytes).metadata();
    expect([small.width, small.height]).toEqual([40, 20]);
  });

  it("accepts PNG and WebP (with alpha flattened) and outputs JPEG", async () => {
    for (const encode of [(s: Sharp) => s.png(), (s: Sharp) => s.webp()]) {
      const input = new Uint8Array(
        await encode(sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })).toBuffer(),
      );
      expect((await sharp((await sanitizeImage(input)).bytes).metadata()).format).toBe("jpeg");
    }
  });

  it("verifies the real format instead of trusting the Drive MIME type", async () => {
    const gif = new Uint8Array(
      await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer(),
    );
    await expect(sanitizeImage(gif)).rejects.toEqual(new ImagePipelineError("unsupported-format"));
    await expect(sanitizeImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).rejects.toBeInstanceOf(
      ImagePipelineError,
    );
    await expect(sanitizeImage(new Uint8Array([1, 2, 3, 4]))).rejects.toEqual(new ImagePipelineError("decode-failed"));
  });
});
