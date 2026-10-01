import { describe, expect, it } from "vitest";

import { DRIVE_FOLDER_MIME, DriveSourceError } from "@/adapters/google-drive-media/drive-client";
import {
  classifyChildren,
  classifyMime,
  MAX_IMAGE_SOURCE_BYTES,
  resolveFolderMedia,
} from "@/adapters/google-drive-media/folder-media";
import { naturalCompare, sortTechnicalFallback } from "@/adapters/google-drive-media/ordering";
import { FakeDrive, fakeChild, fakeFolderChild } from "../../support/fake-drive";

describe("classifyMime", () => {
  it.each([
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["image/webp", "image"],
    ["video/mp4", "video"],
    ["video/quicktime", "video"],
    ["video/webm", "video"],
    [DRIVE_FOLDER_MIME, "folder"],
    ["image/heic", "unsupported"],
    ["image/heif", "unsupported"],
    ["image/gif", "unsupported"],
    ["image/svg+xml", "unsupported"],
    ["application/pdf", "unsupported"],
    ["application/vnd.google-apps.document", "unsupported"],
    ["application/vnd.google-apps.shortcut", "unsupported"],
    ["text/plain", "unsupported"],
  ])("%s → %s", (mime, kind) => {
    expect(classifyMime(mime)).toBe(kind);
  });
});

describe("classifyChildren (contents of Website/)", () => {
  it("keeps only JPEG/PNG/WebP images; videos, folders, documents and unsupported files are counted only", () => {
    const jpeg = fakeChild({ mimeType: "image/jpeg", name: "01.jpg" });
    const png = fakeChild({ mimeType: "image/png", name: "02.png" });
    const webp = fakeChild({ mimeType: "image/webp", name: "03.webp" });
    const media = classifyChildren([
      webp,
      fakeChild({ mimeType: "video/mp4", name: "00.mp4" }),
      fakeChild({ mimeType: "video/quicktime", name: "00.mov" }),
      png,
      fakeChild({ mimeType: DRIVE_FOLDER_MIME, name: "sub", size: null, md5Checksum: null }),
      fakeChild({ mimeType: "application/pdf", name: "doc" }),
      fakeChild({ mimeType: "application/vnd.google-apps.document", name: "gdoc", size: null }),
      fakeChild({ mimeType: "application/vnd.google-apps.shortcut", name: "04.jpg", size: null }),
      fakeChild({ mimeType: "image/heic", name: "heic" }),
      jpeg,
    ]);
    expect(media.state).toBe("ok");
    expect(media.files.map((f) => [f.fileId, f.kind])).toEqual([
      [jpeg.id, "image"],
      [png.id, "image"],
      [webp.id, "image"],
    ]);
    expect(media.counts).toEqual({ images: 3, videos: 2, subfolders: 1, unsupported: 4, duplicates: 0, oversized: 0 });
  });

  it("orders by file name: 01.* is the cover, then 02.*, 03.* … (10 after 9)", () => {
    const names = ["10.jpg", "02.jpg", "01.jpg", "9.jpg", "03.png"];
    const files = names.map((name) => fakeChild({ mimeType: name.endsWith("png") ? "image/png" : "image/jpeg", name }));
    const order = classifyChildren(files).files.map((f) => files.find((c) => c.id === f.fileId)!.name);
    expect(order).toEqual(["01.jpg", "02.jpg", "03.png", "9.jpg", "10.jpg"]);
  });

  it("uses the Drive file ID as identity: duplicate names with different IDs are distinct files", () => {
    const first = fakeChild({ mimeType: "image/jpeg", name: "same-name.jpg" });
    const second = fakeChild({ mimeType: "image/jpeg", name: "same-name.jpg" });
    const media = classifyChildren([second, first]);
    expect(media.files.map((f) => f.fileId).sort()).toEqual([first.id, second.id].sort());
  });

  it("drops byte-identical copies (same md5) regardless of name, keeping the first in order", () => {
    const a = fakeChild({ mimeType: "image/jpeg", name: "01.jpg", md5Checksum: "same" });
    const b = fakeChild({ mimeType: "image/png", name: "02.png", md5Checksum: "same" });
    const media = classifyChildren([b, a]);
    expect(media.files.map((f) => f.fileId)).toEqual([a.id]);
    expect(media.counts.duplicates).toBe(1);
  });

  it("one approved image is enough (no padding)", () => {
    const media = classifyChildren([fakeChild({ mimeType: "image/jpeg", name: "01.jpg" })]);
    expect(media.state).toBe("ok");
    expect(media.files).toHaveLength(1);
  });

  it("reports an empty Website/ as empty", () => {
    expect(classifyChildren([])).toMatchObject({ state: "empty", files: [] });
  });

  it("reports videos-only, subfolders-only or unsupported-only Website/ as no-supported-media", () => {
    const videosOnly = classifyChildren([fakeChild({ mimeType: "video/mp4" })]);
    expect(videosOnly).toMatchObject({ state: "no-supported-media", files: [] });
    expect(videosOnly.counts).toMatchObject({ images: 0, videos: 1 });
    const other = classifyChildren([
      fakeChild({ mimeType: DRIVE_FOLDER_MIME, size: null }),
      fakeChild({ mimeType: "application/pdf" }),
    ]);
    expect(other).toMatchObject({ state: "no-supported-media", files: [] });
    expect(other.counts).toMatchObject({ subfolders: 1, unsupported: 1 });
  });

  it("excludes images above the source size limit or without a size", () => {
    const media = classifyChildren([
      fakeChild({ mimeType: "image/jpeg", size: MAX_IMAGE_SOURCE_BYTES + 1 }),
      fakeChild({ mimeType: "image/jpeg", size: null }),
    ]);
    expect(media).toMatchObject({ state: "no-supported-media" });
    expect(media.counts.oversized).toBe(2);
  });

  it("keeps no file names in the result", () => {
    const media = classifyChildren([fakeChild({ mimeType: "image/jpeg", name: "SECRET-NAME-MARKER.jpg" })]);
    expect(JSON.stringify(media)).not.toContain("SECRET-NAME-MARKER");
  });
});

describe("technical fallback ordering", () => {
  it("sorts by natural name, then createdTime, then file ID — independent of input order", () => {
    const files = [
      fakeChild({ mimeType: "image/jpeg", name: "photo 10.jpg" }),
      fakeChild({ mimeType: "image/jpeg", name: "photo 2.jpg" }),
      fakeChild({ mimeType: "image/jpeg", name: "dup.jpg", createdTime: "2001-01-02T00:00:00Z", id: "TESTFILE_B" }),
      fakeChild({ mimeType: "image/jpeg", name: "dup.jpg", createdTime: "2001-01-02T00:00:00Z", id: "TESTFILE_A" }),
      fakeChild({ mimeType: "image/jpeg", name: "dup.jpg", createdTime: "2001-01-01T00:00:00Z", id: "TESTFILE_C" }),
    ];
    const expected = ["TESTFILE_C", "TESTFILE_A", "TESTFILE_B", files[1].id, files[0].id];
    expect(sortTechnicalFallback(files).map((f) => f.id)).toEqual(expected);
    expect(sortTechnicalFallback([...files].reverse()).map((f) => f.id)).toEqual(expected);
  });

  it("compares digit runs numerically and is locale-independent", () => {
    expect(naturalCompare("IMG_2", "IMG_10")).toBeLessThan(0);
    expect(naturalCompare("01", "1")).toBeGreaterThan(0);
    expect(naturalCompare("B", "a")).toBeLessThan(0); // code points: uppercase first
    expect(naturalCompare("a", "a")).toBe(0);
  });
});

describe("resolveFolderMedia (Website/ only)", () => {
  /** Vehicle-root junk that must never be returned: raw shots, ad creatives, documents, videos. */
  const rootJunk = () => [
    fakeChild({ mimeType: "image/jpeg", name: "01.jpg" }),
    fakeChild({ mimeType: "image/png", name: "ROOT-AD-CREATIVE.png" }),
    fakeChild({ mimeType: "video/quicktime", name: "IMG_0001.MOV" }),
    fakeChild({ mimeType: "application/pdf", name: "doc.pdf" }),
  ];
  const resolve = (drive: FakeDrive, folderId = "TESTFOLDER_CAR") => resolveFolderMedia(drive, { kind: "folder", folderId });

  it("maps missing and invalid links without calling Drive", async () => {
    const drive = new FakeDrive({});
    await expect(resolveFolderMedia(drive, { kind: "missing" })).resolves.toMatchObject({ state: "missing-link" });
    await expect(resolveFolderMedia(drive, { kind: "invalid" })).resolves.toMatchObject({ state: "invalid-link" });
    expect(drive.calls).toEqual([]);
  });

  it("returns only images from the single Website/ folder; the vehicle root is never listed", async () => {
    const root = rootJunk();
    const cover = fakeChild({ mimeType: "image/jpeg", name: "01.jpg" });
    const second = fakeChild({ mimeType: "image/webp", name: "02.webp" });
    const drive = new FakeDrive({
      TESTFOLDER_CAR: { kind: "folder", children: [...root, fakeFolderChild("TESTFOLDER_WEB")] },
      TESTFOLDER_WEB: {
        kind: "folder",
        children: [second, fakeChild({ mimeType: "video/mp4", name: "03.mp4" }), cover, fakeFolderChild("TESTFOLDER_NESTED", "More")],
      },
      TESTFOLDER_NESTED: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
    });
    const media = await resolve(drive);
    expect(media.state).toBe("ok");
    expect(media.files.map((f) => f.fileId)).toEqual([cover.id, second.id]);
    for (const file of root) expect(media.files.map((f) => f.fileId)).not.toContain(file.id);
    expect(media.counts).toMatchObject({ images: 2, videos: 1, subfolders: 1 });
    // Root: folder type + a folders-only query. Never `list:` on the root, never recursion.
    expect(drive.calls).toEqual(["get:TESTFOLDER_CAR", "folders:TESTFOLDER_CAR", "list:TESTFOLDER_WEB"]);
  });

  it("missing Website/ fails closed — no fallback to the root files", async () => {
    const drive = new FakeDrive({ TESTFOLDER_CAR: { kind: "folder", children: rootJunk() } });
    await expect(resolve(drive)).resolves.toMatchObject({ state: "no-website-folder", files: [] });
    expect(drive.calls).not.toContain("list:TESTFOLDER_CAR");
  });

  it("an empty vehicle folder is no-website-folder", async () => {
    const drive = new FakeDrive({ TESTFOLDER_CAR: { kind: "folder", children: [] } });
    await expect(resolve(drive)).resolves.toMatchObject({ state: "no-website-folder", files: [] });
  });

  it("empty Website/ fails closed", async () => {
    const drive = new FakeDrive({
      TESTFOLDER_CAR: { kind: "folder", children: [...rootJunk(), fakeFolderChild("TESTFOLDER_WEB")] },
      TESTFOLDER_WEB: { kind: "folder", children: [] },
    });
    await expect(resolve(drive)).resolves.toMatchObject({ state: "empty", files: [] });
  });

  it("Website/ with only videos or unsupported files fails closed", async () => {
    const drive = new FakeDrive({
      TESTFOLDER_CAR: { kind: "folder", children: [...rootJunk(), fakeFolderChild("TESTFOLDER_WEB")] },
      TESTFOLDER_WEB: {
        kind: "folder",
        children: [fakeChild({ mimeType: "video/mp4" }), fakeChild({ mimeType: "image/heic" })],
      },
    });
    await expect(resolve(drive)).resolves.toMatchObject({ state: "no-supported-media", files: [] });
  });

  it("two Website folders fail closed without listing either", async () => {
    const drive = new FakeDrive({
      TESTFOLDER_CAR: {
        kind: "folder",
        children: [fakeFolderChild("TESTFOLDER_WEB1"), fakeFolderChild("TESTFOLDER_WEB2")],
      },
      TESTFOLDER_WEB1: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
      TESTFOLDER_WEB2: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
    });
    await expect(resolve(drive)).resolves.toMatchObject({ state: "duplicate-website-folder", files: [] });
    expect(drive.calls).toEqual(["get:TESTFOLDER_CAR", "folders:TESTFOLDER_CAR"]);
  });

  it("matches the folder name exactly: website, WEBSITE, 'Website ' or a file named Website do not count", async () => {
    for (const child of [
      fakeFolderChild("TESTFOLDER_WEB", "website"),
      fakeFolderChild("TESTFOLDER_WEB", "WEBSITE"),
      fakeFolderChild("TESTFOLDER_WEB", "Website "),
      fakeFolderChild("TESTFOLDER_WEB", "Website photos"),
      fakeChild({ mimeType: "image/jpeg", name: "Website", id: "TESTFOLDER_WEB" }),
      fakeChild({ mimeType: "application/vnd.google-apps.shortcut", name: "Website", id: "TESTFOLDER_WEB" }),
    ]) {
      const drive = new FakeDrive({
        TESTFOLDER_CAR: { kind: "folder", children: [child] },
        TESTFOLDER_WEB: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
      });
      await expect(resolve(drive)).resolves.toMatchObject({ state: "no-website-folder", files: [] });
    }
  });

  it("one exact Website folder next to a differently-cased one is used", async () => {
    const image = fakeChild({ mimeType: "image/jpeg", name: "01.jpg" });
    const drive = new FakeDrive({
      TESTFOLDER_CAR: {
        kind: "folder",
        children: [fakeFolderChild("TESTFOLDER_LOWER", "website"), fakeFolderChild("TESTFOLDER_WEB")],
      },
      TESTFOLDER_LOWER: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
      TESTFOLDER_WEB: { kind: "folder", children: [image] },
    });
    const media = await resolve(drive);
    expect(media.files.map((f) => f.fileId)).toEqual([image.id]);
  });

  it("distinguishes inaccessible, trashed and not-a-folder", async () => {
    const drive = new FakeDrive({
      TESTFOLDER_TRASH: { kind: "folder", children: [], trashed: true },
      TESTFILE_NOTFOLDER: { kind: "file", mimeType: "image/jpeg" },
    });
    await expect(resolve(drive, "TESTFOLDER_MISSING")).resolves.toMatchObject({ state: "inaccessible" });
    await expect(resolve(drive, "TESTFOLDER_TRASH")).resolves.toMatchObject({ state: "inaccessible" });
    await expect(resolve(drive, "TESTFILE_NOTFOLDER")).resolves.toMatchObject({ state: "not-a-folder" });
  });

  it("throws transient source errors so they are not cached", async () => {
    const drive = new FakeDrive({ TESTFOLDER_X: { kind: "error", error: new DriveSourceError("http-5xx", true) } });
    await expect(resolve(drive, "TESTFOLDER_X")).rejects.toBeInstanceOf(DriveSourceError);
  });
});
