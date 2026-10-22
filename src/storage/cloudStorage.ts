import type { AppState } from "../domain/types";
import { normalizeCompletionRecords } from "../domain/calendar";
import { supabase } from "../lib/supabase";

type SavedAppState = Omit<AppState, "completionRecords"> & {
  completionRecords?: unknown;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの環境変数が設定されていません。");
  return supabase;
}

/** 文字化けの置換文字だけを取り除き、単語や説明そのものは残します。 */
export function sanitizeAppState(state: SavedAppState): AppState {
  const clean = (text: string) => text.replace(/�/g, "");
  const cleanedPages = state.pages.map((page) => ({
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
    pages: cleanedPages,
    completionRecords: normalizeCompletionRecords(state.completionRecords, cleanedPages),
  };
}

export async function loadCloudState(): Promise<AppState | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("ログインが必要です。");

  const { data, error } = await client
    .from("flashcard_states")
    .select("state")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.state ? sanitizeAppState(data.state as SavedAppState) : null;
}

export async function saveCloudState(state: AppState): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("ログインが必要です。");

  const { error } = await client.from("flashcard_states").upsert({
    user_id: userData.user.id,
    state: sanitizeAppState(state),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
