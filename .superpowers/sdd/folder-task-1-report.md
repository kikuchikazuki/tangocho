# Task 1 Report: Folder and Card Organization Domain

## Status

Completed and committed.

## Commit

`c3eec968fa00302b8d65b71ce148f732b5b756dd` — `feat: add folder and card organization domain`

## Changes

- Added `Folder`, required `Page.folderId`, and `AppState.folders` model fields, updating existing constructors and typed fixtures for compatibility.
- Added organization-state normalization for legacy state, absent folders/page folder IDs, and references to nonexistent folders. Completion records remain normalized using the existing calendar rules.
- Added single and multiple card move helpers. Moves preserve card object identity and progress, keep completion records intact, append cards in requested ID order, ignore unknown card IDs, and reject same-page moves.
- Added page-folder assignment and folder deletion. Deleting a folder clears matching page references while retaining pages and cards.
- Applied organization normalization in cloud sanitization, which is used both when loading and before saving.
- Added focused organization and cloud-storage tests.

## Tests and verification

The required command was run with the workspace `.tmp` directory set as the process temp location because Vitest initially hit `EPERM` while renaming files in the sandbox's protected Windows temp directory:

```text
npm test -- --run src/storage/cloudStorage.test.ts src/domain/organization.test.ts
Test Files  2 passed (2)
Tests       10 passed (10)
```

The first successful collection after adding tests showed the expected failures: missing cloud defaults and the absent organization module. A subsequent green run passed all 10 focused tests.

```text
npm run build
tsc -b && vite build
✓ built in 962ms
```

`git diff --cached --check` also completed without whitespace errors.

## Concerns

- Vite prints a pre-existing config-loader warning about ESM syntax in `vite.config.ts` loaded as CommonJS. It did not prevent tests or the production build from passing.
- Git reports LF-to-CRLF normalization notices for changed source files on this Windows checkout; no whitespace errors were reported.

## Reviewer follow-up fixes

### Changes

- Card moves now collect every card object in the source page whose ID was requested, including multiple distinct objects with the same ID. They remove those exact objects from the source and append all of them to the target.
- Added a regression test that verifies both duplicate-ID objects retain identity, both arrive at the target, and unrelated source cards remain.
- Added cloud-boundary tests proving a legacy payload is normalized when returned by `loadCloudState` and when passed to the `upsert` call in `saveCloudState`.

### Red-green evidence

Before the move fix, the duplicate-ID regression failed because the target contained one object instead of two:

```text
FAIL moves every source card object with a requested duplicate ID
expected ... to have a length of 2 but got 1
```

After the fix, the covering tests passed:

```text
npm test -- --run src/storage/cloudStorage.test.ts src/domain/organization.test.ts
Test Files  2 passed (2)
Tests       13 passed (13)
```

The production build passed after the fixes:

```text
npm run build
tsc -b && vite build
✓ built in 226ms
```

The same pre-existing Vite config-loader warning described above is still printed. The new cloud-boundary tests use a mocked Supabase client, so no live cloud account or network was involved.

### Fix commit

See the follow-up commit in the final task status.
