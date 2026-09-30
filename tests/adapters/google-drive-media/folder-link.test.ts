import { describe, expect, it } from "vitest";

import { parseDriveFolderLink } from "@/adapters/google-drive-media/folder-link";

const ID = "TESTFOLDER_abc-0123456789";

describe("parseDriveFolderLink: valid folder links", () => {
  it.each([
    `https://drive.google.com/drive/folders/${ID}`,
    `https://drive.google.com/drive/folders/${ID}/`,
    `https://drive.google.com/drive/folders/${ID}?usp=sharing`,
    `https://drive.google.com/drive/folders/${ID}?usp=drive_link`,
    `https://drive.google.com/drive/u/0/folders/${ID}`,
    `https://drive.google.com/drive/u/3/folders/${ID}?usp=sharing`,
    `https://drive.google.com/drive/mobile/folders/${ID}`,
    `https://drive.google.com/open?id=${ID}`,
    `  https://drive.google.com/drive/folders/${ID}  `,
  ])("extracts the folder ID from %s", (link) => {
    expect(parseDriveFolderLink(link)).toEqual({ kind: "folder", folderId: ID });
  });
});

describe("parseDriveFolderLink: missing", () => {
  it.each([undefined, null, "", "   "])("treats %j as missing", (value) => {
    expect(parseDriveFolderLink(value)).toEqual({ kind: "missing" });
  });
});

describe("parseDriveFolderLink: invalid (never guessed)", () => {
  it.each([
    "not a link",
    "drive.google.com/drive/folders/" + ID, // no scheme
    `http://drive.google.com/drive/folders/${ID}`, // not https
    `https://drive.google.com.evil.test/drive/folders/${ID}`,
    `https://evil.test/drive/folders/${ID}`,
    `https://docs.google.com/drive/folders/${ID}`,
    `https://drive.google.com:8443/drive/folders/${ID}`,
    `https://user:pass@drive.google.com/drive/folders/${ID}`,
    `https://drive.google.com/file/d/${ID}/view`, // a file, not a folder
    `https://drive.google.com/drive/folders/`,
    `https://drive.google.com/drive/folders/short`,
    `https://drive.google.com/drive/folders/${ID}/extra`,
    `https://drive.google.com/drive/folders/bad'quote${ID}`,
    `https://drive.google.com/drive/folders/${"x".repeat(200)}`,
    `https://drive.google.com/open`,
    `https://drive.google.com/open?id=bad%20id${ID}`,
  ])("rejects %s", (link) => {
    expect(parseDriveFolderLink(link)).toEqual({ kind: "invalid" });
  });

  it.each([12345, true, {}, []])("rejects non-text cell %j", (value) => {
    expect(parseDriveFolderLink(value)).toEqual({ kind: "invalid" });
  });
});
