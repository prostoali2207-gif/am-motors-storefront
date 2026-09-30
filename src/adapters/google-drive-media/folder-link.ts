/**
 * Parses the authoritative Sheet value `Ссылка на фото/видео` into a Drive folder reference.
 *
 * Server/source-only: the link and the folder ID are never rendered, serialized to the client
 * or logged. A missing or unparseable link only makes that one vehicle's media unavailable.
 *
 * Accepted (https, host `drive.google.com` only):
 * - `/drive/folders/<id>`, `/drive/u/<n>/folders/<id>`, `/drive/mobile/folders/<id>`
 *   (any query such as `?usp=sharing` is ignored)
 * - `/open?id=<id>` — may also point at a file; the adapter verifies the folder type via the
 *   Drive API before listing.
 *
 * Anything else (file links, other hosts, Docs links, plain text) is `invalid`: we do not guess.
 */

export type DriveFolderRef =
  | { readonly kind: "folder"; readonly folderId: string }
  | { readonly kind: "missing" }
  | { readonly kind: "invalid" };

/** Drive IDs are URL-safe base64-like tokens. Length bounds are generous, not a format rule. */
const DRIVE_ID = /^[A-Za-z0-9_-]{10,128}$/;
const FOLDER_PATH = /^\/drive\/(?:u\/\d+\/|mobile\/)?folders\/([^/]+)\/?$/;

export function parseDriveFolderLink(value: unknown): DriveFolderRef {
  if (value === undefined || value === null) return { kind: "missing" };
  if (typeof value !== "string") return { kind: "invalid" };
  const text = value.trim();
  if (text === "") return { kind: "missing" };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { kind: "invalid" };
  }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.port !== "") {
    return { kind: "invalid" };
  }
  if (url.username !== "" || url.password !== "") return { kind: "invalid" };

  const folderMatch = FOLDER_PATH.exec(url.pathname);
  const candidate = folderMatch
    ? folderMatch[1]
    : url.pathname === "/open"
      ? url.searchParams.get("id")
      : null;

  return candidate !== null && DRIVE_ID.test(candidate)
    ? { kind: "folder", folderId: candidate }
    : { kind: "invalid" };
}
