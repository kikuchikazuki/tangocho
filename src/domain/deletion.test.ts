import { describe, expect, it } from "vitest";
import type { Page } from "./types";
import { deleteCard, deletePage } from "./state";

const page = (id: string, name: string): Page => ({ id, name, cards: [] });

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
      activePageId: "a",
    };
    expect(deletePage(state, "a")).toEqual({
      pages: [page("b", "B")],
      activePageId: "b",
    });
  });
});
