import { describe, expect, it, vi } from "vitest";

import { DRIVE_FOLDER_MIME, DriveSourceError } from "@/adapters/google-drive-media/drive-client";
import { createMediaService } from "@/adapters/google-drive-media/media-service";
import { isPublicMediaToken, publicMediaId } from "@/adapters/google-drive-media/public-media";
import { loadInventorySnapshot } from "@/adapters/google-sheets/loader";
import { MEDIA_LINK_COLUMN } from "@/adapters/google-sheets/schema";
import { GoogleSheetsInventoryRepository } from "@/adapters/google-sheets/sheets-repository";
import type { Vehicle } from "@/domain/vehicle";
import type { VehicleImage } from "@/domain/vehicle-media";
import { FakeDrive, fakeChild, fakeFolderChild, TEST_FOLDER_LINK } from "../../support/fake-drive";
import { FakeSheet, PRIVATE_MARKERS, syntheticRow } from "../../support/fake-sheet";

const NOW = Date.UTC(2026, 0, 15);
const quietLog = { info: () => {}, warn: () => {} };

const IMG_A = fakeChild({ mimeType: "image/jpeg", name: "SECRET-FILENAME-A.jpg", id: "TESTFILEID_IMAGE_AAAA" });
const IMG_B = fakeChild({ mimeType: "image/png", name: "SECRET-FILENAME-A.jpg", id: "TESTFILEID_IMAGE_BBBB" });
const VIDEO = fakeChild({ mimeType: "video/quicktime", name: "SECRET-FILENAME-V.mov", id: "TESTFILEID_VIDEO_CCCC" });
/** Files in a vehicle ROOT folder (raw shots, ad creatives): must never be published. */
const ROOT_IMAGE = fakeChild({ mimeType: "image/jpeg", name: "01.jpg", id: "TESTFILEID_ROOTIMG_DD" });
const ROOT_VIDEO = fakeChild({ mimeType: "video/mp4", name: "SECRET-FILENAME-R.mp4", id: "TESTFILEID_ROOTVID_EE" });

/** Synthetic vehicles covering each media state; one Sheet, one Drive. */
function setup(options: { log?: (m: string) => void } = {}) {
  const sheet = new FakeSheet([
    syntheticRow({ ID: "TEST-0001", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_OK_000001") }),
    syntheticRow({ ID: "TEST-0002", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_DENIED_02") }),
    syntheticRow({ ID: "TEST-0003", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_FLAKY_003") }),
    syntheticRow({ ID: "TEST-0004", [MEDIA_LINK_COLUMN]: "see WhatsApp" }),
    syntheticRow({ ID: "TEST-0005", [MEDIA_LINK_COLUMN]: undefined }),
    syntheticRow({ ID: "TEST-0006", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_EMPTY_006") }),
    syntheticRow({ ID: "TEST-0007", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_DOCS_0007") }),
    syntheticRow({ ID: "TEST-0009", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_NOWEB_009") }),
    syntheticRow({ ID: "TEST-0011", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_TWOWEB_11") }),
    syntheticRow({ ID: "TEST-0008", Статус: "Продана", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_OK_000001") }),
  ]);
  const drive = new FakeDrive(
    {
      TESTFOLDERID_OK_000001: {
        kind: "folder",
        children: [ROOT_IMAGE, ROOT_VIDEO, fakeFolderChild("TESTFOLDERID_WEB_00001")],
      },
      TESTFOLDERID_WEB_00001: {
        kind: "folder",
        children: [IMG_B, VIDEO, IMG_A, fakeChild({ mimeType: DRIVE_FOLDER_MIME, size: null })],
      },
      TESTFOLDERID_FLAKY_003: { kind: "error", error: new DriveSourceError("http-5xx", true) },
      TESTFOLDERID_EMPTY_006: { kind: "folder", children: [ROOT_IMAGE, fakeFolderChild("TESTFOLDERID_WEB_EMPTY6")] },
      TESTFOLDERID_WEB_EMPTY6: { kind: "folder", children: [] },
      TESTFOLDERID_DOCS_0007: { kind: "folder", children: [fakeFolderChild("TESTFOLDERID_WEB_DOCS07")] },
      TESTFOLDERID_WEB_DOCS07: { kind: "folder", children: [fakeChild({ mimeType: "application/pdf" }), ROOT_VIDEO] },
      TESTFOLDERID_NOWEB_009: { kind: "folder", children: [ROOT_IMAGE, ROOT_VIDEO] },
      TESTFOLDERID_TWOWEB_11: {
        kind: "folder",
        children: [fakeFolderChild("TESTFOLDERID_WEB_DUP_A"), fakeFolderChild("TESTFOLDERID_WEB_DUP_B")],
      },
      TESTFOLDERID_WEB_DUP_A: { kind: "folder", children: [IMG_A] },
      TESTFOLDERID_WEB_DUP_B: { kind: "folder", children: [IMG_B] },
    },
    { [IMG_A.id]: new Uint8Array([0xa]), [IMG_B.id]: new Uint8Array([0xb]), [ROOT_IMAGE.id]: new Uint8Array([0xd]) },
  );
  const sanitize = vi.fn(async (bytes: Uint8Array) => ({ bytes: new Uint8Array([...bytes, 0xff]), contentType: "image/jpeg" as const }));
  const log = options.log ?? (() => {});
  const media = createMediaService({ reader: drive, sanitize, log });
  const repo = new GoogleSheetsInventoryRepository(async () => {
    const snapshot = await loadInventorySnapshot(sheet, { now: () => NOW, log: quietLog, readMediaLinks: true });
    return { kind: "ok", ...snapshot };
  }, media);
  return { sheet, drive, repo, sanitize };
}

async function vehicles(repo: GoogleSheetsInventoryRepository): Promise<Vehicle[]> {
  const result = await repo.listAvailable();
  if (result.kind !== "ok") throw new Error(`unexpected ${result.kind}`);
  return [...result.vehicles];
}

/** One vehicle as the VDP reads it (the only read that resolves media). */
async function vdp(repo: GoogleSheetsInventoryRepository, id: string): Promise<Vehicle> {
  const result = await repo.getById(id);
  if (result.kind !== "ok") throw new Error(`unexpected ${result.kind}`);
  return result.vehicle;
}

const IDS = ["TEST-0001", "TEST-0002", "TEST-0003", "TEST-0004", "TEST-0005", "TEST-0006", "TEST-0007", "TEST-0009", "TEST-0011"];

describe("Drive media: listings never touch Drive", () => {
  it("listAvailable returns every available vehicle with media [] and makes 0 Drive calls", async () => {
    const { repo, drive } = setup();
    const all = await vehicles(repo);
    expect(all.map((v) => v.id)).toEqual(IDS);
    expect(all.every((v) => v.media.length === 0)).toBe(true);
    expect(drive.calls).toEqual([]);
    expect(drive.downloads).toEqual([]);
  });

  it("listSold returns sold vehicles with media [] and makes 0 Drive calls", async () => {
    const { repo, drive } = setup();
    const result = await repo.listSold();
    expect(result.kind === "ok" && result.vehicles.map((v) => [v.id, v.media])).toEqual([["TEST-0008", []]]);
    expect(drive.calls).toEqual([]);
    expect(drive.downloads).toEqual([]);
  });

  it("repeated listing reads still make 0 Drive calls (no prefetch)", async () => {
    const { repo, drive } = setup();
    await vehicles(repo);
    await repo.listSold();
    await vehicles(repo);
    expect(drive.calls).toEqual([]);
  });
});

describe("Drive media: per-vehicle resolution", () => {
  it("getById calls Drive only for that vehicle's own folder and its Website/ child", async () => {
    const { repo, drive } = setup();
    await vdp(repo, "TEST-0001");
    expect(drive.calls).toEqual([
      "get:TESTFOLDERID_OK_000001",
      "folders:TESTFOLDERID_OK_000001",
      "list:TESTFOLDERID_WEB_00001",
    ]);
    await vdp(repo, "TEST-0006");
    expect(drive.calls.slice(3)).toEqual([
      "get:TESTFOLDERID_EMPTY_006",
      "folders:TESTFOLDERID_EMPTY_006",
      "list:TESTFOLDERID_WEB_EMPTY6",
    ]);
    // The vehicle root folder itself is never listed.
    expect(drive.calls.filter((c) => c.startsWith("list:TESTFOLDERID_OK") || c.startsWith("list:TESTFOLDERID_EMPTY"))).toEqual([]);
    expect(drive.downloads).toEqual([]); // listing a folder never downloads files
  });

  it("attaches only Website/ images to the vehicle: no root files, no videos", async () => {
    const { repo } = setup();
    const first = await vdp(repo, "TEST-0001");
    // Filename order, then createdTime, then file ID (names collide here).
    expect(first.media.map((m) => m.type)).toEqual(["image", "image"]);
    expect(first.media.map((m) => m.id)).toEqual([IMG_A, IMG_B].map((f) => publicMediaId(f.id)));
    for (const excluded of [VIDEO, ROOT_IMAGE, ROOT_VIDEO]) {
      expect(first.media.map((m) => m.id)).not.toContain(publicMediaId(excluded.id));
    }
    for (const item of first.media) expect(isPublicMediaToken(item.id, 22)).toBe(true);
    const image = first.media[0] as VehicleImage;
    expect(image.src).toMatch(/^\/media\/TEST-0001\/[A-Za-z0-9_-]{22}\/[A-Za-z0-9_-]{12}$/);
  });

  it("denied, failing, missing/duplicate/empty/docs-only Website, invalid or missing link only empty that vehicle's media", async () => {
    const { repo } = setup();
    const all = [];
    for (const id of IDS) all.push(await vdp(repo, id));
    expect(all.map((v) => v.media.length)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    // Inventory facts are unaffected by media problems, and the listing still has every car.
    expect(all.every((v) => v.make === "Testmake" && v.priceAed === 11111)).toBe(true);
    expect((await vehicles(repo)).map((v) => v.id)).toEqual(IDS);
    // A failing folder elsewhere does not break a readable one.
    expect((await vdp(repo, "TEST-0001")).media).toHaveLength(2);
  });

  it("reports the server-side state per vehicle without folder IDs, file IDs, names or links", async () => {
    const lines: string[] = [];
    const { repo } = setup({ log: (m) => lines.push(m) });
    for (const id of IDS) await vdp(repo, id);
    const text = lines.join("\n");
    expect(text).toContain("TEST-0002: inaccessible");
    expect(text).toContain("TEST-0003: source-error (http-5xx)");
    expect(text).toContain("TEST-0004: invalid-link");
    expect(text).toContain("TEST-0005: missing-link");
    expect(text).toContain("TEST-0006: empty");
    expect(text).toContain("TEST-0007: no-supported-media");
    expect(text).toContain("TEST-0009: no-website-folder");
    expect(text).toContain("TEST-0011: duplicate-website-folder");
    expect(text).not.toMatch(/TESTFOLDERID|TESTFILEID|SECRET-FILENAME|drive\.google|WhatsApp/);
  });

  it("backs off from a failing folder instead of hammering Drive", async () => {
    const { repo, drive } = setup();
    await vdp(repo, "TEST-0003");
    await vdp(repo, "TEST-0003");
    expect(drive.calls.filter((c) => c === "get:TESTFOLDERID_FLAKY_003")).toHaveLength(1);
  });

  it("never reads the media link column when media is disabled", async () => {
    const sheet = new FakeSheet([syntheticRow()]);
    await loadInventorySnapshot(sheet, { now: () => NOW, log: quietLog });
    expect(sheet.requestedColumnNames()).not.toContain(MEDIA_LINK_COLUMN);
  });

  it("reads the media link column (and no other non-public column) in the same batch when enabled", async () => {
    const { sheet, repo } = setup();
    await vdp(repo, "TEST-0001");
    expect(sheet.batchCalls).toHaveLength(1);
    const requested = sheet.requestedColumnNames();
    expect(requested).toContain(MEDIA_LINK_COLUMN);
    for (const column of Object.keys(PRIVATE_MARKERS).filter((c) => c !== MEDIA_LINK_COLUMN)) {
      expect(requested).not.toContain(column);
    }
  });

  it("keeps the inventory when the media link column is missing (media unavailable for all)", async () => {
    const header = ["ID", "Марка", "Модель", "Комплектация", "Год", "Цена, AED", "Статус", "Пробег, км",
      "Региональная спецификация", "Цвет", "Двигатель", "Топливо", "Коробка", "Привод"];
    const warnings: string[] = [];
    const sheet = new FakeSheet([syntheticRow()], header);
    const snapshot = await loadInventorySnapshot(sheet, {
      now: () => NOW,
      log: { info: () => {}, warn: (m) => warnings.push(m) },
      readMediaLinks: true,
    });
    expect(snapshot.vehicles).toHaveLength(1);
    expect(snapshot.mediaFolders).toEqual([]);
    expect(warnings.join()).toContain("media link column missing");
  });
});

describe("Drive media: no leakage into the public model", () => {
  it("public vehicles carry no Drive link, folder ID, file ID, file name or private field", async () => {
    const { repo } = setup();
    const listed = JSON.stringify([await repo.listAvailable(), await repo.listSold()]);
    const single = JSON.stringify(await repo.getById("TEST-0001"));
    for (const payload of [listed, single]) {
      expect(payload).not.toMatch(/drive\.google|googleapis|googleusercontent|usp=sharing/);
      expect(payload).not.toMatch(/TESTFOLDERID|TESTFILEID|SECRET-FILENAME|see WhatsApp/);
      expect(payload).not.toMatch(/PRIVATE-/);
    }
  });
});

describe("Drive media: controlled image delivery", () => {
  async function firstImage(repo: GoogleSheetsInventoryRepository) {
    const vehicle = await vdp(repo, "TEST-0001");
    const image = vehicle.media[0] as VehicleImage;
    const [, , , mediaId, revision] = image.src.split("/");
    return { vehicle, mediaId, revision };
  }

  it("serves sanitized bytes for a current image of that vehicle", async () => {
    const { repo, drive, sanitize } = setup();
    const { mediaId, revision } = await firstImage(repo);
    const result = await repo.getImage("TEST-0001", mediaId, revision);
    expect(result).toEqual({ kind: "ok", bytes: new Uint8Array([0xa, 0xff]), contentType: "image/jpeg" });
    expect(sanitize).toHaveBeenCalledOnce();
    expect(drive.downloads).toEqual([IMG_A.id]);
  });

  it("refuses media of another vehicle, stale revisions, videos, root files, unknown and non-public vehicles", async () => {
    const { repo, drive } = setup();
    const { mediaId, revision } = await firstImage(repo);
    const videoId = publicMediaId(VIDEO.id);

    await expect(repo.getImage("TEST-0002", mediaId, revision)).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getImage("TEST-0001", mediaId, "AAAAAAAAAAAA")).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getImage("TEST-0001", videoId, revision)).resolves.toEqual({ kind: "not-found" });
    // A file from the vehicle ROOT folder is never servable, even with a correctly derived ID.
    await expect(repo.getImage("TEST-0001", publicMediaId(ROOT_IMAGE.id), revision)).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getImage("TEST-0009", publicMediaId(ROOT_IMAGE.id), revision)).resolves.toEqual({ kind: "not-found" });
    await expect(repo.getImage("TEST-9999", mediaId, revision)).resolves.toEqual({ kind: "not-found" });
    // A raw Drive file ID is not accepted as a media ID.
    await expect(repo.getImage("TEST-0001", IMG_A.id, revision)).resolves.toEqual({ kind: "not-found" });
    expect(drive.downloads).toEqual([]);
  });

  it("does not serve media for vehicles with a non-public status", async () => {
    const sheet = new FakeSheet([
      syntheticRow({ ID: "TEST-0010", Статус: "Резерв", [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_OK_000001") }),
    ]);
    const { drive } = setup();
    const repo = new GoogleSheetsInventoryRepository(
      async () => ({ kind: "ok", ...(await loadInventorySnapshot(sheet, { now: () => NOW, log: quietLog, readMediaLinks: true })) }),
      createMediaService({ reader: drive, sanitize: async (b) => ({ bytes: b, contentType: "image/jpeg" }), log: () => {} }),
    );
    const id = publicMediaId(IMG_A.id);
    await expect(repo.getImage("TEST-0010", id, "AAAAAAAAAAAA")).resolves.toEqual({ kind: "not-found" });
    expect(drive.calls).toEqual([]);
  });

  it("a failing download is not-found (permanent) or unavailable (transient), never another file", async () => {
    const { repo, drive } = setup();
    const { mediaId, revision } = await firstImage(repo);
    drive.files = {};
    await expect(repo.getImage("TEST-0001", mediaId, revision)).resolves.toEqual({ kind: "not-found" });
    drive.download = async () => {
      throw new DriveSourceError("timeout", true);
    };
    await expect(repo.getImage("TEST-0001", mediaId, revision)).resolves.toEqual({
      kind: "unavailable",
      reason: "source-error",
    });
  });

  it("without a media service, vehicles have empty media and no image is served", async () => {
    const sheet = new FakeSheet([syntheticRow({ [MEDIA_LINK_COLUMN]: TEST_FOLDER_LINK("TESTFOLDERID_OK_000001") })]);
    const repo = new GoogleSheetsInventoryRepository(async () => ({
      kind: "ok",
      ...(await loadInventorySnapshot(sheet, { now: () => NOW, log: quietLog })),
    }));
    const vehicle = await vdp(repo, "TEST-0001");
    expect(vehicle.media).toEqual([]);
    await expect(repo.getImage(vehicle.id, "A".repeat(22), "A".repeat(12))).resolves.toEqual({ kind: "not-found" });
  });
});
