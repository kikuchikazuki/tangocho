# 単語帳

左右を隠して答える、シンプルな暗記アウトプットアプリです。

## 使っているツール

- React：画面を作るライブラリ
- TypeScript：間違いに気づきやすくするJavaScript
- Vite：開発サーバーとビルドを担当
- Vitest：処理のテストを担当
- localStorage：ブラウザ内への保存を担当

## 起動方法

### PCで起動する

```bash
npm install
npm run dev
```

以後は `start.bat` をダブルクリックして起動できます。

### スマホで使う

PCとスマホを同じWi-Fiにつなぎ、PCで `start.bat` を起動します。
PCのIPv4アドレスを確認し、スマホで次のURLを開きます。

```text
http://PCのIPアドレス:5173
```

## 基本的な使い方

1. 初期ページの「AWS暗記帳」を開く
2. `左の項目 = 右の説明` を1行ずつ貼り付ける
3. 「この暗記帳に追加」を押す
4. 問題をタップして、隠れた答えを表示する
5. 進捗マークを押して、0週目→1週目→2週目→3週目と進める

暗記帳は「暗記帳を追加」から自由に増やせます。問題数はページごとに表示されます。

### フォルダ整理と問題の移動

ヘッダーの「整理・管理」から、暗記帳を1階層のフォルダに分類できます。既存の暗記帳は最初は「未分類」として表示されます。問題画面では、各問題の「移動」または複数選択後の「選択した問題を移動」から、別の暗記帳へ問題を移せます。移動前には確認が表示され、進捗とカレンダー記録は維持されます。

整理・管理画面の「分類候補の確認」では、問題ごとに移動先を選び、確認後にまとめて反映できます。

## 重複チェック

「重複チェック」を押すと、完全に同じ問題と、表記ゆれを含む似た問題が候補に出ます。

残す問題ではなく、削除したい問題にチェックを入れてください。削除ボタンを押した後、確認を選んだ場合だけ削除されます。

## ファイル構成

```text
src/
├─ App.tsx                    画面全体と操作のつなぎ込み
├─ main.tsx                   Reactアプリの開始地点
├─ styles.css                 画面の見た目
├─ components/
│  ├─ FlashcardTable.tsx      問題一覧と左右の表示
│  ├─ ProgressCycle.tsx       3段階進捗の表示と更新
│  └─ CalendarView.tsx        カレンダーと日別の完了記録の編集
├─ domain/
│  ├─ types.ts                データの型
│  ├─ initialData.ts          初期AWSデータ
│  ├─ parser.ts               貼り付けテキストの変換
│  ├─ state.ts                問題追加・表示・削除の処理
│  ├─ progress.ts             進捗の循環処理
│  ├─ duplicates.ts           重複・類似問題の検索
│  └─ calendar.ts             日付表示と完了記録の処理
└─ storage/
   └─ storage.ts              localStorageへの保存と読み込み
```

## 仕組み

画面で操作すると、`App.tsx` が状態を更新します。状態は `Page` と `Card` というデータで管理されています。

状態が変わるたびに `storage.ts` がlocalStorageへ保存するため、ブラウザを閉じても暗記帳や進捗が残ります。

貼り付けた文章は `parser.ts` が最初の `=` で左右に分けます。空行や形式が違う行は追加しません。

重複チェックでは `duplicates.ts` が空白・記号・大文字小文字などを整えてから、左右の文章の似ている度合いを計算します。

## テストとビルド

```bash
npm test -- --run
npm run build
```
# 単語帳

React + TypeScript + Viteで作ったAWS暗記帳アプリです。

## 現在の構成

- 画面: React
- 開発サーバー: Vite
- クラウド認証・保存: Supabase
- 公開: Vercel
- ローカル開発用保存: `server/server.js` と `data/anki-data.json`

## クラウド設定

1. Supabaseでプロジェクトを作成します。
2. SQL Editorで `supabase/schema.sql` を実行します。
3. SupabaseのAuthenticationでメール認証を有効にします。
4. `.env.example` を `.env.local` にコピーし、URLとanon keyを設定します。

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. `npm.cmd run dev` で起動します。
6. 画面から新規登録してログインします。

## カレンダーで学習完了を記録する

1. 「カレンダー」タブを開きます。
2. 単語帳を選び、「今日の学習を完了」を押すと、今日の日付に完了記録が付きます。
3. カレンダーで日付を選ぶと、複数の単語帳それぞれについて完了・未完了を切り替えられます。
4. 「前の月」「次の月」で過去の日付を確認し、記録を編集できます。

完了記録はほかのデータと同じクラウド上の状態に保存され、JSONバックアップにも含まれます。記録は日付と単語帳の組み合わせごとに独立しています。

## 既存データの移行

移行前にJSONを検査します。これはクラウドを書き換えません。

```powershell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your-anon-key"
$env:SUPABASE_MIGRATION_EMAIL="登録したメールアドレス"
$env:SUPABASE_MIGRATION_PASSWORD="パスワード"
npm.cmd run migrate:cloud
```

問題がなければ、明示的に `--apply` を付けて移行します。

```powershell
npm.cmd run migrate:cloud -- --apply
```

移行前には `data/anki-data-before-cloud-日時.json` が作られます。パスワードはファイルやソースへ書きません。

## Vercel公開

Vercelでこのプロジェクトを読み込み、次の値を設定します。

- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `.env.local` と同じ2項目

公開後のURLはSupabase AuthenticationのURL Configurationに登録します。スマホでは、その公開URLを開いてログインすれば、パソコンなしで使用できます。
