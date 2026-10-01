import {
  DRIVE_FOLDER_MIME,
  DriveSourceError,
  type DriveChild,
  type DriveFolderInfo,
  type DriveReader,
} from "@/adapters/google-drive-media/drive-client";

/**
 * SYNTHETIC TEST DRIVE. Emulates the `DriveReader` contract used by the media adapter and
 * records calls. Folder/file IDs and names are obviously fake; file bytes are generated in tests.
 * No real Drive content, IDs or media ever live here.
 */

export type FakeFolder =
  | { readonly kind: "folder"; readonly children: readonly DriveChild[]; readonly trashed?: boolean }
  | { readonly kind: "file"; readonly mimeType: string }
  | { readonly kind: "error"; readonly error: DriveSourceError };

export class FakeDrive implements DriveReader {
  readonly calls: string[] = [];
  readonly downloads: string[] = [];

  constructor(
    public folders: Record<string, FakeFolder>,
    public files: Record<string, Uint8Array> = {},
  ) {}

  async getFolder(folderId: string): Promise<DriveFolderInfo> {
    this.calls.push(`get:${folderId}`);
    const folder = this.folders[folderId];
    if (!folder) throw new DriveSourceError("http-404", false);
    if (folder.kind === "error") throw folder.error;
    if (folder.kind === "file") return { mimeType: folder.mimeType, trashed: false };
    return { mimeType: DRIVE_FOLDER_MIME, trashed: folder.trashed ?? false };
  }

  async listChildren(folderId: string): Promise<DriveChild[]> {
    this.calls.push(`list:${folderId}`);
    const folder = this.folders[folderId];
    if (!folder || folder.kind !== "folder") throw new DriveSourceError("http-404", false);
    return [...folder.children];
  }

  /**
   * Emulates the Drive query `mimeType = folder and name = '<name>'`. Matches names
   * case-insensitively on purpose, so tests prove the adapter itself compares names exactly.
   */
  async listChildFolders(parentId: string, name: string): Promise<DriveChild[]> {
    this.calls.push(`folders:${parentId}`);
    const folder = this.folders[parentId];
    if (!folder || folder.kind !== "folder") throw new DriveSourceError("http-404", false);
    return folder.children.filter(
      (child) => child.mimeType === DRIVE_FOLDER_MIME && child.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async download(fileId: string, maxBytes: number): Promise<Uint8Array> {
    this.downloads.push(fileId);
    const bytes = this.files[fileId];
    if (!bytes) throw new DriveSourceError("http-404", false);
    if (bytes.byteLength > maxBytes) throw new DriveSourceError("too-large", false);
    return bytes;
  }
}

let counter = 0;

/** A synthetic Drive child. IDs look nothing like real Drive IDs beyond the character set. */
export function fakeChild(overrides: Partial<DriveChild> & Pick<DriveChild, "mimeType">): DriveChild {
  counter += 1;
  return {
    id: `TESTFILE${String(counter).padStart(6, "0")}`,
    name: `test-file-${counter}`,
    size: 1000,
    createdTime: "2001-01-01T00:00:00.000Z",
    md5Checksum: `testmd5${counter}`,
    version: "1",
    ...overrides,
  };
}

/** A synthetic child folder entry (e.g. the vehicle's `Website` folder). */
export function fakeFolderChild(id: string, name = "Website"): DriveChild {
  return fakeChild({ mimeType: DRIVE_FOLDER_MIME, id, name, size: null, md5Checksum: null });
}

export const TEST_FOLDER_LINK = (folderId: string) => `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
