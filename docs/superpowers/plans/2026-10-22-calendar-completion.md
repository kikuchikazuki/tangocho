# Calendar Completion Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate calendar tab where users can mark each vocabulary book complete or incomplete for any date, while coloring dates that contain one or more completions.

**Architecture:** Keep completion records inside the existing `AppState` JSON saved to Supabase and exported to JSON. Put date arithmetic, validation, normalization, and record toggling in pure domain functions; keep `CalendarView` responsible for month navigation and selected-date controls; let `App.tsx` connect both views to the existing revisioned save queue.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Supabase JSON state, CSS.

## Global Constraints

- Store dates as local `YYYY-MM-DD` strings and avoid UTC conversion that can shift the day.
- Allow multiple vocabulary books to be completed on the same date.
- A completion toggle adds the `(date, pageId)` record when absent and removes it when present.
- The calendar initially colors completed dates only; do not add streaks, study-time tracking, notifications, automatic card-progress completion, or book names inside date cells.
- Preserve JSON import/export, existing cloud synchronization, and current card-progress behavior.
- Old saved states without `completionRecords` must load as if they had an empty array.
- Do not add a Supabase table or a new runtime dependency.
- Run `npm test -- --run` and `npm run build` before claiming completion.

---

## File Map

- Create `src/domain/calendar.ts`: date keys, month-day generation, completion toggling, validation, and normalization.
- Create `src/domain/calendar.test.ts`: pure calendar and record behavior tests.
- Create `src/components/CalendarView.tsx`: calendar grid, month navigation, selected-date editor.
- Create `src/components/CalendarView.test.tsx`: UI behavior tests in jsdom.
- Modify `src/domain/types.ts`: add `CompletionRecord` and require `completionRecords` on `AppState`.
- Modify `src/domain/state.ts`: remove a deleted page's completion records.
- Modify `src/domain/initialData.ts`: initialize completion records to an empty array.
- Modify `src/domain/deletion.test.ts`: update `AppState` fixtures and verify completion cleanup.
- Modify `src/storage/cloudStorage.ts`: normalize legacy and invalid completion records on read/write.
- Create `src/storage/cloudStorage.test.ts`: verify legacy compatibility and record filtering.
- Modify `src/App.tsx`: add the calendar tab, current-book completion button, and calendar state wiring.
- Modify `src/styles.css`: style the calendar, selected date, completion state, and mobile layout.
- Modify `README.md`: document the calendar tab and completion workflow.

## Domain Interfaces

Later tasks depend on these exact exports:

```ts
// src/domain/calendar.ts
export type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
};

export function localDateKey(date: Date): string;
export function isValidDateKey(value: string): boolean;
export function getMonthDays(year: number, month: number): CalendarDay[];
export function isPageCompleted(
  records: CompletionRecord[],
  date: string,
  pageId: string,
): boolean;
export function hasCompletionOnDate(
  records: CompletionRecord[],
  date: string,
): boolean;
export function toggleCompletionRecord(
  records: CompletionRecord[],
  date: string,
  pageId: string,
): CompletionRecord[];
export function removePageCompletionRecords(
  records: CompletionRecord[],
  pageId: string,
): CompletionRecord[];
export function normalizeCompletionRecords(
  value: unknown,
  pages: Page[],
): CompletionRecord[];
```

```tsx
// src/components/CalendarView.tsx
type CalendarViewProps = {
  pages: Page[];
  completionRecords: CompletionRecord[];
  today: string;
  onToggleCompletion: (date: string, pageId: string) => void;
};
```

### Task 1: Add the domain model and pure calendar behavior

**Files:**
- Create: `src/domain/calendar.test.ts`
- Create: `src/domain/calendar.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/initialData.ts`
- Modify: `src/domain/state.ts`
- Modify: `src/domain/deletion.test.ts`

**Interfaces:**
- Consumes: existing `Page`, `AppState`, and `Card` types.
- Produces: the domain exports listed in the `Domain Interfaces` section and an `AppState` that always includes `completionRecords`.

- [ ] **Step 1: Write failing domain tests for completion toggles and date helpers**

Add `src/domain/calendar.test.ts` with deterministic tests for multiple books, toggle-off behavior, date validation, month boundaries, and page cleanup:

```ts
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
  { id: "aws", name: "AWS暗記帳", cards: [] },
  { id: "english", name: "英単語", cards: [] },
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
    const date = new Date(2026, 9, 22, 23, 30);
    expect(localDateKey(date)).toBe("2026-10-22");
  });

  it("creates a complete six-week grid for month boundaries", () => {
    const days = getMonthDays(2026, 9);
    expect(days).toHaveLength(42);
    expect(days.some((day) => day.date === "2026-10-01" && day.inMonth)).toBe(
      true,
    );
    expect(days.some((day) => day.date === "2026-09-27" && !day.inMonth)).toBe(
      true,
    );
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
        ],
        pages,
      ),
    ).toEqual([{ date: "2026-10-22", pageId: "aws" }]);
    expect(normalizeCompletionRecords(undefined, pages)).toEqual([]);
  });
});
```

Update `src/domain/deletion.test.ts` fixtures so every `AppState` includes `completionRecords: []`, and add this deletion assertion:

```ts
it("removes completion records for a deleted page", () => {
  const state = {
    pages: [page("a", "A"), page("b", "B")],
    activePageId: "a",
    completionRecords: [
      { date: "2026-10-22", pageId: "a" },
      { date: "2026-10-23", pageId: "b" },
    ],
  };

  expect(deletePage(state, "a")).toEqual({
    pages: [page("b", "B")],
    activePageId: "b",
    completionRecords: [{ date: "2026-10-23", pageId: "b" }],
  });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail for missing exports**

Run:

```powershell
npm test -- --run src/domain/calendar.test.ts src/domain/deletion.test.ts
```

Expected: FAIL because `calendar.ts` and `CompletionRecord` do not exist yet, confirming the tests exercise new behavior.

- [ ] **Step 3: Add the types, domain functions, and initial state**

In `src/domain/types.ts`, add:

```ts
export type CompletionRecord = {
  date: string;
  pageId: string;
};

export type AppState = {
  pages: Page[];
  activePageId: string;
  completionRecords: CompletionRecord[];
};
```

Create `src/domain/calendar.ts` with these implementation rules:

```ts
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
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
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

export function hasCompletionOnDate(
  records: CompletionRecord[],
  date: string,
): boolean {
  return records.some((record) => record.date === date);
}

export function toggleCompletionRecord(
  records: CompletionRecord[],
  date: string,
  pageId: string,
): CompletionRecord[] {
  if (isPageCompleted(records, date, pageId)) {
    return records.filter(
      (record) => !(record.date === date && record.pageId === pageId),
    );
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
    ) {
      continue;
    }
    const key = `${candidate.date}\u0000${candidate.pageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ date: candidate.date, pageId: candidate.pageId });
  }
  return result;
}
```

Add `completionRecords: []` to `createInitialState` in `src/domain/initialData.ts`. Update `deletePage` in `src/domain/state.ts` to return the filtered completion records using `removePageCompletionRecords`.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```powershell
npm test -- --run src/domain/calendar.test.ts src/domain/deletion.test.ts
```

Expected: PASS with all calendar and deletion tests passing.

- [ ] **Step 5: Commit the domain slice**

```powershell
git add src/domain/calendar.ts src/domain/calendar.test.ts src/domain/types.ts src/domain/initialData.ts src/domain/state.ts src/domain/deletion.test.ts
git commit -m "feat: add calendar completion domain model"
```

### Task 2: Make cloud and imported state backward-compatible

**Files:**
- Create: `src/storage/cloudStorage.test.ts`
- Modify: `src/storage/cloudStorage.ts`

**Interfaces:**
- Consumes: `normalizeCompletionRecords` from `src/domain/calendar.ts`.
- Produces: `sanitizeAppState` that returns a complete `AppState` even when the input omits `completionRecords`.

- [ ] **Step 1: Write failing storage-normalization tests**

Create `src/storage/cloudStorage.test.ts` using a minimal legacy state and invalid records:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeAppState } from "./cloudStorage";

const page = { id: "aws", name: "AWS暗記帳", cards: [] };

describe("sanitizeAppState", () => {
  it("adds an empty completion list to a legacy state", () => {
    expect(
      sanitizeAppState({ pages: [page], activePageId: "aws" }),
    ).toMatchObject({
      pages: [page],
      activePageId: "aws",
      completionRecords: [],
    });
  });

  it("keeps only valid, unique records for existing pages", () => {
    const state = sanitizeAppState({
      pages: [page],
      activePageId: "aws",
      completionRecords: [
        { date: "2026-10-22", pageId: "aws" },
        { date: "2026-10-22", pageId: "aws" },
        { date: "2026-02-29", pageId: "aws" },
        { date: "2026-10-22", pageId: "missing" },
      ],
    });

    expect(state.completionRecords).toEqual([
      { date: "2026-10-22", pageId: "aws" },
    ]);
  });
});
```

- [ ] **Step 2: Run the storage tests and verify the legacy input is rejected by the current type/signature**

Run:

```powershell
npm test -- --run src/storage/cloudStorage.test.ts
```

Expected: FAIL or type-check failure because the current sanitizer requires a complete `AppState` and does not create `completionRecords`.

- [ ] **Step 3: Normalize reads and writes in `cloudStorage.ts`**

Define a legacy-compatible input type and update the sanitizer to preserve the existing text cleanup while adding normalized records:

```ts
type SavedAppState = Omit<AppState, "completionRecords"> & {
  completionRecords?: unknown;
};

export function sanitizeAppState(state: SavedAppState): AppState {
  const clean = (text: string) => text.replace(/�/g, "");
  const pages = state.pages.map((page) => ({
    ...page,
    name: clean(page.name),
    cards: page.cards.map((card) => ({
      ...card,
      left: clean(card.left),
      right: clean(card.right),
    })),
  }));
  return {
    activePageId: state.activePageId,
    pages,
    completionRecords: normalizeCompletionRecords(state.completionRecords, pages),
  };
}
```

Import `normalizeCompletionRecords`. In `loadCloudState`, cast the JSON value to `SavedAppState` and return `sanitizeAppState(data.state)` instead of returning the raw JSON. Keep `saveCloudState` calling `sanitizeAppState(state)` before `upsert`, so both legacy reads and new writes use the same validation.

- [ ] **Step 4: Run storage tests and the complete existing suite**

Run:

```powershell
npm test -- --run src/storage/cloudStorage.test.ts src/domain
```

Expected: PASS, including legacy completion fallback and all existing domain tests.

- [ ] **Step 5: Commit the storage compatibility slice**

```powershell
git add src/storage/cloudStorage.ts src/storage/cloudStorage.test.ts
git commit -m "feat: normalize calendar records in saved state"
```

### Task 3: Build and test the calendar component

**Files:**
- Create: `src/components/CalendarView.tsx`
- Create: `src/components/CalendarView.test.tsx`

**Interfaces:**
- Consumes: `Page`, `CompletionRecord`, and the domain functions from `src/domain/calendar.ts`.
- Produces: a deterministic calendar UI that emits `(date, pageId)` toggles without owning application data.

- [ ] **Step 1: Write the failing jsdom component test**

Create `src/components/CalendarView.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CalendarView from "./CalendarView";

const pages = [
  { id: "aws", name: "AWS暗記帳", cards: [] },
  { id: "english", name: "英単語", cards: [] },
];

describe("CalendarView", () => {
  it("colors completed dates and toggles a selected book", () => {
    const toggles: Array<[string, string]> = [];
    render(
      <CalendarView
        pages={pages}
        completionRecords={[{ date: "2026-10-22", pageId: "aws" }]}
        today="2026-10-22"
        onToggleCompletion={(date, pageId) => toggles.push([date, pageId])}
      />,
    );

    const completedDay = screen.getByRole("button", { name: "2026-10-22" });
    expect(completedDay.className).toContain("has-completion");

    fireEvent.click(completedDay);
    fireEvent.click(screen.getByRole("button", { name: "英単語" }));
    expect(toggles).toEqual([["2026-10-22", "english"]]);
  });

  it("moves between months", () => {
    render(
      <CalendarView
        pages={pages}
        completionRecords={[]}
        today="2026-10-22"
        onToggleCompletion={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次の月" }));
    expect(screen.getByRole("heading", { name: "2026年11月" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the component tests and verify they fail because the component is missing**

Run:

```powershell
npm test -- --run src/components/CalendarView.test.tsx
```

Expected: FAIL because `CalendarView.tsx` does not exist yet.

- [ ] **Step 3: Implement `CalendarView.tsx` with local month and selected-date state**

Implement these behaviors exactly:

- Initialize the displayed year, month, and selected date from the `today` prop.
- Render weekday labels `日`, `月`, `火`, `水`, `木`, `金`, `土`.
- Render `getMonthDays(year, month)` as 42 buttons with `aria-label={day.date}` and `data-date={day.date}`.
- Add `has-completion` when `hasCompletionOnDate(completionRecords, day.date)` is true.
- Add `outside-month` when `day.inMonth` is false and `selected` when it matches the selected date.
- On a date click, set `selectedDate`; if the day is outside the current month, also update the displayed year/month from its date key.
- Render `前の月` and `次の月` buttons that move the month cursor across year boundaries.
- Render the selected date in `YYYY年M月D日` form and render one button per page.
- Use `aria-pressed={isPageCompleted(...)}` on each page button and call `onToggleCompletion(selectedDate, page.id)` when clicked.
- Keep the date grid free of page names; show completion state in the selected-date editor only.

Use no data mutation inside the component; the only state update leaving the component is the supplied callback.

- [ ] **Step 4: Add calendar CSS and run the component tests**

Add these focused rules to `src/styles.css`, keeping the existing orange accent and adding a mobile rule that keeps buttons at least 44px high:

```css
.calendar {
  background: #fff;
  border: 1px solid #e4e8f0;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px #1720330b;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.calendar-header button,
.calendar-day,
.completion-toggle {
  border: 1px solid #d9deea;
  border-radius: 10px;
  background: #fff;
  color: #172033;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
.calendar-header button {
  min-height: 44px;
  padding: 8px 12px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}
.calendar-weekday {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 6px;
  text-align: center;
}
.calendar-day {
  min-height: 52px;
  padding: 8px;
  text-align: left;
}
.calendar-day.has-completion {
  background: #ffded4;
  border-color: #ff5c35;
}
.calendar-day.outside-month {
  color: #aab4c4;
  background: #f8fafc;
}
.calendar-day.selected {
  outline: 3px solid #172033;
  outline-offset: 1px;
}
.completion-editor {
  border-top: 1px solid #e4e8f0;
  margin-top: 20px;
  padding-top: 18px;
}
.completion-list {
  display: grid;
  gap: 8px;
}
.completion-toggle {
  min-height: 48px;
  padding: 12px 14px;
  text-align: left;
}
.completion-toggle.completed {
  background: #172033;
  border-color: #172033;
  color: #fff;
}
@media (max-width: 650px) {
  .calendar {
    padding: 14px;
    border-radius: 16px;
  }
  .calendar-grid {
    gap: 4px;
  }
  .calendar-day {
    min-height: 44px;
    padding: 6px;
  }
}
```

Run:

```powershell
npm test -- --run src/components/CalendarView.test.tsx
```

Expected: PASS with both UI tests passing.

- [ ] **Step 5: Commit the component slice**

```powershell
git add src/components/CalendarView.tsx src/components/CalendarView.test.tsx src/styles.css
git commit -m "feat: add calendar completion view"
```

### Task 4: Connect the calendar to the application state

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `toggleCompletionRecord`, `isPageCompleted`, and `localDateKey` from `src/domain/calendar.ts`, plus `CalendarView`.
- Produces: a working top-level view switch, today completion button, calendar editing, and persistence through the existing save queue.

- [ ] **Step 1: Add the view and completion handlers**

Add `completionRecords: []` to `emptyState`. Add:

```ts
const [view, setView] = useState<"decks" | "calendar">("decks");

function toggleCompletion(date: string, pageId: string) {
  applyLocalState((current) => ({
    ...current,
    completionRecords: toggleCompletionRecord(
      current.completionRecords,
      date,
      pageId,
    ),
  }));
}
```

Compute `today` once per render with `localDateKey(new Date())`, derive `todayCompleted` from `isPageCompleted(state.completionRecords, today, page.id)`, and set `view` to `"decks"` when a page tab is clicked.

- [ ] **Step 2: Add the calendar tab and current-book completion control**

In the existing `.tabs` navigation, keep the page buttons and add a `カレンダー` button whose active class is based on `view === "calendar"`. Page buttons set `view` to `"decks"`; the calendar button sets it to `"calendar"`.

In the deck toolbar, add a button with a visible state:

```tsx
<button
  className={todayCompleted ? "complete-button completed" : "complete-button"}
  onClick={() => toggleCompletion(today, page.id)}
  aria-pressed={todayCompleted}
>
  {todayCompleted ? "今日の学習を完了済み" : "今日の学習を完了"}
</button>
```

- [ ] **Step 3: Render the calendar conditionally and keep deck controls unchanged**

Render the calendar branch and deck branch as follows:

```tsx
{view === "calendar" ? (
  <CalendarView
    pages={state.pages}
    completionRecords={state.completionRecords}
    today={today}
    onToggleCompletion={toggleCompletion}
  />
) : (
  <>
    {/* existing duplicate checker, paste section, legend, and FlashcardTable */}
  </>
)}
```

Move the existing deck-only sections into the fragment; do not remove or alter their handlers. Do not create another save path: all calendar changes must go through `applyLocalState`, so the existing save queue, periodic sync guard, JSON export, and import flow continue to cover them.

- [ ] **Step 4: Run the full test suite and build**

Run:

```powershell
npm test -- --run
npm run build
```

Expected: all tests pass and Vite completes the TypeScript/build step without errors.

- [ ] **Step 5: Commit the application integration**

```powershell
git add src/App.tsx
git commit -m "feat: connect calendar completions to app state"
```

### Task 5: Document the feature and perform final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the completed calendar tab and completion behavior.
- Produces: user-facing instructions and evidence that the complete feature is ready.

- [ ] **Step 1: Update the usage section**

Add instructions after the existing basic usage steps:

1. Open the `カレンダー` tab.
2. Use `今日の学習を完了` on a vocabulary book to color today.
3. Select any date to mark multiple vocabulary books complete or incomplete.
4. Use the month buttons to review previous dates.

Update the file tree to include `CalendarView.tsx` and `calendar.ts`, and explain that completion records are saved with the same cloud state and included in JSON backups.

- [ ] **Step 2: Run the complete verification commands**

Run:

```powershell
npm test -- --run
npm run build
git status --short
```

Expected: tests and build succeed, and `git status --short` is empty after the documentation commit.

- [ ] **Step 3: Perform the manual smoke check in the running app**

Start the app with the existing `npm run dev` workflow and verify:

- The `カレンダー` tab opens without losing the active book.
- The current book's completion button changes label/state after one click and returns after a second click.
- A date with one or more records is colored.
- A selected date can toggle both books independently.
- A previous month date can be selected and edited.
- Reloading preserves the records.
- Deleting a book removes its completion state without removing another book's record.

- [ ] **Step 4: Commit the documentation and final verified state**

```powershell
git add README.md
git commit -m "docs: document calendar completion workflow"
```

## Plan Self-Review

- Spec coverage: the plan covers the separate tab, today toggle, past-date editing, multiple books per day, colored dates, legacy state normalization, cloud/JSON persistence, deleted-book cleanup, and future-friendly record storage.
- Placeholder scan: no unfinished or unspecified implementation step is required; every task has exact files, commands, interfaces, and expected outcomes.
- Type consistency: `CompletionRecord`, `AppState.completionRecords`, `toggleCompletionRecord`, `normalizeCompletionRecords`, `CalendarViewProps`, and the `App.tsx` callback signatures are used consistently across tasks.
- Scope check: all tasks belong to one feature and do not add a separate analytics or notification subsystem.
