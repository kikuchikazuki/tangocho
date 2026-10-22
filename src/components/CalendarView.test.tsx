/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CalendarView from "./CalendarView";

const pages = [
  { id: "aws", name: "AWS暗記帳", cards: [] },
  { id: "english", name: "英単語", cards: [] },
];

afterEach(cleanup);

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

    const completedDay = screen.getByRole("button", { name: "2026-10-22" });
    expect(completedDay.className).toContain("has-completion");

    fireEvent.click(completedDay);
    fireEvent.click(screen.getByRole("button", { name: "英単語" }));
    expect(toggles).toEqual([["2026-10-22", "english"]]);
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
});
