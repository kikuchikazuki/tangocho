export type Progress = 0 | 1 | 2 | 3;
export type Side = "left" | "right";
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
export type Page = { id: string; name: string; cards: Card[]; folderId: string | null };
export type CompletionRecord = { date: string; pageId: string };
export type AppState = {
  pages: Page[];
  folders: Folder[];
  activePageId: string;
  completionRecords: CompletionRecord[];
};
