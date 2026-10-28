export type Progress = 0 | 1 | 2 | 3;
export type Side = "left" | "right";

// 1問分のデータです。進捗や表示状態もカード自身が持つため、
// 暗記帳を移動してもこのオブジェクトをそのまま移せば状態を維持できます。
export type Card = {
  id: string;
  left: string;
  right: string;
  leftReveal: boolean;
  rightReveal: boolean;
  leftProgress: Progress;
  rightProgress: Progress;
};
export type Folder = { id: string; name: string };

// Pageは画面上の「暗記帳」に相当します。
// folderIdがnullの場合は、まだどのフォルダにも分類されていない状態です。
export type Page = { id: string; name: string; cards: Card[]; folderId: string | null };

// カレンダーの完了記録は「その日に、この暗記帳を学習した」という関係だけを保存します。
export type CompletionRecord = { date: string; pageId: string };

// アプリ全体で保存・同期する唯一のルート状態です。
export type AppState = {
  pages: Page[];
  folders: Folder[];
  activePageId: string;
  completionRecords: CompletionRecord[];
};
