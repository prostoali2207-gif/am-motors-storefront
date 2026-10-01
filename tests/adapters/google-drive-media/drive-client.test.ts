import { describe, expect, it } from "vitest";

import { createDriveReader, DriveSourceError } from "@/adapters/google-drive-media/drive-client";

type Call = { url: URL; init: RequestInit | undefined };

function fakeFetch(respond: (url: URL) => Response) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    return respond(url);
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const token = async () => "TEST-TOKEN";

describe("createDriveReader: metadata requests", () => {
  it("requests only minimal fields — never owners, permissions or image metadata (GPS)", async () => {
    const { calls, fetchImpl } = fakeFetch((url) =>
      url.pathname.endsWith("/files")
        ? json({ files: [{ id: "TESTFILE_1", name: "x", mimeType: "image/jpeg", size: "10" }] })
        : json({ mimeType: "application/vnd.google-apps.folder", trashed: false }),
    );
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    await reader.getFolder("TESTFOLDER_0001");
    const children = await reader.listChildren("TESTFOLDER_0001");

    expect(children).toEqual([
      { id: "TESTFILE_1", name: "x", mimeType: "image/jpeg", size: 10, createdTime: null, md5Checksum: null, version: null },
    ]);
    for (const { url, init } of calls) {
      const fields = url.searchParams.get("fields") ?? "";
      expect(fields).not.toMatch(/owners|permissions|sharingUser|imageMediaMetadata|location|webViewLink|thumbnailLink/);
      expect(url.searchParams.get("supportsAllDrives")).toBe("true");
      expect(init?.cache).toBe("no-store");
      expect(init?.method).toBe("GET");
    }
    const list = calls[1].url;
    expect(list.searchParams.get("q")).toBe("'TESTFOLDER_0001' in parents and trashed = false");
    expect(list.searchParams.get("includeItemsFromAllDrives")).toBe("true");
  });

  it("queries only child FOLDERS with the given name — parent files are never requested", async () => {
    const { calls, fetchImpl } = fakeFetch(() =>
      json({ files: [{ id: "TESTFOLDER_WEB", name: "Website", mimeType: "application/vnd.google-apps.folder" }] }),
    );
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    const folders = await reader.listChildFolders("TESTFOLDER_0001", "Website");
    expect(folders.map((f) => f.id)).toEqual(["TESTFOLDER_WEB"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.searchParams.get("q")).toBe(
      "'TESTFOLDER_0001' in parents and trashed = false and " +
        "mimeType = 'application/vnd.google-apps.folder' and name = 'Website'",
    );
  });

  it("refuses unsafe IDs or names in a query without calling Drive", async () => {
    const { calls, fetchImpl } = fakeFetch(() => json({ files: [] }));
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    await expect(reader.listChildren("x' or name != '")).rejects.toMatchObject({ code: "invalid-id", transient: false });
    await expect(reader.listChildFolders("x' or '1'='1", "Website")).rejects.toMatchObject({ code: "invalid-id" });
    await expect(reader.listChildFolders("TESTFOLDER_0001", "W' or name != '")).rejects.toMatchObject({
      code: "invalid-query",
    });
    expect(calls).toEqual([]);
  });

  it("follows pagination", async () => {
    let page = 0;
    const { fetchImpl } = fakeFetch(() => {
      page += 1;
      return page === 1
        ? json({ files: [{ id: "TESTFILE_1", mimeType: "image/jpeg" }], nextPageToken: "TEST-PAGE-2" })
        : json({ files: [{ id: "TESTFILE_2", mimeType: "video/mp4" }] });
    });
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    expect((await reader.listChildren("TESTFOLDER_0001")).map((c) => c.id)).toEqual(["TESTFILE_1", "TESTFILE_2"]);
  });

  it.each([
    [404, "http-404", false],
    [403, "http-403", true],
    [429, "http-429", true],
    [500, "http-5xx", true],
  ])("maps HTTP %i to %s (transient: %s) without reading the body", async (status, code, transient) => {
    const { fetchImpl } = fakeFetch(() => json({ error: { message: "SECRET-UPSTREAM-DETAIL" } }, status));
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    const error = await reader.getFolder("TESTFOLDER_0001").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DriveSourceError);
    expect(error).toMatchObject({ code, transient });
    expect(String((error as Error).message)).not.toContain("SECRET");
  });

  it("maps auth failures without leaking details", async () => {
    const reader = createDriveReader({
      getAccessToken: async () => {
        throw new Error("SECRET-KEY-MATERIAL");
      },
      fetchImpl: fakeFetch(() => json({})).fetchImpl,
    });
    await expect(reader.getFolder("TESTFOLDER_0001")).rejects.toMatchObject({ code: "auth-failed" });
  });
});

describe("createDriveReader: download", () => {
  it("downloads with alt=media", async () => {
    const { calls, fetchImpl } = fakeFetch(() => new Response(new Uint8Array([1, 2, 3])));
    const reader = createDriveReader({ getAccessToken: token, fetchImpl });
    expect(Array.from(await reader.download("TESTFILE_1", 10))).toEqual([1, 2, 3]);
    expect(calls[0].url.searchParams.get("alt")).toBe("media");
  });

  it("refuses bodies larger than the limit (declared or streamed)", async () => {
    const declared = createDriveReader({
      getAccessToken: token,
      fetchImpl: fakeFetch(() => new Response(new Uint8Array(5), { headers: { "content-length": "999" } })).fetchImpl,
    });
    await expect(declared.download("TESTFILE_1", 10)).rejects.toMatchObject({ code: "too-large" });

    const streamed = createDriveReader({
      getAccessToken: token,
      fetchImpl: fakeFetch(() => new Response(new Uint8Array(20))).fetchImpl,
    });
    await expect(streamed.download("TESTFILE_1", 10)).rejects.toMatchObject({ code: "too-large" });
  });
});
