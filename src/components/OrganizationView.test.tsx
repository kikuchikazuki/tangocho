/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { AppState } from "../domain/types";
import { deleteFolder, setPageFolder } from "../domain/organization";
import OrganizationView from "./OrganizationView";

const initialState: AppState = {
  folders: [{ id: "study", name: "学習" }],
  pages: [
    { id: "aws", name: "AWS暗記帳", folderId: "study", cards: [] },
    { id: "english", name: "英単語", folderId: null, cards: [] },
  ],
  activePageId: "aws",
  completionRecords: [],
};

function Harness() {
  const [state, setState] = useState(initialState);
  return (
    <OrganizationView
      state={state}
      onCreateFolder={(name) =>
        setState((current) => ({
          ...current,
          folders: [...current.folders, { id: "new", name }],
        }))
      }
      onRenameFolder={(folderId, name) =>
        setState((current) => ({
          ...current,
          folders: current.folders.map((folder) =>
            folder.id === folderId ? { ...folder, name } : folder,
          ),
        }))
      }
      onDeleteFolder={(folderId) => setState((current) => deleteFolder(current, folderId))}
      onSetPageFolder={(pageId, folderId) =>
        setState((current) => setPageFolder(current, pageId, folderId))
      }
    />
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrganizationView", () => {
  it("renders pages in their folder and a clear uncategorized section", () => {
    render(<Harness />);
    const study = screen.getByRole("region", { name: "学習" });
    const uncategorized = screen.getByRole("region", { name: "未分類" });
    expect(within(study).getByText("AWS暗記帳")).toBeTruthy();
    expect(within(uncategorized).getByText("英単語")).toBeTruthy();
  });

  it("creates and renames a folder through labeled forms", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("textbox", { name: "新しいフォルダ名" }), {
      target: { value: "  資格  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "フォルダを作成" }));
    expect(screen.getByRole("region", { name: "資格" })).toBeTruthy();

    const study = screen.getByRole("region", { name: "学習" });
    fireEvent.change(within(study).getByRole("textbox", { name: "学習のフォルダ名" }), {
      target: { value: "復習" },
    });
    fireEvent.click(within(study).getByRole("button", { name: "学習を名前変更" }));
    expect(screen.getByRole("region", { name: "復習" })).toBeTruthy();
  });

  it("moves a page to a folder and back to uncategorized", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "英単語のフォルダ" }), {
      target: { value: "study" },
    });
    expect(within(screen.getByRole("region", { name: "学習" })).getByText("英単語")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "英単語のフォルダ" }), {
      target: { value: "" },
    });
    expect(within(screen.getByRole("region", { name: "未分類" })).getByText("英単語")).toBeTruthy();
  });

  it("keeps a folder until deletion is confirmed, then shows its pages as uncategorized", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "学習を削除" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("region", { name: "学習" })).toBeTruthy();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "学習を削除" }));
    expect(screen.queryByRole("region", { name: "学習" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "未分類" })).getByText("AWS暗記帳")).toBeTruthy();
  });
});
