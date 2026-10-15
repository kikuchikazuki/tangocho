import type { AppState, Page, Side } from "./types";
import { parseCards } from "./parser";
// HTTPSでないスマホ環境でも動くよう、簡易IDを予備にします。
const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const createPage = (name: string): Page => ({
  id: id(),
  name: name.trim(),
  cards: [],
});
export const deleteCard = (page: Page, cardId: string): Page => ({
  ...page,
  cards: page.cards.filter((card) => card.id !== cardId),
});
export const deletePage = (state: AppState, pageId: string): AppState => {
  const pages = state.pages.filter((page) => page.id !== pageId);
  return { pages, activePageId: pages[0]?.id ?? "" };
};
export const appendCards = (page: Page, input: string) => {
  const parsed = parseCards(input);
  const cards = parsed.map((x) => ({
    id: id(),
    ...x,
    leftReveal: true,
    rightReveal: true,
    leftProgress: 0 as const,
    rightProgress: 0 as const,
  }));
  return {
    page: { ...page, cards: [...page.cards, ...cards] },
    added: cards.length,
    skipped: input.split(/\r?\n/).filter((x) => x.trim()).length - cards.length,
  };
};
export const setRevealForSide = (
  page: Page,
  side: Side,
  reveal: boolean,
): Page => ({
  ...page,
  cards: page.cards.map((c) => ({ ...c, [side + "Reveal"]: reveal })),
});
export const toggleCardReveal = (
  page: Page,
  cardId: string,
  side: Side,
): Page => ({
  ...page,
  cards: page.cards.map((c) => {
    if (c.id !== cardId) return c;
    return side === "left"
      ? { ...c, leftReveal: !c.leftReveal }
      : { ...c, rightReveal: !c.rightReveal };
  }),
});
export const updateProgress = (
  page: Page,
  cardId: string,
  side: Side,
  value: number,
): Page => ({
  ...page,
  cards: page.cards.map((c) =>
    c.id === cardId ? { ...c, [side + "Progress"]: value } : c,
  ),
});
export const clearProgress = (page: Page, side: Side | "both"): Page => ({
  ...page,
  cards: page.cards.map((c) => ({
    ...c,
    ...(side === "left" || side === "both" ? { leftProgress: 0 } : {}),
    ...(side === "right" || side === "both" ? { rightProgress: 0 } : {}),
  })),
});
