import type { CompletionRecord, Page } from "./types";

export type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidDateKey(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function getMonthDays(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: localDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}

export function isPageCompleted(
  records: CompletionRecord[],
  date: string,
  pageId: string,
): boolean {
  return records.some((record) => record.date === date && record.pageId === pageId);
}

export function hasCompletionOnDate(records: CompletionRecord[], date: string): boolean {
  return records.some((record) => record.date === date);
}

export function toggleCompletionRecord(
  records: CompletionRecord[],
  date: string,
  pageId: string,
): CompletionRecord[] {
  if (isPageCompleted(records, date, pageId)) {
    return records.filter((record) => !(record.date === date && record.pageId === pageId));
  }
  return [...records, { date, pageId }];
}

export function removePageCompletionRecords(
  records: CompletionRecord[],
  pageId: string,
): CompletionRecord[] {
  return records.filter((record) => record.pageId !== pageId);
}

export function normalizeCompletionRecords(
  value: unknown,
  pages: Page[],
): CompletionRecord[] {
  if (!Array.isArray(value)) return [];
  const pageIds = new Set(pages.map((page) => page.id));
  const seen = new Set<string>();
  const result: CompletionRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { date?: unknown; pageId?: unknown };
    if (
      typeof candidate.date !== "string" ||
      typeof candidate.pageId !== "string" ||
      !isValidDateKey(candidate.date) ||
      !pageIds.has(candidate.pageId)
    ) continue;
    const key = `${candidate.date}\u0000${candidate.pageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ date: candidate.date, pageId: candidate.pageId });
  }
  return result;
}
