import { describe, expect, it } from "vitest";
import { sanitizeAppState } from "./cloudStorage";

const page = { id: "aws", name: "AWS暗記帳", cards: [] };

describe("sanitizeAppState", () => {
  it("defaults missing completion records to an empty list", () => {
    expect(sanitizeAppState({ pages: [page], activePageId: "aws" })).toEqual({
      activePageId: "aws",
      folders: [],
      pages: [{ ...page, folderId: null }],
      completionRecords: [],
    });
  });

  it("normalizes missing and invalid folder references", () => {
    const folder = { id: "f1", name: "Study" };
    expect(sanitizeAppState({
      folders: [folder],
      pages: [
        page,
        { ...page, id: "valid", folderId: "f1" },
        { ...page, id: "invalid", folderId: "missing" },
      ],
      activePageId: "aws",
    })).toEqual({
      activePageId: "aws",
      folders: [folder],
      pages: [
        { ...page, folderId: null },
        { ...page, id: "valid", folderId: "f1" },
        { ...page, id: "invalid", folderId: null },
      ],
      completionRecords: [],
    });
  });

  it("keeps only unique valid records for known pages", () => {
    const valid = { date: "2026-10-22", pageId: "aws" };

    expect(sanitizeAppState({
      pages: [page],
      activePageId: "aws",
      completionRecords: [
        valid,
        valid,
        { date: "2026-02-29", pageId: "aws" },
        { date: "2026-10-22", pageId: "missing" },
      ],
    })).toEqual({
      activePageId: "aws",
      folders: [],
      pages: [{ ...page, folderId: null }],
      completionRecords: [valid],
    });
  });
});
