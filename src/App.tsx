import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { AppState, Progress, Side } from "./domain/types";
import {
  loadCloudState,
  sanitizeAppState,
  saveCloudState,
} from "./storage/cloudStorage";
import { supabase, supabaseConfigured } from "./lib/supabase";
import AuthScreen from "./components/AuthScreen";
import {
  appendCards,
  clearProgress,
  createPage,
  deleteCard,
  deletePage,
  setRevealForSide,
  toggleCardReveal,
  updateProgress,
} from "./domain/state";
import { findDuplicateGroups } from "./domain/duplicates";
import FlashcardTable from "./components/FlashcardTable";
import CalendarView from "./components/CalendarView";
import OrganizationView from "./components/OrganizationView";
import { deleteFolder, setPageFolder } from "./domain/organization";
import {
  isPageCompleted,
  localDateKey,
  toggleCompletionRecord,
} from "./domain/calendar";

const emptyState: AppState = {
  pages: [],
  folders: [],
  activePageId: "",
  completionRecords: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [serverReady, setServerReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"decks" | "calendar" | "organization">("decks");
  const [today, setToday] = useState(() => localDateKey(new Date()));
  const importInput = useRef<HTMLInputElement>(null);
  const localRevision = useRef(0);
  const savedRevision = useRef(0);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    const refreshToday = () => setToday(localDateKey(new Date()));
    const timer = window.setInterval(refreshToday, 60_000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, []);

  // 起動時にプロジェクト内JSONを読み込みます。
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ログイン後にクラウドの単語帳を読み込みます。
  useEffect(() => {
    if (!authReady || !authenticated) return;
    loadCloudState()
      .then((loaded) => {
        if (loaded?.pages.length) {
          setState(loaded);
          setServerReady(true);
          return;
        }
        const firstPage = createPage("自分の単語帳");
        setState({
          pages: [firstPage],
          folders: [],
          activePageId: firstPage.id,
          completionRecords: [],
        });
        setServerReady(true);
      })
      .catch(() => {
        const firstPage = createPage("自分の単語帳");
        setState({
          pages: [firstPage],
          folders: [],
          activePageId: firstPage.id,
          completionRecords: [],
        });
        setServerReady(true);
        setMessage("クラウドにデータがないため、空の単語帳を作成しました。");
      })
      .catch((error: unknown) => {
        setServerReady(false);
        setMessage(
          `クラウドの読み込みに失敗しました: ${error instanceof Error ? error.message : "原因不明のエラー"}`,
        );
      })
      .finally(() => setLoading(false));
  }, [authReady, authenticated]);

  // 画面の変更を順番に保存します。保存中の同期で新しい問題を戻さないためです。
  useEffect(() => {
    if (loading || !serverReady) return;
    const revision = localRevision.current;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveCloudState(state))
      .then(() => {
        if (localRevision.current === revision)
          savedRevision.current = revision;
      })
      .catch((error: unknown) =>
        setMessage(
          `データの保存に失敗しました: ${error instanceof Error ? error.message : "原因不明のエラー"}`,
        ),
      );
  }, [state, loading, serverReady]);

  // PCやスマホで変更された内容を、数秒ごとに確認します。
  useEffect(() => {
    if (!serverReady) return;
    const timer = window.setInterval(() => {
      // ローカル変更が保存されるまで、古いサーバー状態を適用しません。
      if (localRevision.current !== savedRevision.current) return;
      loadCloudState()
        .then((remote) => {
          if (!remote || localRevision.current !== savedRevision.current)
            return;
          // 問題データは同期しますが、選択中ページは端末ごとに維持します。
          setState((current) => ({
            ...remote,
            activePageId: remote.pages.some(
              (item) => item.id === current.activePageId,
            )
              ? current.activePageId
              : remote.activePageId,
          }));
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [serverReady]);

  const page = useMemo(
    () =>
      state.pages.find((item) => item.id === state.activePageId) ??
      state.pages[0],
    [state],
  );
  const groups = useMemo(
    () => (page ? findDuplicateGroups(page.cards) : []),
    [page],
  );

  if (!authReady)
    return (
      <div className="app">
        <p>認証を確認しています...</p>
      </div>
    );
  if (!supabaseConfigured || !authenticated) return <AuthScreen />;

  if (loading)
    return (
      <div className="app">
        <p>データを読み込んでいます...</p>
      </div>
    );
  if (!page)
    return (
      <div className="app">
        <h1>単語帳</h1>
        <p>暗記帳がありません。</p>
        <button className="add-page" onClick={addPage}>
          暗記帳を追加
        </button>
      </div>
    );

  const todayCompleted = isPageCompleted(
    state.completionRecords,
    today,
    page.id,
  );

  function updatePage(fn: (current: typeof page) => typeof page) {
    applyLocalState((current) => ({
      ...current,
      pages: current.pages.map((item) =>
        item.id === page.id ? fn(item) : item,
      ),
    }));
  }

  function applyLocalState(updater: (current: AppState) => AppState) {
    localRevision.current += 1;
    setState(updater);
  }

  function toggleCompletion(date: string, pageId: string) {
    applyLocalState((current) => ({
      ...current,
      completionRecords: toggleCompletionRecord(
        current.completionRecords,
        date,
        pageId,
      ),
    }));
  }

  function toggleTodayCompletion() {
    const currentDate = localDateKey(new Date());
    setToday(currentDate);
    toggleCompletion(currentDate, page.id);
  }

  function addPage() {
    const name = prompt("暗記帳の名前");
    if (!name?.trim()) return;
    const next = createPage(name);
    applyLocalState((current) => ({
      ...current,
      pages: [...current.pages, next],
      activePageId: next.id,
    }));
  }

  function addCards() {
    const result = appendCards(page, paste);
    updatePage(() => result.page);
    setPaste("");
    setMessage(`${result.added}件追加（スキップ ${result.skipped}件）`);
  }

  function toggleAll(side: Side) {
    const visible =
      side === "left"
        ? page.cards.every((item) => item.leftReveal)
        : page.cards.every((item) => item.rightReveal);
    updatePage((current) => setRevealForSide(current, side, !visible));
  }

  function clear(side: Side | "both") {
    updatePage((current) => clearProgress(current, side));
  }

  function removeCard(cardId: string) {
    if (confirm("この問題を削除しますか？")) {
      updatePage((current) => deleteCard(current, cardId));
    }
  }

  function removePage() {
    if (state.pages.length <= 1) {
      alert("最後の暗記帳は削除できません。");
      return;
    }
    if (confirm(`「${page.name}」と中の問題をすべて削除しますか？`)) {
      applyLocalState((current) => deletePage(current, page.id));
    }
  }

  // 全データをJSONファイルとして書き出します。
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "単語帳バックアップ.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // JSONバックアップを読み込みます。
  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(imported.pages) || !imported.activePageId)
          throw new Error();
        if (confirm("現在のデータを読み込んだデータで置き換えますか？")) {
          const sanitized = sanitizeAppState(imported);
          applyLocalState(() => sanitized);
          setMessage("読み込んだデータをクラウドに保存しています...");
          saveCloudState(sanitized)
            .then(() => {
              savedRevision.current = localRevision.current;
              setServerReady(true);
              setMessage("単語帳データをクラウドに保存しました。");
            })
            .catch((error: unknown) => {
              setMessage(
                `クラウド保存に失敗しました: ${error instanceof Error ? error.message : "原因不明のエラー"}`,
              );
            });
        }
      } catch {
        alert("単語帳のJSONファイルを読み込めませんでした。");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function deleteSelected() {
    if (!selected.length || !confirm(`${selected.length}件を削除しますか？`))
      return;
    updatePage((current) => ({
      ...current,
      cards: current.cards.filter((item) => !selected.includes(item.id)),
    }));
    setSelected([]);
    setShowDuplicates(false);
  }

  return (
    <div className="app">
      <header>
        <div>
          <p className="eyebrow">ONE QUESTION, ONE ANSWER</p>
          <h1>単語帳</h1>
          <div className="count">
            現在 <strong>{page.cards.length}</strong> 問
          </div>
        </div>
        <div className="header-actions">
          <button
            className={view === "calendar" ? "calendar-nav active" : "calendar-nav"}
            onClick={() => setView("calendar")}
          >
            カレンダー
          </button>
          <button
            className={view === "organization" ? "calendar-nav active" : "calendar-nav"}
            onClick={() => setView("organization")}
          >
            整理・管理
          </button>
          <button className="add-page" onClick={addPage}>
            ＋ 暗記帳を追加
          </button>
          <button className="delete-page" onClick={removePage}>
            この暗記帳を削除
          </button>
          <button onClick={() => void supabase?.auth.signOut()}>
            ログアウト
          </button>
        </div>
      </header>
      <nav className="tabs">
        {state.pages.map((item) => (
          <button
            className={view === "decks" && item.id === page.id ? "active" : ""}
            onClick={() => {
              setView("decks");
              applyLocalState((current) => ({
                ...current,
                activePageId: item.id,
              }));
            }}
            key={item.id}
          >
            {item.name}
          </button>
        ))}
      </nav>
      {view !== "organization" && <section className="toolbar">
        <button
          className={
            todayCompleted ? "complete-button completed" : "complete-button"
          }
          onClick={toggleTodayCompletion}
          aria-pressed={todayCompleted}
        >
          {todayCompleted ? "今日の学習を完了済み" : "今日の学習を完了"}
        </button>
        <button onClick={exportData}>データを書き出す</button>
        <button onClick={() => importInput.current?.click()}>
          データを読み込む
        </button>
        <input
          ref={importInput}
          type="file"
          accept="application/json"
          hidden
          onChange={importData}
        />
        <button onClick={() => toggleAll("left")}>左を全部隠す／表示</button>
        <button onClick={() => toggleAll("right")}>右を全部隠す／表示</button>
        <button
          onClick={() =>
            updatePage((current) =>
              setRevealForSide(
                setRevealForSide(current, "left", true),
                "right",
                true,
              ),
            )
          }
        >
          左右を表示
        </button>
        <button onClick={() => clear("left")}>左進捗クリア</button>
        <button onClick={() => clear("right")}>右進捗クリア</button>
        <button onClick={() => clear("both")}>全進捗クリア</button>
        <button onClick={() => setShowDuplicates((value) => !value)}>
          重複チェック {groups.length ? `(${groups.length})` : ""}
        </button>
      </section>}
      {message && (
        <div className="message" role="status">
          {message}
        </div>
      )}
      {view === "organization" ? (
        <OrganizationView
          state={state}
          onCreateFolder={(name) =>
            applyLocalState((current) => ({
              ...current,
              folders: [...current.folders, { id: crypto.randomUUID(), name }],
            }))
          }
          onRenameFolder={(folderId, name) =>
            applyLocalState((current) => ({
              ...current,
              folders: current.folders.map((folder) =>
                folder.id === folderId ? { ...folder, name } : folder,
              ),
            }))
          }
          onDeleteFolder={(folderId) =>
            applyLocalState((current) => deleteFolder(current, folderId))
          }
          onSetPageFolder={(pageId, folderId) =>
            applyLocalState((current) => setPageFolder(current, pageId, folderId))
          }
        />
      ) : view === "calendar" ? (
        <CalendarView
          pages={state.pages}
          completionRecords={state.completionRecords}
          today={today}
          onToggleCompletion={toggleCompletion}
        />
      ) : (
        <>
          {showDuplicates && (
            <section className="duplicates">
              <h2>重複・類似問題の確認</h2>
              {!groups.length && <p>候補はありません。</p>}
              {groups.map((group, index) => (
                <div
                  className="duplicate"
                  key={`${group.cards[0].id}-${group.cards[1].id}`}
                >
                  <b>
                    候補 {index + 1}（類似度 {Math.round(group.score * 100)}%）
                  </b>
                  {group.cards.map((card) => (
                    <label key={card.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(card.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, card.id]
                              : current.filter((id) => id !== card.id),
                          )
                        }
                      />
                      <span>
                        {card.left} = {card.right}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
              {groups.length > 0 && (
                <button
                  className="danger"
                  onClick={deleteSelected}
                  disabled={!selected.length}
                >
                  選択した問題を削除
                </button>
              )}
            </section>
          )}
          <section className="paste">
            <h2>問題をまとめて追加</h2>
            <p>「左の項目 = 右の説明」を1行ずつ貼り付けてください。</p>
            <textarea
              value={paste}
              onChange={(event) => setPaste(event.target.value)}
              placeholder="AWS Backup = バックアップ"
            />
            <button onClick={addCards} disabled={!paste.trim()}>
              この暗記帳に追加
            </button>
          </section>
          <div className="legend">
            <span>左の項目</span>
            <span>右の説明</span>
          </div>
          <FlashcardTable
            page={page}
            onReveal={(id, side) =>
              updatePage((current) => toggleCardReveal(current, id, side))
            }
            onProgress={(id, side, value) =>
              updatePage((current) =>
                updateProgress(current, id, side, value as Progress),
              )
            }
            onDelete={removeCard}
          />
        </>
      )}
    </div>
  );
}
