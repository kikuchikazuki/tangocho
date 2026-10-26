import { describe, expect, it } from "vitest";
import type { Page } from "./types";
import {
  getMonthDays,
  hasCompletionOnDate,
  isPageCompleted,
  isValidDateKey,
  localDateKey,
  normalizeCompletionRecords,
  removePageCompletionRecords,
  toggleCompletionRecord,
} from "./calendar";

const pages: Page[] = [
  { id: "aws", name: "AWS暗記帳", cards: [], folderId: null },
  { id: "english", name: "英単語", cards: [], folderId: null },
];

describe("calendar completion records", () => {
  it("allows multiple books on one date", () => {
    let records = toggleCompletionRecord([], "2026-10-22", "aws");
    records = toggleCompletionRecord(records, "2026-10-22", "english");

    expect(records).toEqual([
      { date: "2026-10-22", pageId: "aws" },
      { date: "2026-10-22", pageId: "english" },
    ]);
    expect(hasCompletionOnDate(records, "2026-10-22")).toBe(true);
    expect(isPageCompleted(records, "2026-10-22", "english")).toBe(true);
  });

  it("removes an existing record when toggled again", () => {
    const source = [{ date: "2026-10-22", pageId: "aws" }];
    expect(toggleCompletionRecord(source, "2026-10-22", "aws")).toEqual([]);
  });

  it("validates real calendar dates", () => {
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2024-02-29")).toBe(true);
    expect(isValidDateKey("2026-2-2")).toBe(false);
  });

  it("formats a local date without UTC conversion", () => {
    expect(localDateKey(new Date(2026, 9, 22, 23, 30))).toBe("2026-10-22");
  });

  it("pads years below 100 when formatting local dates", () => {
    const date = new Date(0);
    date.setFullYear(99, 9, 22);
    expect(localDateKey(date)).toBe("0099-10-22");
  });

  it("creates a complete six-week grid for month boundaries", () => {
    const days = getMonthDays(2026, 9);
    expect(days).toHaveLength(42);
    expect(days.some((day) => day.date === "2026-10-01" && day.inMonth)).toBe(true);
    expect(days.some((day) => day.date === "2026-09-27" && !day.inMonth)).toBe(true);
  });

  it("creates month days in the requested year below 100", () => {
    const days = getMonthDays(99, 9);
    expect(days).toHaveLength(42);
    expect(days.some((day) => day.date === "0099-10-01" && day.inMonth)).toBe(true);
    expect(days.every((day) => !day.date.startsWith("19"))).toBe(true);
  });

  it("removes only records belonging to a deleted page", () => {
    const source = [
      { date: "2026-10-22", pageId: "aws" },
      { date: "2026-10-23", pageId: "english" },
    ];
    expect(removePageCompletionRecords(source, "aws")).toEqual([
      { date: "2026-10-23", pageId: "english" },
    ]);
  });

  it("normalizes legacy, duplicate, invalid, and orphan records", () => {
    expect(
      normalizeCompletionRecords(
        [
          { date: "2026-10-22", pageId: "aws" },
          { date: "2026-10-22", pageId: "aws" },
          { date: "2026-02-29", pageId: "aws" },
          { date: "2026-10-22", pageId: "missing" },
          null,
          { date: 42, pageId: "aws" },
        ],
        pages,
      ),
    ).toEqual([{ date: "2026-10-22", pageId: "aws" }]);
    expect(normalizeCompletionRecords(undefined, pages)).toEqual([]);
  });
});
