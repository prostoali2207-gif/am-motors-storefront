import { describe, expect, it } from "vitest";

import mediaImageLoader, { isResponsiveMediaWidth, MEDIA_RESPONSIVE_WIDTHS } from "@/lib/media-image-loader";

const SOURCE = "/media/TEST-0001/AAAAAAAAAAAAAAAAAAAAAA/BBBBBBBBBBBB";

describe("first-party responsive image loader", () => {
  it("emits finite, direct /media widths instead of the broken Next optimizer", () => {
    for (const width of MEDIA_RESPONSIVE_WIDTHS) {
      expect(isResponsiveMediaWidth(width)).toBe(true);
      expect(mediaImageLoader({ src: SOURCE, width })).toBe(`${SOURCE}?w=${width}`);
      expect(mediaImageLoader({ src: SOURCE, width })).not.toContain("/_next/image");
    }
  });

  it("rejects arbitrary resize dimensions and unapproved sources", () => {
    for (const width of [1, 100, 1000, 3840, -1, 640.2]) {
      expect(() => mediaImageLoader({ src: SOURCE, width })).toThrow();
    }
    for (const src of [
      "https://drive.google.com/file/d/private",
      "https://example.org/photo.jpg",
      "/media/TEST-0001/SECRET_DRIVE_FILE_ID/BBBBBBBBBBBB?unexpected=1",
      "/media/TEST-0001/AAAAAAAAAAAAAAAAAAAAAA/BBBBBBBBBBBB?another=1",
    ]) {
      expect(() => mediaImageLoader({ src, width: 640 })).toThrow();
    }
  });

  it("accepts encoded public vehicle IDs without exposing Drive file IDs", () => {
    expect(mediaImageLoader({ src: "/media/%D8%B3%D9%8A%D8%A7%D8%B1%D8%A9/AAAAAAAAAAAAAAAAAAAAAA/BBBBBBBBBBBB", width: 480 }))
      .toMatch(/\?w=480$/);
  });
});
