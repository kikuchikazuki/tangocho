/** @vitest-environment jsdom */
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppState, Card } from "../domain/types";
import { moveCardBetweenPages, moveCardsBetweenPages } from "../domain/organization";
import FlashcardTable from "./FlashcardTable";
import App from "../App";

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: { auth: {
    getSession: async () => ({ data: { session: { user: { id: "test" } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    signOut: async () => undefined,
  } },
}));
vi.mock("../storage/cloudStorage", () => ({
  loadCloudState: async () => initial,
  saveCloudState: async () => undefined,
}));

const card = (id: string): Card => ({
  id, left: `問題${id}`, right: `答え${id}`,
  leftReveal: true, rightReveal: true, leftProgress: 2, rightProgress: 3,
});
const initial: AppState = {
  folders: [], activePageId: "source",
  pages: [
    { id: "source", name: "元", folderId: null, cards: [card("a"), card("b")] },
    { id: "target", name: "先", folderId: null, cards: [] },
  ],
  completionRecords: [{ date: "2026-10-27", pageId: "source" }],
};

function Harness() {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const page = state.pages[0];
  return <>
    <FlashcardTable
      page={page}
      pages={state.pages}
      selected={selected}
      onSelectCard={(id, checked) => setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id))}
      onReveal={() => undefined}
      onProgress={() => undefined}
      onDelete={() => undefined}
      onMoveCard={(id, targetId) => {
        setState((current) => moveCardBetweenPages(current, id, page.id, targetId));
        setSelected((current) => current.filter((item) => item !== id));
      }}
      onMoveSelected={(ids, targetId) => {
        setState((current) => moveCardsBetweenPages(current, ids, page.id, targetId));
        setSelected([]);
      }}
    />
    <output data-testid="state">{JSON.stringify(state)}</output>
    <output data-testid="selected">{selected.join(",")}</output>
  </>;
}

const state = () => JSON.parse(screen.getByTestId("state").textContent ?? "") as AppState;

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("FlashcardTable moves", () => {
  it("moves one card after confirmation and keeps its progress and completion record", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "問題aの移動先" }), { target: { value: "target" } });
    fireEvent.click(screen.getAllByRole("button", { name: "移動" })[0]);
    expect(state().pages[0].cards.map((item) => item.id)).toEqual(["b"]);
    expect(state().pages[1].cards[0]).toMatchObject({ id: "a", leftProgress: 2, rightProgress: 3 });
    expect(state().completionRecords).toEqual(initial.completionRecords);
    expect(state().activePageId).toBe("source");
  });

  it("moves selected cards together and clears selection only on success", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "問題aを選択" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "問題bを選択" }));
    fireEvent.change(screen.getByRole("combobox", { name: "選択した問題の移動先" }), { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(state().pages[0].cards).toHaveLength(2);
    expect(screen.getByTestId("selected").textContent).toBe("a,b");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(state().pages[1].cards.map((item) => item.id)).toEqual(["a", "b"]);
    expect(screen.getByTestId("selected").textContent).toBe("");
  });

  it("excludes the source page from individual and bulk targets", () => {
    render(<Harness />);
    for (const name of ["問題aの移動先", "選択した問題の移動先"]) {
      const options = within(screen.getByRole("combobox", { name })).getAllByRole("option");
      expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual(["", "target"]);
    }
  });

  it("does not move or clear an individually selected card when confirmation is canceled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "問題aを選択" }));
    fireEvent.change(screen.getByRole("combobox", { name: "問題aの移動先" }), { target: { value: "target" } });
    fireEvent.click(screen.getAllByRole("button", { name: "移動" })[0]);
    expect(state().pages[0].cards).toHaveLength(2);
    expect(screen.getByTestId("selected").textContent).toBe("a");
  });
});

describe("App move integration", () => {
  it("keeps the source deck active while moving a card into another deck", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<App />);
    const target = await screen.findByRole("combobox", { name: "問題aの移動先" });
    fireEvent.change(target, { target: { value: "target" } });
    fireEvent.click(screen.getAllByRole("button", { name: "移動" })[0]);
    expect(screen.getByRole("button", { name: "元" }).className).toBe("active");
    expect(screen.queryByRole("combobox", { name: "問題aの移動先" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "先" }));
    expect(screen.getByRole("combobox", { name: "問題aの移動先" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "進捗2週目" })).toBeTruthy();
  });
});
