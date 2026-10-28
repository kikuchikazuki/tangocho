import type { CompletionRecord, Page } from "./types";

export type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const createLocalDate = (year: number, month: number, day: number): Date => {
  // UTCではなくローカル日付を使います。UTC変換すると日本時間の深夜に日付がずれるためです。
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
};

export function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
  // 月初の曜日から前月分を含めた6週間（42日）のカレンダーを作ります。
  const first = createLocalDate(year, month, 1);
  const start = createLocalDate(year, month, 1 - first.getDay());
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
  // 同じ日・同じ暗記帳の記録があれば削除、なければ追加するトグル操作です。
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
  // クラウドや古いバックアップから来た不正な日付・存在しない暗記帳IDを除外します。
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
