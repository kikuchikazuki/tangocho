/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import CalendarView from "./CalendarView";

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "test" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: async () => undefined,
    },
  },
}));

vi.mock("../storage/cloudStorage", () => ({
  loadCloudState: async () => ({
    pages: [{ id: "aws", name: "AWS暗記帳", cards: [] }],
    activePageId: "aws",
    completionRecords: [{ date: "2026-10-22", pageId: "aws" }],
  }),
  saveCloudState: async () => undefined,
}));

const pages = [
  { id: "aws", name: "AWS暗記帳", cards: [] },
  { id: "english", name: "英単語", cards: [] },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CalendarView", () => {
  it("colors completed dates and toggles a selected book", () => {
    const toggles: Array<[string, string]> = [];
    render(
      <CalendarView
        pages={pages}
        completionRecords={[{ date: "2026-10-22", pageId: "aws" }]}
        today="2026-10-22"
        onToggleCompletion={(date, pageId) => toggles.push([date, pageId])}
      />,
    );

    const completedDay = screen.getByRole("button", { name: "2026-10-22 学習完了" });
    expect(completedDay.className).toContain("has-completion");
    expect(completedDay.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "2026-10-23" }).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(completedDay);
    fireEvent.click(screen.getByRole("button", { name: "英単語" }));
    expect(toggles).toEqual([["2026-10-22", "english"]]);
  });

  it("announces completion on adjacent-month dates without selecting them", () => {
    render(
      <CalendarView
        pages={pages}
        completionRecords={[{ date: "2026-09-27", pageId: "aws" }]}
        today="2026-10-22"
        onToggleCompletion={() => undefined}
      />,
    );

    const completedDay = screen.getByRole("button", { name: "2026-09-27 学習完了" });
    expect(completedDay.className).toContain("outside-month");
    expect(completedDay.className).toContain("has-completion");
    expect(completedDay.getAttribute("aria-pressed")).toBe("false");
  });

  it("moves between months", () => {
    render(
      <CalendarView
        pages={pages}
        completionRecords={[]}
        today="2026-10-22"
        onToggleCompletion={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次の月" }));
    expect(screen.getByRole("heading", { name: "2026年11月" })).toBeTruthy();
  });

  it("renders a six-week grid and updates the month when an outside date is selected", () => {
    render(
      <CalendarView
        pages={pages}
        completionRecords={[]}
        today="2026-10-22"
        onToggleCompletion={() => undefined}
      />,
    );

    const calendar = screen.getByRole("region", { name: "カレンダー" });
    expect(within(calendar).getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ })).toHaveLength(42);
    expect(screen.getByRole("button", { name: "AWS暗記帳" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "2026-09-27" }).className).toContain("outside-month");

    fireEvent.click(screen.getByRole("button", { name: "2026-09-27" }));
    expect(screen.getByRole("heading", { name: "2026年9月" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "2026年9月27日" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2026-09-27" }).className).toContain("selected");
  });

  it("navigates across the year boundary", () => {
    render(
      <CalendarView
        pages={pages}
        completionRecords={[]}
        today="2026-12-15"
        onToggleCompletion={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次の月" }));
    expect(screen.getByRole("heading", { name: "2027年1月" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "前の月" }));
    expect(screen.getByRole("heading", { name: "2026年12月" })).toBeTruthy();
  });

  it("toggles the click-time date when the page stays open across midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22, 23, 59));
    render(<App />);

    const shortcut = await screen.findByRole("button", { name: "今日の学習を完了済み" });
    vi.setSystemTime(new Date(2026, 9, 23, 0, 1));
    fireEvent.click(shortcut);

    fireEvent.click(screen.getByRole("button", { name: "カレンダー" }));
    expect(screen.getByRole("button", { name: "2026-10-23 学習完了" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2026-10-22 学習完了" })).toBeTruthy();
  });

  it.each(["focus", "visibilitychange"] as const)(
    "refreshes today when %s occurs on a new day",
    async (eventName) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 22, 23, 59));
      render(<App />);

      const shortcut = await screen.findByRole("button", { name: "今日の学習を完了済み" });
      vi.setSystemTime(new Date(2026, 9, 23, 0, 1));
      if (eventName === "focus") fireEvent.focus(window);
      else fireEvent(document, new Event("visibilitychange"));

      expect(shortcut.textContent).toBe("今日の学習を完了");
      expect(shortcut.getAttribute("aria-pressed")).toBe("false");
    },
  );

  it("places the completion shortcut before secondary toolbar actions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22));
    render(<App />);
    const shortcut = await screen.findByRole("button", { name: "今日の学習を完了済み" });
    const exportButton = screen.getByRole("button", { name: "データを書き出す" });
    expect(shortcut.compareDocumentPosition(exportButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
