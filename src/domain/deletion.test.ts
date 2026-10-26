import { describe, expect, it } from "vitest";
import type { Page } from "./types";
import { deleteCard, deletePage } from "./state";

const page = (id: string, name: string): Page => ({ id, name, cards: [], folderId: null });

describe("deletion operations", () => {
  it("deletes one card without changing other cards", () => {
    const source = {
      ...page("p", "Page"),
      cards: [
        {
          id: "a",
          left: "A",
          right: "1",
          leftReveal: true,
          rightReveal: true,
          leftProgress: 0 as const,
          rightProgress: 0 as const,
        },
        {
          id: "b",
          left: "B",
          right: "2",
          leftReveal: true,
          rightReveal: true,
          leftProgress: 0 as const,
          rightProgress: 0 as const,
        },
      ],
    };
    expect(deleteCard(source, "a").cards.map((card) => card.id)).toEqual(["b"]);
  });

  it("deletes a page and selects another page", () => {
    const state = {
      pages: [page("a", "A"), page("b", "B")],
      folders: [],
      activePageId: "a",
      completionRecords: [],
    };
    expect(deletePage(state, "a")).toEqual({
      pages: [page("b", "B")],
      folders: [],
      activePageId: "b",
      completionRecords: [],
    });
  });

  it("removes completion records for a deleted page", () => {
    const state = {
      pages: [page("a", "A"), page("b", "B")],
      folders: [],
      activePageId: "a",
      completionRecords: [
        { date: "2026-10-22", pageId: "a" },
        { date: "2026-10-23", pageId: "b" },
      ],
    };

    expect(deletePage(state, "a")).toEqual({
      pages: [page("b", "B")],
      folders: [],
      activePageId: "b",
      completionRecords: [{ date: "2026-10-23", pageId: "b" }],
    });
  });
});
