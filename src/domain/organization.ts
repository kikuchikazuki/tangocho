import { normalizeCompletionRecords } from "./calendar";
import type { AppState, Folder, Page } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Adds organization defaults to persisted or imported legacy state. */
export function normalizeOrganizationState(state: unknown): AppState {
  if (!isRecord(state)) throw new Error("Invalid app state");
  const folders: Folder[] = Array.isArray(state.folders)
    ? state.folders.filter(
        (folder): folder is Folder =>
          isRecord(folder) && typeof folder.id === "string" && typeof folder.name === "string",
      )
    : [];
  const folderIds = new Set(folders.map((folder) => folder.id));
  if (!Array.isArray(state.pages)) throw new Error("Invalid app state pages");
  const pages: Page[] = state.pages.map((page) => {
    if (!isRecord(page) || typeof page.id !== "string" || typeof page.name !== "string" || !Array.isArray(page.cards)) {
      throw new Error("Invalid app state page");
    }
    const folderId = typeof page.folderId === "string" && folderIds.has(page.folderId)
      ? page.folderId
      : null;
    return { ...page, folderId } as Page;
  });
  return {
    ...state,
    pages,
    folders,
    activePageId: typeof state.activePageId === "string" ? state.activePageId : "",
    completionRecords: normalizeCompletionRecords(state.completionRecords, pages),
  } as AppState;
}

export function moveCardBetweenPages(
  state: AppState,
  cardId: string,
  sourcePageId: string,
  targetPageId: string,
): AppState {
  return moveCardsBetweenPages(state, [cardId], sourcePageId, targetPageId);
}

export function moveCardsBetweenPages(
  state: AppState,
  cardIds: string[],
  sourcePageId: string,
  targetPageId: string,
): AppState {
  if (sourcePageId === targetPageId) throw new Error("Source and target pages must differ");
  const source = state.pages.find((page) => page.id === sourcePageId);
  const target = state.pages.find((page) => page.id === targetPageId);
  if (!source || !target) return state;

  const requested = new Set(cardIds);
  const sourceCards = new Map(source.cards.map((card) => [card.id, card]));
  const moving = cardIds.flatMap((cardId, index) => {
    const card = sourceCards.get(cardId);
    return card && cardIds.indexOf(cardId) === index ? [card] : [];
  });
  if (moving.length === 0) return state;
  return {
    ...state,
    pages: state.pages.map((page) =>
      page.id === sourcePageId
        ? { ...page, cards: page.cards.filter((card) => !requested.has(card.id)) }
        : page.id === targetPageId
          ? { ...page, cards: [...page.cards, ...moving] }
          : page,
    ),
  };
}

export function setPageFolder(state: AppState, pageId: string, folderId: string | null): AppState {
  if (folderId !== null && !state.folders.some((folder) => folder.id === folderId)) {
    throw new Error(`Unknown folder: ${folderId}`);
  }
  return {
    ...state,
    pages: state.pages.map((page) => page.id === pageId ? { ...page, folderId } : page),
  };
}

export function deleteFolder(state: AppState, folderId: string): AppState {
  return {
    ...state,
    folders: state.folders.filter((folder) => folder.id !== folderId),
    pages: state.pages.map((page) =>
      page.folderId === folderId ? { ...page, folderId: null } : page,
    ),
  };
}
