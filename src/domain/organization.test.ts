import { describe, expect, it } from "vitest";
import type { AppState, Card, Page } from "./types";
import {
  deleteFolder,
  moveCardBetweenPages,
  moveCardsBetweenPages,
  normalizeOrganizationState,
  setPageFolder,
} from "./organization";

const card = (id: string): Card => ({
  id,
  left: `left-${id}`,
  right: `right-${id}`,
  leftReveal: false,
  rightReveal: true,
  leftProgress: 2,
  rightProgress: 3,
});
const page = (id: string, cards: Card[] = [], folderId: string | null = null): Page => ({
  id,
  name: id,
  cards,
  folderId,
});
const state = (pages: Page[]): AppState => ({
  pages,
  folders: [{ id: "folder", name: "Folder" }],
  activePageId: "source",
  completionRecords: [{ date: "2026-10-26", pageId: "source" }],
});

describe("normalizeOrganizationState", () => {
  it("adds an empty folders list and null folder IDs to legacy state", () => {
    expect(normalizeOrganizationState({
      activePageId: "p",
      pages: [{ id: "p", name: "P", cards: [] }],
      completionRecords: [],
    })).toEqual({
      activePageId: "p",
      pages: [{ ...page("p"), name: "P" }],
      folders: [],
      completionRecords: [],
    });
  });

  it("clears page references to folders that do not exist", () => {
    const legacy = state([page("source", [], "missing")]);
    expect(normalizeOrganizationState(legacy).pages[0].folderId).toBeNull();
  });
});

describe("card organization", () => {
  it("moves a card while preserving its object and completion data", () => {
    const moving = card("a");
    const input = state([page("source", [moving]), page("target", [card("b")])]);
    const result = moveCardBetweenPages(input, "a", "source", "target");

    expect(result.pages[0].cards).toEqual([]);
    expect(result.pages[1].cards[1]).toBe(moving);
    expect(result.pages[1].cards.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result.completionRecords).toBe(input.completionRecords);
    expect(result.pages[1].cards[1]).toMatchObject({ leftProgress: 2, rightProgress: 3 });
  });

  it("moves known cards in the given order and ignores unknown IDs", () => {
    const input = state([page("source", [card("a"), card("b")]), page("target")]);
    const result = moveCardsBetweenPages(input, ["b", "unknown", "a"], "source", "target");
    expect(result.pages[0].cards).toEqual([]);
    expect(result.pages[1].cards.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("moves every source card object with a requested duplicate ID", () => {
    const first = card("duplicate");
    const second = { ...card("duplicate"), left: "second duplicate" };
    const untouched = card("other");
    const input = state([page("source", [first, second, untouched]), page("target")]);

    const result = moveCardsBetweenPages(input, ["duplicate"], "source", "target");

    expect(result.pages[0].cards).toEqual([untouched]);
    expect(result.pages[1].cards).toHaveLength(2);
    expect(result.pages[1].cards[0]).toBe(first);
    expect(result.pages[1].cards[1]).toBe(second);
  });

  it("rejects same-page moves", () => {
    const input = state([page("source", [card("a")])]);
    expect(() => moveCardBetweenPages(input, "a", "source", "source")).toThrow();
    expect(() => moveCardsBetweenPages(input, ["a"], "source", "source")).toThrow();
  });
});

describe("folder organization", () => {
  it("sets a page folder", () => {
    const input = state([page("source")]);
    expect(setPageFolder(input, "source", "folder").pages[0].folderId).toBe("folder");
  });

  it("deleting a folder unclassifies pages and retains their cards", () => {
    const input = state([page("source", [card("a")], "folder")]);
    const result = deleteFolder(input, "folder");
    expect(result.folders).toEqual([]);
    expect(result.pages).toEqual([page("source", input.pages[0].cards)]);
    expect(result.pages[0].cards[0]).toBe(input.pages[0].cards[0]);
  });
});
