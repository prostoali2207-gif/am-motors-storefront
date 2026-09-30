import type { AccessTokenProvider } from "@/adapters/google-sheets/sheets-client";

/**
 * Minimal read-only client for the Google Drive API v3 (`files.get`, `files.list`,
 * `files.get?alt=media`).
 *
 * - Scope: `drive.readonly` (content download needs more than `drive.metadata.readonly`).
 * - Data minimization: only the metadata fields below are requested. Never `owners`,
 *   `permissions`, `sharingUser`, `webViewLink`, `thumbnailLink` or `imageMediaMetadata`
 *   (which includes EXIF `location`, i.e. GPS).
 * - Responses are fetched with `no-store`; failures become `DriveSourceError` with a fixed code.
 *   Upstream bodies are never read into errors or logs.
 */

export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

const API_BASE = "https://www.googleapis.com/drive/v3/files";
const METADATA_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 25_000;
/** Upper bound on listed children per folder (5 pages × 1000). */
const MAX_LIST_PAGES = 5;

const CHILD_FIELDS = "nextPageToken,files(id,name,mimeType,size,createdTime,md5Checksum,version)";

/** A child entry as returned by `files.list` with `CHILD_FIELDS`, validated. */
export interface DriveChild {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  /** Bytes; absent for folders/shortcuts/Google Docs. */
  readonly size: number | null;
  readonly createdTime: string | null;
  readonly md5Checksum: string | null;
  readonly version: string | null;
}

export interface DriveFolderInfo {
  readonly mimeType: string;
  readonly trashed: boolean;
}

export interface DriveReader {
  /** `files.get` on the folder itself (type + trashed only). */
  getFolder(folderId: string): Promise<DriveFolderInfo>;
  /** Direct, non-trashed children of the folder. Not recursive. */
  listChildren(folderId: string): Promise<DriveChild[]>;
  /** File content, refused if larger than `maxBytes`. */
  download(fileId: string, maxBytes: number): Promise<Uint8Array>;
}

/**
 * `code` is a short fixed token (`http-404`, `timeout`, …). `transient` marks failures that may
 * succeed on retry (network, 5xx, 429, 403 quota/permission races); they are not cached long.
 */
export class DriveSourceError extends Error {
  readonly code: string;
  readonly transient: boolean;

  constructor(code: string, transient: boolean) {
    super(`drive source error: ${code}`);
    this.name = "DriveSourceError";
    this.code = code;
    this.transient = transient;
  }
}

export interface DriveReaderOptions {
  readonly getAccessToken: AccessTokenProvider;
  readonly fetchImpl?: typeof fetch;
}

export function createDriveReader(options: DriveReaderOptions): DriveReader {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(url: string, timeoutMs: number): Promise<Response> {
    let token: string;
    try {
      token = await options.getAccessToken();
    } catch {
      throw new DriveSourceError("auth-failed", true);
    }
    if (typeof token !== "string" || token === "") throw new DriveSourceError("auth-failed", true);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = isRecord(error) && error.name === "TimeoutError";
      throw new DriveSourceError(timedOut ? "timeout" : "network", true);
    }

    if (!response.ok) {
      const status = response.status;
      // Drive answers 404 both for missing files and for files this identity cannot see.
      if (status === 404) throw new DriveSourceError("http-404", false);
      throw new DriveSourceError(status >= 500 ? "http-5xx" : `http-${status}`, true);
    }
    return response;
  }

  async function getJson(url: string): Promise<Record<string, unknown>> {
    const response = await request(url, METADATA_TIMEOUT_MS);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new DriveSourceError("malformed-response", true);
    }
    if (!isRecord(body)) throw new DriveSourceError("malformed-response", true);
    return body;
  }

  return {
    async getFolder(folderId) {
      const params = new URLSearchParams({ fields: "mimeType,trashed", supportsAllDrives: "true" });
      const body = await getJson(`${API_BASE}/${encodeURIComponent(folderId)}?${params}`);
      if (typeof body.mimeType !== "string") throw new DriveSourceError("malformed-response", true);
      return { mimeType: body.mimeType, trashed: body.trashed === true };
    },

    async listChildren(folderId) {
      const children: DriveChild[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < MAX_LIST_PAGES; page++) {
        const params = new URLSearchParams({
          // Folder IDs are validated to [A-Za-z0-9_-] before reaching here: no quote injection.
          q: `'${folderId}' in parents and trashed = false`,
          fields: CHILD_FIELDS,
          pageSize: "1000",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);
        const body = await getJson(`${API_BASE}?${params}`);

        const files = body.files;
        if (files !== undefined && !Array.isArray(files)) {
          throw new DriveSourceError("malformed-response", true);
        }
        for (const entry of files ?? []) {
          const child = toChild(entry);
          if (child) children.push(child);
        }
        pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : undefined;
        if (!pageToken) return children;
      }
      throw new DriveSourceError("too-many-children", false);
    },

    async download(fileId, maxBytes) {
      const params = new URLSearchParams({ alt: "media", supportsAllDrives: "true" });
      const response = await request(`${API_BASE}/${encodeURIComponent(fileId)}?${params}`, DOWNLOAD_TIMEOUT_MS);
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxBytes) {
        await response.body?.cancel();
        throw new DriveSourceError("too-large", false);
      }
      return readLimited(response, maxBytes);
    },
  };
}

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) throw new DriveSourceError("malformed-response", true);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new DriveSourceError("too-large", false);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof DriveSourceError) throw error;
    throw new DriveSourceError("network", true);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Validates one `files.list` entry; entries without an ID or MIME type are dropped. */
function toChild(entry: unknown): DriveChild | null {
  if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.mimeType !== "string") return null;
  const size = typeof entry.size === "string" && /^\d+$/.test(entry.size) ? Number(entry.size) : null;
  return {
    id: entry.id,
    name: typeof entry.name === "string" ? entry.name : "",
    mimeType: entry.mimeType,
    size,
    createdTime: typeof entry.createdTime === "string" ? entry.createdTime : null,
    md5Checksum: typeof entry.md5Checksum === "string" ? entry.md5Checksum : null,
    version: typeof entry.version === "string" ? entry.version : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
