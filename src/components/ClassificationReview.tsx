import { useMemo, useState } from "react";
import type { AppState } from "../domain/types";

type Suggestion = { key: string; cardId: string; sourcePageId: string; targetPageId: string };

type Props = {
  state: AppState;
  onApply: (items: Array<{ cardId: string; sourcePageId: string; targetPageId: string }>) => void;
};

export default function ClassificationReview({ state, onApply }: Props) {
  const initial = useMemo(() => state.pages.flatMap((page) => page.cards.map((card, index) => ({
    key: `${page.id}:${card.id}:${index}`,
    cardId: card.id,
    sourcePageId: page.id,
    targetPageId: "",
  }))), [state.pages]);
  const [items, setItems] = useState<Suggestion[]>(initial);
  const pages = state.pages;
  const ready = items.filter((item) => item.targetPageId && item.targetPageId !== item.sourcePageId);

  return (
    <section className="classification-review" aria-label="分類候補の確認">
      <h3>分類候補の確認</h3>
      <p>移動したい問題の候補先を選び、確認してから反映してください。</p>
      {!items.length && <p>整理する問題はありません。</p>}
      {items.map((item) => {
        const source = pages.find((page) => page.id === item.sourcePageId);
        const card = source?.cards.find((candidate) => candidate.id === item.cardId);
        if (!source || !card) return null;
        return (
          <div className="classification-row" key={item.key}>
            <span>{card.left}</span>
            <small>{source.name}</small>
            <select
              aria-label={`${card.left}の分類候補（カードID: ${card.id}）`}
              value={item.targetPageId}
              onChange={(event) => setItems((current) => current.map((candidate) =>
                candidate.key === item.key ? { ...candidate, targetPageId: event.target.value } : candidate))}
            >
              <option value="">候補先を選択</option>
              {pages.filter((page) => page.id !== item.sourcePageId).map((page) => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
          </div>
        );
      })}
      <button
        type="button"
        disabled={!ready.length}
        onClick={() => {
          if (confirm(`${ready.length}件の分類候補を反映しますか？`)) {
            onApply(ready.map(({ cardId, sourcePageId, targetPageId }) => ({ cardId, sourcePageId, targetPageId })));
            setItems((current) => current.filter((item) => !ready.some((candidate) => candidate.key === item.key)));
          }
        }}
      >
        選択した候補を反映
      </button>
    </section>
  );
}
