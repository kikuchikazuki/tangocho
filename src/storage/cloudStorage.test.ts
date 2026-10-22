import { describe, expect, it } from "vitest";
import { sanitizeAppState } from "./cloudStorage";

const page = { id: "aws", name: "AWS暗記帳", cards: [] };

describe("sanitizeAppState", () => {
  it("defaults missing completion records to an empty list", () => {
    expect(sanitizeAppState({ pages: [page], activePageId: "aws" })).toEqual({
      activePageId: "aws",
      pages: [page],
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
      pages: [page],
      completionRecords: [valid],
    });
  });
});
