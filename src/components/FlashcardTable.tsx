import { useState } from "react";
import type { Page, Side, Progress, Card } from "../domain/types";
import ProgressCycle from "./ProgressCycle";

type MoveProps = {
  page: Page;
  pages: Page[];
  selected: string[];
  onSelectCard: (id: string, checked: boolean) => void;
  onMoveCard: (id: string, targetPageId: string) => void;
  onMoveSelected: (ids: string[], targetPageId: string) => void;
};

function MoveTarget({ pages, sourcePageId, label, value, onChange }: {
  pages: Page[];
  sourcePageId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">移動先を選択</option>
    {pages.filter((item) => item.id !== sourcePageId).map((item) => (
      <option key={item.id} value={item.id}>{item.name}</option>
    ))}
  </select>;
}

function CardMove({ card, page, pages, selected, moveLabel, onSelectCard, onMoveCard }: {
  card: Card;
  page: Page;
  pages: Page[];
  selected: boolean;
  moveLabel: string;
  onSelectCard: MoveProps["onSelectCard"];
  onMoveCard: MoveProps["onMoveCard"];
}) {
  const [target, setTarget] = useState("");
  const targetPage = pages.find((item) => item.id === target && item.id !== page.id);
  const validTarget = targetPage?.id ?? "";
  return <div className="card-move">
    <label>
      <input type="checkbox" aria-label={`${card.left}を選択`} checked={selected}
        onChange={(event) => onSelectCard(card.id, event.target.checked)} />
      選択
    </label>
    <MoveTarget pages={pages} sourcePageId={page.id} label={`${card.left}の移動先`}
      value={validTarget} onChange={setTarget} />
    <button type="button" aria-label={moveLabel} disabled={!validTarget} onClick={() => {
      if (targetPage && confirm(`「${card.left}」を「${targetPage.name}」へ移動しますか？`)) {
        onMoveCard(card.id, targetPage.id);
      }
    }}>移動</button>
  </div>;
}

function BulkMove({ page, pages, selected, onMoveSelected }: Pick<MoveProps, "page" | "pages" | "selected" | "onMoveSelected">) {
  const [bulkTarget, setBulkTarget] = useState("");
  const targetPage = pages.find((item) => item.id === bulkTarget && item.id !== page.id);
  const selectedOnPage = page.cards.filter((card) => selected.includes(card.id)).map((card) => card.id);
  return <div className="bulk-move">
    <span>{selectedOnPage.length}件選択中</span>
    <MoveTarget pages={pages} sourcePageId={page.id} label="選択した問題の移動先"
      value={targetPage?.id ?? ""} onChange={setBulkTarget} />
    <button type="button" disabled={!selectedOnPage.length || !targetPage} onClick={() => {
      if (targetPage && confirm(`${selectedOnPage.length}件の問題を「${targetPage.name}」へ移動しますか？`)) {
        onMoveSelected(selectedOnPage, targetPage.id);
      }
    }}>選択した問題を移動</button>
  </div>;
}

function cardMoveLabel(card: Card): string {
  const prompt = card.left.trim().slice(0, 32) || "無題の問題";
  return `問題「${prompt}」を移動（カードID: ${card.id}）`;
}

export default function FlashcardTable({
  page,
  pages,
  selected,
  onSelectCard,
  onMoveCard,
  onMoveSelected,
  onReveal,
  onProgress,
  onDelete,
}: MoveProps & {
  onReveal: (id: string, s: Side) => void;
  onProgress: (id: string, s: Side, v: Progress) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <main className="cards">
      <BulkMove key={page.id} page={page} pages={pages} selected={selected} onMoveSelected={onMoveSelected} />
      {page.cards.map((c) => (
        <div className="row" key={c.id}>
          {(["left", "right"] as Side[]).map((s) => {
            const text = s === "left" ? c.left : c.right;
            const shown = s === "left" ? c.leftReveal : c.rightReveal;
            const prog = s === "left" ? c.leftProgress : c.rightProgress;
            return (
              <div className="cell" data-side={s} key={s}>
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
          <CardMove card={c} page={page} pages={pages} selected={selected.includes(c.id)}
            moveLabel={cardMoveLabel(c)}
            onSelectCard={onSelectCard} onMoveCard={onMoveCard} />
        </div>
      ))}
    </main>
  );
}
