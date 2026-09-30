import { describe, expect, it } from "vitest";

import { DRIVE_FOLDER_MIME, DriveSourceError } from "@/adapters/google-drive-media/drive-client";
import {
  classifyChildren,
  classifyMime,
  MAX_IMAGE_SOURCE_BYTES,
  resolveFolderMedia,
} from "@/adapters/google-drive-media/folder-media";
import { naturalCompare, sortTechnicalFallback } from "@/adapters/google-drive-media/ordering";
import { FakeDrive, fakeChild } from "../../support/fake-drive";

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

describe("classifyChildren", () => {
  it("keeps images and videos, excludes folders, documents and unsupported files", () => {
    const image = fakeChild({ mimeType: "image/jpeg", name: "a" });
    const video = fakeChild({ mimeType: "video/mp4", name: "b" });
    const media = classifyChildren([
      image,
      video,
      fakeChild({ mimeType: DRIVE_FOLDER_MIME, name: "sub", size: null, md5Checksum: null }),
      fakeChild({ mimeType: "application/pdf", name: "doc" }),
      fakeChild({ mimeType: "application/vnd.google-apps.document", name: "gdoc", size: null }),
      fakeChild({ mimeType: "image/heic", name: "heic" }),
    ]);
    expect(media.state).toBe("ok");
    expect(media.files.map((f) => [f.fileId, f.kind])).toEqual([
      [image.id, "image"],
      [video.id, "video"],
    ]);
    expect(media.counts).toEqual({ images: 1, videos: 1, subfolders: 1, unsupported: 3, duplicates: 0, oversized: 0 });
  });

  it("uses the Drive file ID as identity: duplicate names with different IDs are distinct files", () => {
    const first = fakeChild({ mimeType: "image/jpeg", name: "same-name.jpg" });
    const second = fakeChild({ mimeType: "image/jpeg", name: "same-name.jpg" });
    const media = classifyChildren([second, first]);
    expect(media.files.map((f) => f.fileId).sort()).toEqual([first.id, second.id].sort());
    expect(new Set(media.files.map((f) => f.fileId)).size).toBe(2);
  });

  it("drops byte-identical copies (same md5) regardless of name, keeping the first in order", () => {
    const a = fakeChild({ mimeType: "video/quicktime", name: "clip.mov", md5Checksum: "same" });
    const b = fakeChild({ mimeType: "video/quicktime", name: "clip.mov", md5Checksum: "same" });
    const media = classifyChildren([b, a]);
    expect(media.files).toHaveLength(1);
    expect(media.counts.duplicates).toBe(1);
  });

  it("reports an empty folder as empty", () => {
    expect(classifyChildren([])).toMatchObject({ state: "empty", files: [] });
  });

  it("reports a folder with only subfolders/unsupported files as no-supported-media", () => {
    const media = classifyChildren([
      fakeChild({ mimeType: DRIVE_FOLDER_MIME, size: null }),
      fakeChild({ mimeType: "application/pdf" }),
    ]);
    expect(media).toMatchObject({ state: "no-supported-media", files: [] });
    expect(media.counts).toMatchObject({ subfolders: 1, unsupported: 1 });
  });

  it("handles images-only and videos-only folders", () => {
    expect(classifyChildren([fakeChild({ mimeType: "image/png" })]).counts).toMatchObject({ images: 1, videos: 0 });
    const videosOnly = classifyChildren([fakeChild({ mimeType: "video/mp4" })]);
    expect(videosOnly.state).toBe("ok");
    expect(videosOnly.counts).toMatchObject({ images: 0, videos: 1 });
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

describe("resolveFolderMedia", () => {
  it("maps missing and invalid links without calling Drive", async () => {
    const drive = new FakeDrive({});
    await expect(resolveFolderMedia(drive, { kind: "missing" })).resolves.toMatchObject({ state: "missing-link" });
    await expect(resolveFolderMedia(drive, { kind: "invalid" })).resolves.toMatchObject({ state: "invalid-link" });
    expect(drive.calls).toEqual([]);
  });

  it("reads only the vehicle's own folder (direct children, no recursion)", async () => {
    const sub = fakeChild({ mimeType: DRIVE_FOLDER_MIME, id: "TESTFOLDER_SUB", size: null });
    const drive = new FakeDrive({
      TESTFOLDER_ONE: { kind: "folder", children: [sub, fakeChild({ mimeType: "image/jpeg" })] },
      TESTFOLDER_SUB: { kind: "folder", children: [fakeChild({ mimeType: "image/jpeg" })] },
    });
    const media = await resolveFolderMedia(drive, { kind: "folder", folderId: "TESTFOLDER_ONE" });
    expect(media.files).toHaveLength(1);
    expect(drive.calls).toEqual(["get:TESTFOLDER_ONE", "list:TESTFOLDER_ONE"]);
  });

  it("distinguishes inaccessible, trashed and not-a-folder", async () => {
    const drive = new FakeDrive({
      TESTFOLDER_TRASH: { kind: "folder", children: [], trashed: true },
      TESTFILE_NOTFOLDER: { kind: "file", mimeType: "image/jpeg" },
    });
    const resolve = (folderId: string) => resolveFolderMedia(drive, { kind: "folder", folderId });
    await expect(resolve("TESTFOLDER_MISSING")).resolves.toMatchObject({ state: "inaccessible" });
    await expect(resolve("TESTFOLDER_TRASH")).resolves.toMatchObject({ state: "inaccessible" });
    await expect(resolve("TESTFILE_NOTFOLDER")).resolves.toMatchObject({ state: "not-a-folder" });
  });

  it("throws transient source errors so they are not cached", async () => {
    const drive = new FakeDrive({ TESTFOLDER_X: { kind: "error", error: new DriveSourceError("http-5xx", true) } });
    await expect(resolveFolderMedia(drive, { kind: "folder", folderId: "TESTFOLDER_X" })).rejects.toBeInstanceOf(
      DriveSourceError,
    );
  });
});
