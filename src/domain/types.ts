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
export type Page = { id: string; name: string; cards: Card[] };
export type CompletionRecord = { date: string; pageId: string };
export type AppState = {
  pages: Page[];
  activePageId: string;
  completionRecords: CompletionRecord[];
};
