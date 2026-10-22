# Calendar completion UX final review fix

## Status

Completed and committed as `fix: harden calendar completion UX`.

## Findings addressed

1. **Today's completion shortcut:** `App` now stores the displayed local date in state and refreshes it every minute, when the window regains focus, and when document visibility changes. Clicking the shortcut independently derives the local date at click time, updates displayed state immediately, and records the toggle against that click-time date. This covers a tab left open across midnight and a click that arrives before the periodic refresh.
2. **Calendar accessibility:** Each calendar date button includes “學習完了” in its accessible name when any completion exists that day. `aria-pressed` continues to convey whether that date is selected. Tests cover completed and incomplete dates, including a completed adjacent-month date.
3. **Adjacent-month completion styling:** A completed date outside the displayed month now retains the orange completion fill and border, with readable foreground text.
4. **Mobile toolbar order:** The today-completion shortcut is the first toolbar action, ahead of export/import and other secondary actions.

## Files changed

- `src/App.tsx`
- `src/components/CalendarView.tsx`
- `src/components/CalendarView.test.tsx`
- `src/styles.css`

## Verification

All commands used the workspace-local `.superpowers/sdd/tmp` directory for `TEMP` and `TMP` to avoid Windows sandbox temporary-file rename restrictions.

- Focused: `npm test -- --run src/components/CalendarView.test.tsx` — passed, 1 file / 9 tests.
- Full: `npm test -- --run` — passed, 7 files / 29 tests.
- Build: `npm run build` — passed; TypeScript compilation and Vite production build completed.
- `git diff --check` — passed.

Vite emitted its existing warning about the CommonJS `vite.config.ts` under the native config loader; it did not prevent test or build success.

## Concerns

No remaining known issues related to the four review findings. Today-state refresh runs once per minute while the app is open and also runs immediately on focus and visibility changes. Completion records are stored using the app's local date key, matching existing calendar behavior.

## Commit

`fix: harden calendar completion UX`
