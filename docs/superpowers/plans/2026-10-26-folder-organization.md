# 暗記帳フォルダ整理・問題移動機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-level folders, individual and bulk card moves, and a reviewable classification-suggestion workflow without breaking existing saved data.

**Architecture:** Extend `AppState` with normalized folders and page folder IDs. Keep pure folder/card operations in `src/domain`, normalize legacy state at the storage boundary, and add a focused management view that App renders beside the existing deck and calendar views. Use the existing state-update/save flow so every accepted move is persisted as one state transition.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Supabase-backed JSON state.

## Global Constraints

- Folders are one level only; no nested folders.
- Existing pages without a folder remain in the uncategorized state (`folderId: null`).
- Card moves preserve card IDs, card progress, and calendar completion records.
- Classification suggestions require user confirmation before applying.
- Do not add a new dependency for drag-and-drop or AI classification in this first version.

---

### Task 1: Extend the domain model and normalize legacy state

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/state.ts`
- Modify: `src/storage/cloudStorage.ts`
- Test: `src/storage/cloudStorage.test.ts`
- Create: `src/domain/organization.ts`
- Test: `src/domain/organization.test.ts`

**Interfaces:**
- `Folder = { id: string; name: string }`
- `Page.folderId: string | null`
- `AppState.folders: Folder[]`
- `normalizeOrganizationState(state: unknown): AppState`
- `moveCardBetweenPages(state: AppState, cardId: string, sourcePageId: string, targetPageId: string): AppState`
- `moveCardsBetweenPages(state: AppState, cardIds: string[], sourcePageId: string, targetPageId: string): AppState`
- `setPageFolder(state: AppState, pageId: string, folderId: string | null): AppState`
- `deleteFolder(state: AppState, folderId: string): AppState`

- [ ] **Step 1: Add failing tests for legacy defaults and folder validation**

  Assert that a state without `folders` receives `folders: []`, pages without `folderId` receive `folderId: null`, and invalid folder references become `null`.

- [ ] **Step 2: Run the focused tests and verify failure**

  Run `npm test -- --run src/storage/cloudStorage.test.ts src/domain/organization.test.ts`.
  Expected: FAIL because the new fields and functions do not exist.

- [ ] **Step 3: Implement the types and pure organization operations**

  Preserve card objects while removing them from the source page and appending them to the target page. Reject same-page moves and ignore unknown card IDs. When deleting a folder, set matching pages to `folderId: null` and retain all pages and cards.

- [ ] **Step 4: Normalize at the cloud storage boundary**

  Apply the organization normalizer on load and before save, while retaining existing completion-record normalization.

- [ ] **Step 5: Run focused tests and commit**

  Run `npm test -- --run src/storage/cloudStorage.test.ts src/domain/organization.test.ts`.
  Expected: PASS.
  Commit with `git add src/domain src/storage && git commit -m "feat: add folder and card organization domain"`.

### Task 2: Add folder and page organization management UI

**Files:**
- Create: `src/components/OrganizationView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/components/OrganizationView.test.tsx`

**Interfaces:**
- `OrganizationView` receives `state`, `onCreateFolder`, `onRenameFolder`, `onDeleteFolder`, and `onSetPageFolder` callbacks.
- The view exposes accessible controls for folder creation, rename, deletion, and page folder selection.

- [ ] **Step 1: Write failing view tests**

  Test rendering uncategorized pages, creating a folder through a form, changing a page’s folder, and deleting a folder while showing pages as uncategorized.

- [ ] **Step 2: Run the focused view test and verify failure**

  Run `npm test -- --run src/components/OrganizationView.test.tsx`.
  Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the management view**

  Render folders as one-level sections, an explicit “未分類” section, page names, and simple form controls. Use confirmation before destructive folder deletion. Keep all mutation logic in callbacks supplied by `App`.

- [ ] **Step 4: Connect organization state to `App`**

  Add an `organization` view mode and a header button labeled `整理・管理`. Use the existing local-state update and save status flow. Add page folder callbacks that call the pure domain operations.

- [ ] **Step 5: Run view tests and commit**

  Run `npm test -- --run src/components/OrganizationView.test.tsx src/components/CalendarView.test.tsx`.
  Expected: PASS.
  Commit with `git add src/App.tsx src/components/OrganizationView.tsx src/components/OrganizationView.test.tsx src/styles.css && git commit -m "feat: add folder organization view"`.

### Task 3: Add individual and bulk card moves

**Files:**
- Modify: `src/components/FlashcardTable.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/domain/organization.ts`
- Test: `src/components/FlashcardTable.test.tsx`

**Interfaces:**
- `FlashcardTable` receives `pages`, `selected`, `onMoveCard`, and `onMoveSelected` callbacks.
- Individual move and bulk move both accept a target page ID and preserve source page selection state.

- [ ] **Step 1: Add failing component tests**

  Assert that each card exposes a `移動` control, selected cards expose `選択した問題を移動`, same-page targets are unavailable, and confirming a target invokes the callback with the expected card IDs.

- [ ] **Step 2: Run the focused test and verify failure**

  Run `npm test -- --run src/components/FlashcardTable.test.tsx`.
  Expected: FAIL because the move controls do not exist.

- [ ] **Step 3: Implement individual move controls**

  Add a target-page select or dialog per card. Require a confirmation before invoking `onMoveCard`.

- [ ] **Step 4: Implement bulk move controls**

  Reuse the current selection state and pass selected card IDs to the same move domain operation. Clear selection only after a successful move.

- [ ] **Step 5: Connect moves to `App` and verify preservation**

  Update state with `moveCardBetweenPages` or `moveCardsBetweenPages`, preserve card progress and completion records, and show the existing save status.

- [ ] **Step 6: Run tests and commit**

  Run `npm test -- --run src/components/FlashcardTable.test.tsx src/domain/organization.test.ts src/domain/deletion.test.ts`.
  Expected: PASS.
  Commit with `git add src/App.tsx src/components/FlashcardTable.tsx src/components/FlashcardTable.test.tsx src/domain/organization.ts src/styles.css && git commit -m "feat: move cards between decks"`.

### Task 4: Add classification suggestion review workflow

**Files:**
- Create: `src/components/ClassificationReview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/components/ClassificationReview.test.tsx`

**Interfaces:**
- `ClassificationReview` receives `pages`, `suggestions`, `onChangeTarget`, and `onApply`.
- `ClassificationSuggestion` remains temporary UI state and is not persisted until `onApply`.

- [ ] **Step 1: Write failing review tests**

  Test that a suggestion row shows the card, current page, candidate target, editable target, and an apply action. Test that changing a target updates the pending suggestion and apply sends only accepted valid rows.

- [ ] **Step 2: Run the focused test and verify failure**

  Run `npm test -- --run src/components/ClassificationReview.test.tsx`.
  Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement candidate generation without external AI dependency**

  Start with a deterministic review list based on existing cards and available pages, with the candidate target selected manually in the UI. Keep the suggestion model ready for future AI-generated reasons without allowing unconfirmed writes.

- [ ] **Step 4: Apply accepted suggestions as one state update**

  Group suggestions by source page, move accepted cards to their selected target pages, preserve card IDs and progress, and leave rejected rows untouched.

- [ ] **Step 5: Run tests and commit**

  Run `npm test -- --run src/components/ClassificationReview.test.tsx src/domain/organization.test.ts`.
  Expected: PASS.
  Commit with `git add src/App.tsx src/components/ClassificationReview.tsx src/components/ClassificationReview.test.tsx src/styles.css && git commit -m "feat: add classification review workflow"`.

### Task 5: End-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `src/components/CalendarView.test.tsx`
- Modify: `src/storage/cloudStorage.test.ts`

- [ ] **Step 1: Add regression coverage**

  Verify calendar records remain attached to their pages after card moves, old state without folders still loads, and the three top-level views remain reachable from the header.

- [ ] **Step 2: Update README usage instructions**

  Document folder management, individual/bulk card moves, uncategorized pages, and the confirmation-based classification review.

- [ ] **Step 3: Run the complete verification suite**

  Run `npm test -- --run` and `npm run build`.
  Expected: all tests pass and Vite produces a successful production build.

- [ ] **Step 4: Review the final diff and commit documentation**

  Run `git diff --check` and `git status --short`. Commit the README and regression tests with `git add README.md src/components/CalendarView.test.tsx src/storage/cloudStorage.test.ts && git commit -m "docs: document organization workflow"`.
