import { useEffect, useState, type FormEvent } from "react";
import type { AppState, Folder, Page } from "../domain/types";
import ClassificationReview from "./ClassificationReview";

type Props = {
  state: AppState;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSetPageFolder: (pageId: string, folderId: string | null) => void;
  onApplyClassification?: (items: Array<{ cardId: string; sourcePageId: string; targetPageId: string }>) => void;
};

function PageList({ pages, folders, onSetPageFolder }: {
  pages: Page[];
  folders: Folder[];
  onSetPageFolder: Props["onSetPageFolder"];
}) {
  return (
    <ul className="organization-pages">
      {pages.map((page) => (
        <li key={page.id}>
          <span>{page.name}</span>
          <label>
            <span className="sr-only">{page.name}のフォルダ</span>
            <select
              aria-label={`${page.name}のフォルダ`}
              value={page.folderId ?? ""}
              onChange={(event) => onSetPageFolder(page.id, event.target.value || null)}
            >
              <option value="">未分類</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>
        </li>
      ))}
    </ul>
  );
}

function FolderSection({ folder, state, onRenameFolder, onDeleteFolder, onSetPageFolder }: {
  folder: Folder;
  state: AppState;
  onRenameFolder: Props["onRenameFolder"];
  onDeleteFolder: Props["onDeleteFolder"];
  onSetPageFolder: Props["onSetPageFolder"];
}) {
  const [name, setName] = useState(folder.name);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) setName(folder.name);
  }, [folder.name, isDirty]);

  function rename(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) onRenameFolder(folder.id, trimmed);
    setIsDirty(false);
  }

  return (
    <section className="organization-section" aria-label={folder.name}>
      <div className="organization-section-header">
        <h3>{folder.name}</h3>
        <form onSubmit={rename}>
          <label>
            <span className="sr-only">{folder.name}のフォルダ名</span>
            <input aria-label={`${folder.name}のフォルダ名`} value={name} onChange={(event) => {
              setName(event.target.value);
              setIsDirty(true);
            }} />
          </label>
          <button type="submit" aria-label={`${folder.name}を名前変更`}>名前変更</button>
        </form>
        <button
          type="button"
          className="organization-delete"
          aria-label={`${folder.name}を削除`}
          onClick={() => {
            if (confirm(`「${folder.name}」を削除しますか？所属する暗記帳は未分類になります。`)) {
              onDeleteFolder(folder.id);
            }
          }}
        >
          削除
        </button>
      </div>
      <PageList pages={state.pages.filter((page) => page.folderId === folder.id)} folders={state.folders} onSetPageFolder={onSetPageFolder} />
    </section>
  );
}

export default function OrganizationView({ state, onCreateFolder, onRenameFolder, onDeleteFolder, onSetPageFolder, onApplyClassification = () => undefined }: Props) {
  const [newName, setNewName] = useState("");

  function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setNewName("");
  }

  return (
    <main className="organization" aria-label="整理・管理">
      <h2>フォルダと暗記帳の整理</h2>
      <form className="organization-create" onSubmit={create}>
        <label htmlFor="new-folder-name">新しいフォルダ名</label>
        <input id="new-folder-name" value={newName} onChange={(event) => setNewName(event.target.value)} />
        <button type="submit">フォルダを作成</button>
      </form>
      {state.folders.map((folder) => (
        <FolderSection
          key={folder.id}
          folder={folder}
          state={state}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onSetPageFolder={onSetPageFolder}
        />
      ))}
      <section className="organization-section" aria-label="未分類">
        <h3>未分類</h3>
        <PageList pages={state.pages.filter((page) => page.folderId === null)} folders={state.folders} onSetPageFolder={onSetPageFolder} />
      </section>
      <ClassificationReview state={state} onApply={onApplyClassification} />
    </main>
  );
}
