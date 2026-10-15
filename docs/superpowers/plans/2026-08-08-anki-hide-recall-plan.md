# 暗記帳アウトプットアプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AWS暗記帳を初期データとして、ユーザーが暗記帳と問題を追加し、左右を隠してアウトプット練習できるブラウザアプリを作る。

**Architecture:** 依存を最小限にしたVite + React + TypeScriptアプリとする。`src/domain`にデータ変換と進捗ロジック、`src/storage`にlocalStorage永続化、`src/components`にUIを分離する。Appはページ選択と状態更新を束ね、各カードは左右の表示と進捗を独立して描画する。

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, CSS, browser localStorage

## Global Constraints

- 初期ページは「AWS暗記帳」のみとする。
- 入力は `左の項目 = 右の説明` の1行1問形式とする。
- 空行、`=` がない行、左右どちらかが空の行は登録しない。
- 進捗は `0 → 1 → 2 → 3 → 0` の循環で更新する。
- ページ、問題、表示状態、進捗をlocalStorageに保存する。
- モバイル幅でも大きなタップ領域で操作できるようにする。

---

### Task 1: Project scaffold and domain model

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/domain/types.ts`
- Create: `src/domain/parser.ts`
- Create: `src/domain/progress.ts`
- Create: `src/domain/initialData.ts`
- Create: `src/domain/parser.test.ts`
- Create: `src/domain/progress.test.ts`

**Interfaces:**
- `parseCards(input: string): Array<{ left: string; right: string }>`
- `nextProgress(value: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3`
- `AppState`, `Page`, `Card` types from `src/domain/types.ts`

- [ ] **Step 1: Create the package and test configuration**

  Add scripts `dev`, `build`, and `test`; configure Vitest through Vite config if needed.

- [ ] **Step 2: Write parser and progress tests**

  Cover valid lines, blank lines, missing separators, empty sides, first `=` splitting, and the exact progress cycle.

- [ ] **Step 3: Run tests and verify the initial failure**

  Run `npm test -- --run`. Expected: FAIL because domain functions do not exist yet.

- [ ] **Step 4: Implement types, parser, initial AWS data, and progress function**

  Keep the initial AWS dataset in a typed constant; parse each non-empty line using the first `=` and trim both sides.

- [ ] **Step 5: Run the domain tests**

  Run `npm test -- --run`. Expected: all parser and progress tests PASS.

- [ ] **Step 6: Commit**

  Run `git add package.json index.html src && git commit -m "feat: scaffold anki app domain"`.

### Task 2: Persistence and state operations

**Files:**
- Create: `src/storage/storage.ts`
- Create: `src/storage/storage.test.ts`
- Create: `src/domain/state.ts`
- Create: `src/domain/state.test.ts`

**Interfaces:**
- `loadState(): AppState`
- `saveState(state: AppState): void`
- `createPage(name: string): Page`
- `appendCards(page: Page, input: string): { page: Page; added: number; skipped: number }`
- `setRevealForSide(page: Page, side: "left" | "right", reveal: boolean): Page`
- `clearProgress(page: Page, side: "left" | "right" | "both"): Page`

- [ ] **Step 1: Write failing storage and state tests**

  Verify default AWS state, round-trip serialization, page creation, paste append counts, side reveal updates, and left/right/both progress clearing.

- [ ] **Step 2: Run the focused tests**

  Run `npm test -- --run src/storage/storage.test.ts src/domain/state.test.ts`. Expected: FAIL with missing module/function errors.

- [ ] **Step 3: Implement immutable state operations and localStorage adapter**

  Use stable generated IDs, preserve existing cards when appending, and catch malformed stored JSON by returning fresh AWS state.

- [ ] **Step 4: Run focused tests and then all tests**

  Run `npm test -- --run src/storage/storage.test.ts src/domain/state.test.ts` and `npm test -- --run`. Expected: PASS.

- [ ] **Step 5: Commit**

  Run `git add src/domain src/storage && git commit -m "feat: add persistent anki state"`.

### Task 3: Build the interaction UI

**Files:**
- Create: `src/components/PageTabs.tsx`
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/PastePanel.tsx`
- Create: `src/components/FlashcardTable.tsx`
- Create: `src/components/FlashcardRow.tsx`
- Create: `src/components/ProgressCycle.tsx`
- Create: `src/styles.css`
- Modify: `src/App.tsx`
- Create: `src/components/App.test.tsx`

**Interfaces:**
- `FlashcardRow` receives one `Card` and callbacks for reveal and progress changes.
- `ProgressCycle` receives `value: 0 | 1 | 2 | 3` and `onChange(nextValue)`.
- `App` owns `AppState`, active page, save-on-change, and modal/paste form state.

- [ ] **Step 1: Write UI tests for the user-visible workflows**

  Test initial AWS page, adding a page, pasting valid and invalid rows, tapping hidden cells, toggling left/right all-hide buttons, cycling progress, and all-clear actions.

- [ ] **Step 2: Run UI tests and verify failure**

  Run `npm test -- --run src/components/App.test.tsx`. Expected: FAIL because components and handlers are incomplete.

- [ ] **Step 3: Implement page tabs and page creation UI**

  Show AWS暗記帳 initially, allow a non-empty page name, switch active pages, and show the active page’s cards.

- [ ] **Step 4: Implement paste panel and toolbar**

  Add a textarea and append action; report added/skipped counts. Add left hide/show, right hide/show, show both, and left/right/both progress clear controls.

- [ ] **Step 5: Implement card rows and progress cycle**

  Render hidden cells as tappable masked surfaces, reveal only the tapped cell, render progress as three visual steps, and cycle 0→1→2→3→0 on click.

- [ ] **Step 6: Add responsive styling**

  Use a clear two-column desktop layout that collapses gracefully on narrow screens, with touch targets at least 44px high and visible focus states.

- [ ] **Step 7: Run UI tests and production build**

  Run `npm test -- --run` and `npm run build`. Expected: all tests PASS and the build completes without TypeScript errors.

- [ ] **Step 8: Commit**

  Run `git add src && git commit -m "feat: add anki recall interface"`.

### Task 4: End-to-end verification and handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document startup and paste format**

  Explain `npm install`, `npm run dev`, the initial AWS page, page creation, paste format, reveal behavior, progress cycle, and local browser persistence.

- [ ] **Step 2: Run the complete verification commands**

  Run `npm test -- --run` and `npm run build`. Expected: all tests PASS and build succeeds.

- [ ] **Step 3: Manually verify the main mobile and desktop flows**

  Open the app, add a page, paste mixed valid/invalid input, hide both sides, reveal individual cells, cycle and clear progress, reload, and verify state remains.

- [ ] **Step 4: Commit documentation**

  Run `git add README.md && git commit -m "docs: document anki app usage"`.
