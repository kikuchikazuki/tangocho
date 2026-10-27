# Task 3 report: individual and bulk card moves

## Status and commit

Implemented Task 3 and committed as `4b10a76` (`feat: move cards between decks`). The commit contains only `src/App.tsx`, `src/components/FlashcardTable.tsx`, `src/components/FlashcardTable.test.tsx`, and `src/styles.css`. `src/domain/organization.ts` already provided the required move operations and needed no change.

## Changes

- Added a labeled selection checkbox and a `移動` control to each card. Added a bulk target selector and `選択した問題を移動` control.
- Excluded the current page from both target selectors. Disabled move buttons until a valid destination is selected; bulk move also requires selected cards.
- Asked for confirmation before invoking move callbacks. Cancellation leaves cards and selection unchanged.
- Connected individual and bulk actions in `App.tsx` to `moveCardBetweenPages` and `moveCardsBetweenPages`. Kept the source page active, removed selection only after a valid move, and scoped bulk IDs to cards on that page. Switching pages clears the prior page's selection.
- Preserved card objects, IDs, progress, and calendar completion records through the existing domain operations. The existing message/save behavior remains in place. No copy action was added.
- Styled both move control groups for desktop and narrow layouts.

## TDD and verification

Added `FlashcardTable.test.tsx` first. Its four initial tests failed because the move controls and selection checkboxes were absent (4/4 expected failures). Implemented the controls and observed the tests pass, then added an App integration test for source-page continuity and destination content.

- `npm test -- --run src/components/FlashcardTable.test.tsx src/domain/organization.test.ts src/domain/deletion.test.ts`: **3 files passed, 16 tests passed, exit 0**.
- `npm run build`: **TypeScript and Vite build passed, exit 0**; 72 modules transformed.
- `git diff --cached --check`: **passed, exit 0** before commit.

Vitest initially failed to initialize its temporary client cache with an `EPERM` rename error in the sandbox temporary directory. Setting `TEMP` and `TMP` to the workspace `.tmp` directory allowed the exact requested test command to run; it then passed. Vite also emitted its existing warning about ESM syntax in `vite.config.ts` under the future native config loader. Neither affected test or build results.

## Concerns

No known Task 3 functional concerns. Other pre-existing modified and untracked files in `.superpowers/sdd` and `src/App.test.tsx` were left untouched and were not included in the commit. This report was written after the specified source commit and is not part of it.

## Review fixes (follow-up)

The review identified two UI defects in commit `4b10a76`: the bulk destination state persisted across source-page changes while `FlashcardTable` remained mounted, and all per-card move buttons had the accessible name `移動`.

- Moved bulk destination state into a `BulkMove` component keyed by the active source page ID. Changing decks remounts that control, clears its destination, and disables the bulk action until the user selects a destination again. The regression test also switches back to the original deck to ensure the old choice does not reappear.
- Each card move button now has a prompt-based accessible name. When prompt prefixes match, its stable card ID disambiguates the name. The visible button text remains `移動`.
- Individual and bulk confirmation dialogs now name the selected destination deck.
- Added App-level bulk coverage for cancellation, confirmation, selection clearing, source-deck continuity, and destination content.

The new regression suite failed before the fix for the missing accessible names, retained bulk destination, and destination-free confirmation. After the fix, `npm test -- --run src/components/FlashcardTable.test.tsx src/domain/organization.test.ts src/domain/deletion.test.ts` passed: **3 files, 19 tests, exit 0**. `npm run build` passed: **TypeScript and Vite build, exit 0; 72 modules transformed**. `git diff --check` passed. The existing Vite native config loader warning remains; there are no known functional concerns from this follow-up.

## Accessibility collision fix (second follow-up)

Review found that conditional ID suffixes could still produce equal accessible names. For example, two cards prompted `問題` made the first label `問題（a）を移動`, which collided with a third card whose prompt was literally `問題（a）`. The move button now always uses `問題「<short prompt>」を移動（カードID: <full stable ID>）`. The full ID is outside the prompt delimiters and is present for every card, so distinct card IDs produce distinct names even when prompt text contains an ID-like suffix.

Added a regression test using prompts `問題`, `問題`, and `問題（a）` with IDs `a`, `b`, and `c`; it checks the exact accessible names and their uniqueness. The test-first run failed for the expected naming mismatch. After the fix, `npm test -- --run src/components/FlashcardTable.test.tsx src/domain/organization.test.ts src/domain/deletion.test.ts` passed: **3 files, 20 tests, exit 0**. `npm run build` passed: **TypeScript and Vite build, exit 0; 72 modules transformed**. The existing Vite native config loader warning remains. No known concerns from this fix.
