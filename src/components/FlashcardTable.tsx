import type { Page, Side, Progress } from "../domain/types";
import ProgressCycle from "./ProgressCycle";
export default function FlashcardTable({
  page,
  onReveal,
  onProgress,
  onDelete,
}: {
  page: Page;
  onReveal: (id: string, s: Side) => void;
  onProgress: (id: string, s: Side, v: Progress) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <main className="cards">
      {page.cards.map((c) => (
        <div className="row" key={c.id}>
          {(["left", "right"] as Side[]).map((s) => {
            const text = s === "left" ? c.left : c.right;
            const shown = s === "left" ? c.leftReveal : c.rightReveal;
            const prog = s === "left" ? c.leftProgress : c.rightProgress;
            return (
              <div className="cell" key={s}>
                <button
                  className={shown ? "answer" : "answer hidden"}
                  onClick={() => onReveal(c.id, s)}
                >
                  {shown ? text : "タップして表示"}
                </button>
                <ProgressCycle
                  value={prog}
                  onChange={(v) => onProgress(c.id, s, v)}
                />
                <button
                  className="delete-card"
                  onClick={() => onDelete(c.id)}
                  aria-label="この問題を削除"
                >
                  削除
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </main>
  );
}
