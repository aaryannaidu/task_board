import React, { useEffect, useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBoards } from "../utils/BoardApi";
import type { Board } from "../utils/types";
import "./css/board.css";

// ─── Local state ──────────────────────────────────────────────────────────────

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; board: Board };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; board: Board }
  | { type: "FETCH_ERROR"; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":  return { status: "loading" };
    case "FETCH_OK":     return { status: "ok", board: action.board };
    case "FETCH_ERROR":  return { status: "error", message: action.message };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const BoardPage: React.FC = () => {
  const { id, boardId } = useParams<{ id: string; boardId: string }>();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const projectIdNum = id ? parseInt(id, 10) : NaN;
  const boardIdNum = boardId ? parseInt(boardId, 10) : NaN;

  // ─── Fetch Board Details ───────────────────────────────────────────────────
  useEffect(() => {
    if (isNaN(projectIdNum) || isNaN(boardIdNum)) {
      dispatch({ type: "FETCH_ERROR", message: "Invalid project or board ID." });
      return;
    }

    dispatch({ type: "FETCH_START" });
    
    // The backend route getBoards returns all boards under a project.
    // We fetch them and find our specific board to show its columns.
    getBoards(projectIdNum)
      .then((boards) => {
        const targetBoard = boards.find((b) => b.id === boardIdNum);
        if (targetBoard) {
          dispatch({ type: "FETCH_OK", board: targetBoard });
        } else {
          dispatch({ type: "FETCH_ERROR", message: "Board not found." });
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load board details";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, [projectIdNum, boardIdNum]);

  return (
    <div className="board-page">
      {/* ── Loading ── */}
      {state.status === "loading" && (
        <div className="board-page__state">
          <span className="spinner" aria-label="Loading board" />
          <p>Loading board…</p>
        </div>
      )}

      {/* ── Error ── */}
      {state.status === "error" && (
        <div className="board-page__state board-page__state--error">
          <p>⚠️ {state.message}</p>
          <button
            className="btn btn--secondary mt-2"
            onClick={() => navigate(`/projects/${projectIdNum}`)}
          >
            ← Back to Project
          </button>
        </div>
      )}

      {/* ── Loaded ── */}
      {state.status === "ok" && (() => {
        const { board } = state;
        const columns = board.columns ?? [];

        return (
          <>
            <header className="board-page__header">
              <div className="board-page__breadcrumb">
                <button
                  className="breadcrumb__back hover-glow"
                  onClick={() => navigate(`/projects/${projectIdNum}`)}
                  aria-label="Back to project"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Project
                </button>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{board.name}</span>
              </div>

              <div className="board-page__title-row">
                <h1 className="board-page__title">{board.name}</h1>
                <div className="board-page__actions">
                    <button className="btn btn--primary btn--small">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add Column
                    </button>
                </div>
              </div>
            </header>

            <main className="board-page__content">
               <div className="board-canvas">
                 {columns.length === 0 ? (
                   <div className="board-empty-state">
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                       <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                       <line x1="9" y1="3" x2="9" y2="21"></line>
                     </svg>
                     <h3>No columns yet</h3>
                     <p>Create a column to start organizing tasks</p>
                     <button className="btn btn--secondary mt-2">Create Column</button>
                   </div>
                 ) : (
                   <div className="columns-container">
                     {columns.map(col => (
                       <div key={col.id} className="board-column">
                         <div className="column-header">
                           <h3 className="column-title">{col.name}</h3>
                           <span className="column-count">{col.wipLimit ? `Limit: ${col.wipLimit}` : ''}</span>
                           <button className="column-options" aria-label="Column options">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               <circle cx="12" cy="12" r="1"></circle>
                               <circle cx="12" cy="5" r="1"></circle>
                               <circle cx="12" cy="19" r="1"></circle>
                             </svg>
                           </button>
                         </div>
                         <div className="column-body">
                           <div className="empty-zone">Drag tasks here</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </main>
          </>
        );
      })()}
    </div>
  );
};

export default BoardPage;
