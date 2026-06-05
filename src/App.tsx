import { useState, useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './store';
import { loadState, saveMdPath, loadMdPath } from './utils/storage';
import { generateMarkdown, downloadMarkdown, parseMarkdown } from './utils/markdown';
import StrategyGroup from './components/StrategyGroup';
import { StrategyDialog } from './components/EditDialogs';
import './App.css';

function AppInner() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStore();
  const [showAddStrategy, setShowAddStrategy] = useState(false);

  // ── Markdown save-file path ──────────────────────────────────────────────
  const [mdSavePath, setMdSavePath] = useState<string | null>(() => loadMdPath());
  const isFirstRender = useRef(true);

  // Load persisted state on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-write markdown to the chosen file on every state change
  useEffect(() => {
    // Skip the very first render (initial empty state before LOAD_STATE fires)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!mdSavePath || !window.electronAPI) return;
    const md = generateMarkdown(state);
    window.electronAPI.writeMarkdownFile(mdSavePath, md).catch(err => {
      console.warn('Failed to write markdown file', err);
    });
  }, [state, mdSavePath]);

  // ── Load workstream from a markdown file ─────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function applyParsedMarkdown(text: string) {
    const parsed = parseMarkdown(text);
    if (!parsed) {
      setLoadError('Could not parse the selected file. Make sure it is a Workstream Tracker export.');
      return;
    }
    setLoadError(null);
    dispatch({ type: 'LOAD_STATE', state: parsed });
  }

  async function handleLoadMarkdown() {
    if (window.electronAPI) {
      const content = await window.electronAPI.openMarkdownFile();
      if (content !== null) applyParsedMarkdown(content);
    } else {
      // Browser fallback: trigger a hidden file input
      fileInputRef.current?.click();
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      applyParsedMarkdown((ev.target?.result as string) ?? '');
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  // ── Open file picker and persist chosen path ─────────────────────────────
  async function handleChooseSaveFile() {
    if (window.electronAPI) {
      const chosen = await window.electronAPI.chooseMarkdownFile(
        mdSavePath ?? undefined,
      );
      if (chosen) {
        setMdSavePath(chosen);
        saveMdPath(chosen);
        // Write immediately so the file exists right away
        window.electronAPI.writeMarkdownFile(chosen, generateMarkdown(state)).catch(
          err => console.warn('Failed to write markdown file', err),
        );
      }
    } else {
      // Browser fallback: download on demand
      downloadMarkdown(state);
    }
  }

  const isEmpty = state.strategyOrder.length === 0;
  const saveFileName = mdSavePath ? mdSavePath.split(/[\\/]/).pop() : null;

  return (
    <div className="app">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="app-logo">⬡</span>
          <span className="app-title">Workstream Tracker</span>
        </div>

        <div className="topbar-actions">
          <button
            className="btn btn-ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            className="btn btn-ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            Redo ↪
          </button>
          <div className="topbar-divider" />
          <button
            className="btn btn-ghost"
            onClick={handleLoadMarkdown}
            title="Load a workstream from a Markdown file"
          >
            📂 Load from MD
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleChooseSaveFile}
            title={
              mdSavePath
                ? `Auto-saving to: ${mdSavePath}\nClick to change`
                : 'Choose a file to auto-save markdown on every change'
            }
          >
            📄 {saveFileName ?? 'Set Save File…'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddStrategy(true)}
          >
            + New Strategy
          </button>
        </div>
      </header>

      {/* ── Hidden file input for browser MD load fallback ─────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* ── Load error banner ───────────────────────────────────────────── */}
      {loadError && (
        <div className="load-error-banner" role="alert">
          <span>{loadError}</span>
          <button className="load-error-dismiss" onClick={() => setLoadError(null)}>✕</button>
        </div>
      )}

      {/* ── Keyboard shortcuts ──────────────────────────────────────────── */}
      <KeyboardShortcuts />

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <main className="board">
        {isEmpty ? (
          <EmptyState onAdd={() => setShowAddStrategy(true)} />
        ) : (
          state.strategyOrder.map(stratId => (
            <StrategyGroup key={stratId} strategyId={stratId} state={state} />
          ))
        )}
      </main>

      {/* ── Add strategy dialog ─────────────────────────────────────────── */}
      {showAddStrategy && (
        <StrategyDialog
          onSave={(name, color) => {
            dispatch({ type: 'ADD_STRATEGY', name, color });
            setShowAddStrategy(false);
          }}
          onClose={() => setShowAddStrategy(false)}
        />
      )}
    </div>
  );
}

function KeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'z') {
        if (canUndo) { e.preventDefault(); undo(); }
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        if (canRedo) { e.preventDefault(); redo(); }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, canUndo, canRedo]);

  return null;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⬡</div>
      <h2>No strategies yet</h2>
      <p>Create a strategy to start tracking your workstreams.</p>
      <button className="btn btn-primary btn-lg" onClick={onAdd}>
        + Create your first strategy
      </button>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}

