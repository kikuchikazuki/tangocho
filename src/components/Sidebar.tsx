import { useState } from "react";
import type { Folder, Page } from "../domain/types";

type SidebarProps = {
  pages: Page[];
  folders: Folder[];
  activePageId: string;
  view: "decks" | "calendar" | "organization";
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectView: (view: "decks" | "calendar" | "organization") => void;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  onSignOut: () => void;
  canDeletePage: boolean;
};

export default function Sidebar({
  pages,
  folders,
  activePageId,
  view,
  collapsed,
  onToggleCollapsed,
  onSelectView,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onSignOut,
  canDeletePage,
}: SidebarProps) {
  // フォルダは最初から開き、利用者が必要なグループだけ閉じられます。
  const [closedFolders, setClosedFolders] = useState<string[]>([]);
  const toggleFolder = (folderId: string) =>
    setClosedFolders((current) =>
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId],
    );

  const renderPage = (page: Page) => (
    <button
      className={view === "decks" && page.id === activePageId ? "sidebar-page active" : "sidebar-page"}
      onClick={() => onSelectPage(page.id)}
      key={page.id}
      title={collapsed ? page.name : undefined}
    >
      <span className="sidebar-page-icon" aria-hidden="true">•</span>
      {!collapsed && <span className="sidebar-label">{page.name}</span>}
    </button>
  );

  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="メインナビゲーション">
      <div className="sidebar-heading">
        {!collapsed && <strong>単語帳</strong>}
        <button className="sidebar-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}>
          {collapsed ? "☰" : "‹"}
        </button>
      </div>
      <nav className="sidebar-nav">
        <button className={view === "calendar" ? "sidebar-link active" : "sidebar-link"} onClick={() => onSelectView("calendar")}>
          <span className="sidebar-icon" aria-hidden="true">▦</span>{!collapsed && "カレンダー"}
        </button>
        <button className={view === "organization" ? "sidebar-link active" : "sidebar-link"} onClick={() => onSelectView("organization")}>
          <span className="sidebar-icon" aria-hidden="true">⚙</span>{!collapsed && "整理・管理"}
        </button>
      </nav>
      <div className="sidebar-actions">
        <button className="sidebar-action add" onClick={onAddPage} title="暗記帳を追加">
          <span className="sidebar-icon" aria-hidden="true">＋</span>{!collapsed && "暗記帳を追加"}
        </button>
        {canDeletePage && (
          <button className="sidebar-action danger" onClick={onDeletePage} title="この暗記帳を削除">
            <span className="sidebar-icon" aria-hidden="true">−</span>{!collapsed && "この暗記帳を削除"}
          </button>
        )}
        <button className="sidebar-action" onClick={onSignOut} title="ログアウト">
          <span className="sidebar-icon" aria-hidden="true">↪</span>{!collapsed && "ログアウト"}
        </button>
      </div>
      <div className="sidebar-groups">
        {folders.map((folder) => {
          const folderPages = pages.filter((page) => page.folderId === folder.id);
          const closed = closedFolders.includes(folder.id);
          return (
            <section className="sidebar-group" key={folder.id}>
              <button className={closed ? "sidebar-folder closed" : "sidebar-folder open"} onClick={() => toggleFolder(folder.id)} title={folder.name} aria-expanded={!closed}>
                <span className="sidebar-folder-chevron" aria-hidden="true">{closed ? "›" : "⌄"}</span>
                <span className="sidebar-folder-icon" aria-hidden="true">{closed ? "▰" : "▾"}</span>
                {!collapsed && <><span className="sidebar-folder-name">{folder.name}</span><small>{folderPages.length}</small></>}
              </button>
              {!closed && !collapsed && folderPages.map(renderPage)}
            </section>
          );
        })}
        <section className="sidebar-group">
          <button className={closedFolders.includes("__uncategorized__") ? "sidebar-folder closed" : "sidebar-folder open"} onClick={() => toggleFolder("__uncategorized__")} aria-expanded={!closedFolders.includes("__uncategorized__")}>
            <span className="sidebar-folder-chevron" aria-hidden="true">{closedFolders.includes("__uncategorized__") ? "›" : "⌄"}</span>
            <span className="sidebar-folder-icon" aria-hidden="true">{closedFolders.includes("__uncategorized__") ? "▰" : "▾"}</span>
            {!collapsed && <><span className="sidebar-folder-name">未分類</span><small>{pages.filter((page) => !page.folderId).length}</small></>}
          </button>
          {!closedFolders.includes("__uncategorized__") && !collapsed && pages.filter((page) => !page.folderId).map(renderPage)}
        </section>
      </div>
    </aside>
  );
}
