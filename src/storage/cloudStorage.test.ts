import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCloudState, sanitizeAppState, saveCloudState } from "./cloudStorage";

const cloudMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: { getUser: cloudMocks.getUser },
    from: () => ({
      select: cloudMocks.select,
      upsert: cloudMocks.upsert,
    }),
  },
}));

const page = { id: "aws", name: "AWS暗記帳", cards: [] };

beforeEach(() => {
  vi.clearAllMocks();
  cloudMocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  cloudMocks.select.mockReturnValue({
    eq: () => ({ maybeSingle: cloudMocks.maybeSingle }),
  });
  cloudMocks.maybeSingle.mockResolvedValue({
    data: { state: { pages: [page], activePageId: "aws" } },
    error: null,
  });
  cloudMocks.upsert.mockResolvedValue({ error: null });
});

describe("sanitizeAppState", () => {
  it("defaults missing completion records to an empty list", () => {
    expect(sanitizeAppState({ pages: [page], activePageId: "aws" })).toEqual({
      activePageId: "aws",
      folders: [],
      pages: [{ ...page, folderId: null }],
      completionRecords: [],
    });
  });

  it("normalizes missing and invalid folder references", () => {
    const folder = { id: "f1", name: "Study" };
    expect(sanitizeAppState({
      folders: [folder],
      pages: [
        page,
        { ...page, id: "valid", folderId: "f1" },
        { ...page, id: "invalid", folderId: "missing" },
      ],
      activePageId: "aws",
    })).toEqual({
      activePageId: "aws",
      folders: [folder],
      pages: [
        { ...page, folderId: null },
        { ...page, id: "valid", folderId: "f1" },
        { ...page, id: "invalid", folderId: null },
      ],
      completionRecords: [],
    });
  });

  it("keeps only unique valid records for known pages", () => {
    const valid = { date: "2026-10-22", pageId: "aws" };

    expect(sanitizeAppState({
      pages: [page],
      activePageId: "aws",
      completionRecords: [
        valid,
        valid,
        { date: "2026-02-29", pageId: "aws" },
        { date: "2026-10-22", pageId: "missing" },
      ],
    })).toEqual({
      activePageId: "aws",
      folders: [],
      pages: [{ ...page, folderId: null }],
      completionRecords: [valid],
    });
  });

  it("normalizes legacy organization state when loading from cloud", async () => {
    await expect(loadCloudState()).resolves.toEqual({
      activePageId: "aws",
      folders: [],
      pages: [{ ...page, folderId: null }],
      completionRecords: [],
    });
  });

  it("normalizes legacy organization state before cloud upsert", async () => {
    const legacyState = {
      activePageId: "aws",
      pages: [page],
    } as unknown as Parameters<typeof saveCloudState>[0];

    await saveCloudState(legacyState);

    expect(cloudMocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      state: {
        activePageId: "aws",
        folders: [],
        pages: [{ ...page, folderId: null }],
        completionRecords: [],
      },
    }));
  });
});
