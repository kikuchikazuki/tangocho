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
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "問題「問題a」の移動先（カードID: a）" }), { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "問題「問題a」を移動（カードID: a）" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("先"));
    expect(state().pages[0].cards.map((item) => item.id)).toEqual(["b"]);
    expect(state().pages[1].cards[0]).toMatchObject({ id: "a", leftProgress: 2, rightProgress: 3 });
    expect(state().completionRecords).toEqual(initial.completionRecords);
    expect(state().activePageId).toBe("source");
  });

  it("moves selected cards together and clears selection only on success", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "問題「問題a」を選択（カードID: a）" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "問題「問題b」を選択（カードID: b）" }));
    fireEvent.change(screen.getByRole("combobox", { name: "選択した問題の移動先" }), { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("先"));
    expect(state().pages[0].cards).toHaveLength(2);
    expect(screen.getByTestId("selected").textContent).toBe("a,b");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(state().pages[1].cards.map((item) => item.id)).toEqual(["a", "b"]);
    expect(screen.getByTestId("selected").textContent).toBe("");
  });

  it("excludes the source page from individual and bulk targets", () => {
    render(<Harness />);
    for (const name of ["問題「問題a」の移動先（カードID: a）", "選択した問題の移動先"]) {
      const options = within(screen.getByRole("combobox", { name })).getAllByRole("option");
      expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual(["", "target"]);
    }
  });

  it("does not move or clear an individually selected card when confirmation is canceled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "問題「問題a」を選択（カードID: a）" }));
    fireEvent.change(screen.getByRole("combobox", { name: "問題「問題a」の移動先（カードID: a）" }), { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "問題「問題a」を移動（カードID: a）" }));
    expect(state().pages[0].cards).toHaveLength(2);
    expect(screen.getByTestId("selected").textContent).toBe("a");
  });

  it("requires a fresh bulk target after switching source decks, including when returning", () => {
    const pages: AppState["pages"] = [
      initial.pages[0],
      { ...initial.pages[1], cards: [card("c")] },
      { id: "third", name: "第三", folderId: null, cards: [] },
    ];
    const callbacks = {
      onSelectCard: () => undefined,
      onMoveCard: () => undefined,
      onMoveSelected: () => undefined,
      onReveal: () => undefined,
      onProgress: () => undefined,
      onDelete: () => undefined,
    };
    const { rerender } = render(<FlashcardTable page={pages[0]} pages={pages} selected={["a"]} {...callbacks} />);
    const bulkTarget = () => screen.getByRole("combobox", { name: "選択した問題の移動先" }) as HTMLSelectElement;
    const bulkButton = () => screen.getByRole("button", { name: "選択した問題を移動" }) as HTMLButtonElement;
    fireEvent.change(bulkTarget(), { target: { value: "third" } });
    expect(bulkButton().disabled).toBe(false);

    rerender(<FlashcardTable page={pages[1]} pages={pages} selected={["c"]} {...callbacks} />);
    expect(bulkTarget().value).toBe("");
    expect(bulkButton().disabled).toBe(true);

    rerender(<FlashcardTable page={pages[0]} pages={pages} selected={["a"]} {...callbacks} />);
    expect(bulkTarget().value).toBe("");
    expect(bulkButton().disabled).toBe(true);
  });

  it("gives each card a distinct move button name, including duplicate prompts", () => {
    const duplicatePage = { ...initial.pages[0], cards: [card("a"), { ...card("b"), left: "問題a" }] };
    render(<FlashcardTable page={duplicatePage} pages={[duplicatePage, initial.pages[1]]}
      selected={[]} onSelectCard={() => undefined} onMoveCard={() => undefined}
      onMoveSelected={() => undefined} onReveal={() => undefined}
      onProgress={() => undefined} onDelete={() => undefined} />);
    const names = Array.from(document.querySelectorAll(".card-move button"), (button) => button.getAttribute("aria-label"));
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(names).toEqual([
      "問題「問題a」を移動（カードID: a）",
      "問題「問題a」を移動（カードID: b）",
    ]);
    const checkboxNames = Array.from(document.querySelectorAll(".card-move input"), (input) => input.getAttribute("aria-label"));
    const selectNames = Array.from(document.querySelectorAll(".card-move select"), (select) => select.getAttribute("aria-label"));
    expect(checkboxNames).toEqual([
      "問題「問題a」を選択（カードID: a）",
      "問題「問題a」を選択（カードID: b）",
    ]);
    expect(selectNames).toEqual([
      "問題「問題a」の移動先（カードID: a）",
      "問題「問題a」の移動先（カードID: b）",
    ]);
    expect(new Set(checkboxNames).size).toBe(2);
    expect(new Set(selectNames).size).toBe(2);
  });

  it("keeps move names unique when a prompt contains another card's ID suffix", () => {
    const collisionPage = { ...initial.pages[0], cards: [
      { ...card("a"), left: "問題" },
      { ...card("b"), left: "問題" },
      { ...card("c"), left: "問題（a）" },
    ] };
    render(<FlashcardTable page={collisionPage} pages={[collisionPage, initial.pages[1]]}
      selected={[]} onSelectCard={() => undefined} onMoveCard={() => undefined}
      onMoveSelected={() => undefined} onReveal={() => undefined}
      onProgress={() => undefined} onDelete={() => undefined} />);
    const names = Array.from(document.querySelectorAll(".card-move button"), (button) => button.getAttribute("aria-label"));
    expect(names).toEqual([
      "問題「問題」を移動（カードID: a）",
      "問題「問題」を移動（カードID: b）",
      "問題「問題（a）」を移動（カードID: c）",
    ]);
    expect(new Set(names).size).toBe(3);
  });
});

describe("App move integration", () => {
  it("keeps the source deck active while moving a card into another deck", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<App />);
    const target = await screen.findByRole("combobox", { name: "問題「問題a」の移動先（カードID: a）" });
    fireEvent.change(target, { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "問題「問題a」を移動（カードID: a）" }));
    expect(screen.getByRole("button", { name: "元" }).className).toBe("active");
    expect(screen.queryByRole("combobox", { name: "問題「問題a」の移動先（カードID: a）" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "先" }));
    expect(screen.getByRole("combobox", { name: "問題「問題a」の移動先（カードID: a）" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "進捗2週目" })).toBeTruthy();
  });

  it("moves selected cards through App and clears selection after confirmation", async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<App />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "問題「問題a」を選択（カードID: a）" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "問題「問題b」を選択（カードID: b）" }));
    fireEvent.change(screen.getByRole("combobox", { name: "選択した問題の移動先" }), { target: { value: "target" } });
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(screen.getByText("2件選択中")).toBeTruthy();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "選択した問題を移動" }));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("先"));
    expect(screen.getByText("0件選択中")).toBeTruthy();
    expect(screen.getByRole("button", { name: "元" }).className).toBe("active");
    fireEvent.click(screen.getByRole("button", { name: "先" }));
    expect(screen.getByRole("checkbox", { name: "問題「問題a」を選択（カードID: a）" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "問題「問題b」を選択（カードID: b）" })).toBeTruthy();
  });
});
