import type { AppState } from "../domain/types";

// PCからでもスマホからでも、表示中のPCへ保存しに行きます。
const apiUrl = "/api/state";

// プロジェクト内のJSONファイルから単語帳を読み込みます。
export async function loadState(): Promise<AppState> {
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("データを読み込めませんでした");
  const state = (await response.json()) as AppState;
  // 以前のブラウザ保存が残っていれば、空のJSONへ一度だけ移します。
  if (state.pages.length === 0) {
    const oldData = localStorage.getItem("anki-recall-state");
    if (oldData) {
      try {
        const recovered = JSON.parse(oldData) as AppState;
        if (recovered.pages?.length) return recovered;
      } catch {
        // 壊れた古いデータは無視します。
      }
    }
  }
  return state;
}

// 変更内容をプロジェクト内のJSONファイルへ保存します。
export async function saveState(state: AppState): Promise<void> {
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error("文字化けしたデータは保存できません");
}
