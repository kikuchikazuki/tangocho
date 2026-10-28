/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClassificationReview from "./ClassificationReview";
import type { AppState } from "../domain/types";

const state: AppState = {
  folders: [],
  pages: [
    { id: "aws", name: "AWS暗記帳", folderId: null, cards: [{ id: "c1", left: "ガバナンス", right: "管理", leftReveal: false, rightReveal: false, leftProgress: 0, rightProgress: 0 }] },
    { id: "business", name: "ビジネス用語", folderId: null, cards: [] },
  ],
  activePageId: "aws",
  completionRecords: [],
};

afterEach(() => vi.restoreAllMocks());

describe("ClassificationReview", () => {
  it("applies confirmed target choices", () => {
    const onApply = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ClassificationReview state={state} onApply={onApply} />);

    fireEvent.change(screen.getByRole("combobox", { name: /ガバナンス/ }), { target: { value: "business" } });
    fireEvent.click(screen.getByRole("button", { name: "選択した候補を反映" }));

    expect(onApply).toHaveBeenCalledWith([{ cardId: "c1", sourcePageId: "aws", targetPageId: "business" }]);
  });
});
