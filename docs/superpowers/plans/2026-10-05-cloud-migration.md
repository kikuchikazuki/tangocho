# 単語帳クラウド化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** パソコンを起動しなくても、ログインした本人がスマホとPCから同じ単語帳を使えるようにする。

**Architecture:** React/Viteの画面はVercelへ公開し、Supabase Authでログイン、Supabase Postgresの1行JSON保存で暗記帳全体を管理する。既存のNode保存サーバーとJSONバックアップは開発・復旧用に残し、初回だけ現在のJSONをSupabaseへ移行する。

**Tech Stack:** React、TypeScript、Vite、Supabase JS、Supabase Auth、Supabase Postgres、Vercel、Vitest

## Global Constraints

- 既存の `data/anki-data.json` は移行前に別名バックアップを作り、上書きしない。
- ログインしていないユーザーには単語帳データを表示しない。
- Row Level Securityでログインユーザー自身のデータだけ読み書きできるようにする。
- 文字化けした置換文字 `�` を保存しない。
- PCとスマホで同じクラウドデータを使用する。
- ローカルJSONの書き出し・読み込み機能は残す。
- SupabaseのURL・公開キーは環境変数で管理し、パスワードや秘密鍵をソースへ書かない。

## File Map

- Create: `src/lib/supabase.ts` — Supabaseクライアント生成
- Create: `src/storage/cloudStorage.ts` — ログインユーザーの状態の読込・保存
- Create: `src/components/AuthScreen.tsx` — ログイン・新規登録・ログアウトUI
- Modify: `src/App.tsx` — 認証状態とクラウド保存の接続
- Modify: `src/storage/storage.ts` — ローカル保存とクラウド保存の境界整理
- Create: `supabase/schema.sql` — テーブルとRow Level Security
- Create: `scripts/migrate-to-supabase.mjs` — ローカルJSONの初回移行
- Modify: `.env.example` — 必要な環境変数の例
- Modify: `README.md` — Supabase/Vercelの設定手順
- Create: `src/storage/cloudStorage.test.ts` — クラウド保存の検証

### Task 1: Supabase接続情報とデータベース構造を追加

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/supabase.ts`
- Create: `.env.example`

**Interfaces:**
- Produces `supabase` client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Produces `flashcard_states(user_id, state, updated_at)` with one row per user.

- [ ] Step 1: Write SQL for the table, primary key, JSON validation, timestamp trigger, and RLS policies.
- [ ] Step 2: Add the client factory and fail clearly when environment variables are missing.
- [ ] Step 3: Add `.env.example` without real credentials.
- [ ] Step 4: Run `npm.cmd run build` and confirm TypeScript compiles.

### Task 2: 認証画面を追加

**Files:**
- Create: `src/components/AuthScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `AuthScreen` accepts `onAuthenticated: () => void` only if the app keeps auth state in the parent, or uses Supabase `onAuthStateChange` directly.
- The UI supports email/password sign-in, sign-up, and sign-out.

- [ ] Step 1: Write component tests for signed-out display and validation of empty fields.
- [ ] Step 2: Implement sign-in and sign-up forms with Japanese error messages.
- [ ] Step 3: Subscribe to `supabase.auth.onAuthStateChange` and show the app only for an authenticated session.
- [ ] Step 4: Add a visible logout button.
- [ ] Step 5: Run `npm.cmd test -- --run`.

### Task 3: クラウド保存層を実装

**Files:**
- Create: `src/storage/cloudStorage.ts`
- Create: `src/storage/cloudStorage.test.ts`
- Modify: `src/storage/storage.ts`

**Interfaces:**
- `loadCloudState(): Promise<AppState | null>` reads the logged-in user's row.
- `saveCloudState(state: AppState): Promise<void>` upserts the logged-in user's row.
- Both functions reject malformed or replacement-character data.

- [ ] Step 1: Write failing tests for missing row, successful upsert, and rejected broken text.
- [ ] Step 2: Implement the Supabase query using the authenticated user's ID.
- [ ] Step 3: Ensure saves use one upsert per user and never use a shared public row.
- [ ] Step 4: Run `npm.cmd test -- --run src/storage/cloudStorage.test.ts`.

### Task 4: Appの保存・同期先をクラウドへ切り替え

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/domain/types.ts` only if sync metadata needs a typed field

**Interfaces:**
- Initial load uses the authenticated user's cloud state.
- Local changes are serialized before the next polling result is applied.
- Existing JSON export/import remains available.

- [ ] Step 1: Add a failing test for a newly added card remaining visible while a previous save is pending.
- [ ] Step 2: Replace API state loading/saving with `loadCloudState` and `saveCloudState`.
- [ ] Step 3: Preserve the existing save queue and revision guard that prevents stale remote state from overwriting local changes.
- [ ] Step 4: Display connection/save errors without clearing the current in-memory state.
- [ ] Step 5: Run `npm.cmd test -- --run` and `npm.cmd run build`.

### Task 5: 既存JSONを安全に移行するスクリプトを追加

**Files:**
- Create: `scripts/migrate-to-supabase.mjs`
- Modify: `package.json`

**Interfaces:**
- Command: `npm.cmd run migrate:cloud -- <email>` after environment variables and login credentials are configured.
- Reads `data/anki-data.json` without modifying it.
- Creates a timestamped local backup before uploading.

- [ ] Step 1: Write a dry-run mode that validates page structure and broken-text rejection.
- [ ] Step 2: Implement authenticated upload for the selected user.
- [ ] Step 3: Require explicit `--apply` before writing to Supabase.
- [ ] Step 4: Run dry-run against a copy of the current JSON and confirm no source file changes.

### Task 6: Vercel公開と設定手順を文書化

**Files:**
- Modify: `README.md`
- Modify: `package.json` if a production preview script is needed

- [ ] Step 1: Document Supabase project creation, SQL execution, Auth email settings, and environment variables.
- [ ] Step 2: Document Vercel import, build command `npm run build`, and output directory `dist`.
- [ ] Step 3: Document the first-user registration and migration command.
- [ ] Step 4: Document how to add the deployed URL to Supabase Auth redirect URLs.
- [ ] Step 5: Document local fallback and JSON backup recovery.

### Task 7: 実データ移行と総合確認

**Files:**
- No source file changes expected; uses `data/anki-data.json` and the cloud dashboard.

- [ ] Step 1: Create a dated backup of the current JSON.
- [ ] Step 2: Register the user's account without exposing the password in chat or source files.
- [ ] Step 3: Run migration dry-run, review page and card counts, then run explicit apply.
- [ ] Step 4: Confirm login, page selection, card addition, progress updates, deletion, export, and logout.
- [ ] Step 5: Open the deployed URL from both PC and smartphone and verify the same newly added card appears after reload.
- [ ] Step 6: Confirm Supabase RLS blocks unauthenticated reads and cross-user access.

## Verification Commands

```powershell
npm.cmd test -- --run
npm.cmd run build
```

Expected result: all tests pass and Vite produces `dist` without TypeScript errors.
