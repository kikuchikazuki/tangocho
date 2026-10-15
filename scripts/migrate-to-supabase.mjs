import { readFile, copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const source = join(process.cwd(), "data", "anki-data.json");
const backup = join(
  process.cwd(),
  "data",
  `anki-data-before-cloud-${new Date().toISOString().replace(/[.:]/g, "-")}.json`,
);

function hasBrokenText(value) {
  if (typeof value === "string") return value.includes("�");
  if (Array.isArray(value)) return value.some(hasBrokenText);
  if (value && typeof value === "object") return Object.values(value).some(hasBrokenText);
  return false;
}

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_MIGRATION_EMAIL;
const password = process.env.SUPABASE_MIGRATION_PASSWORD;
if (!url || !anonKey || !email || !password) {
  throw new Error("VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、SUPABASE_MIGRATION_EMAIL、SUPABASE_MIGRATION_PASSWORDを設定してください。");
}

const state = JSON.parse(await readFile(source, "utf8"));
if (!Array.isArray(state.pages) || !state.activePageId || hasBrokenText(state)) {
  throw new Error("JSONの形式が不正、または文字化けが含まれています。");
}
console.log(`暗記帳 ${state.pages.length}冊、問題 ${state.pages.reduce((sum, page) => sum + page.cards.length, 0)}問`);

if (!apply) {
  console.log("確認だけ行いました。実際に移行する場合は --apply を付けてください。");
  process.exit(0);
}

await mkdir(dirname(backup), { recursive: true });
await copyFile(source, backup);
const supabase = createClient(url, anonKey);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.user) throw authError ?? new Error("ログインできませんでした。");
const { error } = await supabase.from("flashcard_states").upsert({
  user_id: auth.user.id,
  state,
  updated_at: new Date().toISOString(),
});
if (error) throw error;
console.log(`移行完了。バックアップ: ${backup}`);
