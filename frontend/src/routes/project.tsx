import React, { useEffect, useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectDetails } from "../utils/ProjectApi";
import { useAuth } from "../contexts/AuthContext";
import BoardCard from "../components/BoardCard";
import type { Project, ProjectRole } from "../utils/types";
import "./css/project.css";

// ─── Local state ──────────────────────────────────────────────────────────────

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; project: Project };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; project: Project }
  | { type: "FETCH_ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":  return { status: "loading" };
    case "FETCH_OK":     return { status: "ok", project: action.project };
    case "FETCH_ERROR":  return { status: "error", message: action.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: ProjectRole): string {
  switch (role) {
    case "ADMIN":  return "Admin";
    case "MEMBER": return "Member";
    case "VIEWER": return "Viewer";
  }
}

function roleBadgeClass(role: ProjectRole): string {
  switch (role) {
    case "ADMIN":  return "badge--role-admin";
    case "MEMBER": return "badge--role-member";
    case "VIEWER": return "badge--role-viewer";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();

  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  const projectId = id ? parseInt(id, 10) : NaN;

  // ─── Fetch project details ─────────────────────────────────────────────────

  useEffect(() => {
    if (isNaN(projectId)) {
      dispatch({ type: "FETCH_ERROR", message: "Invalid project ID." });
      return;
    }
    dispatch({ type: "FETCH_START" });
    getProjectDetails(projectId)
      .then((project) => dispatch({ type: "FETCH_OK", project }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load project";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, [projectId]);

  // ─── Derive current user's role in this project ───────────────────────────

  function myRole(project: Project): ProjectRole | null {
    if (!authState.user) return null;
    return project.projectMembers.find((pm) => pm.userID === authState.user!.id)?.role ?? null;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="project-page">

      {/* ── Loading ── */}
      {state.status === "loading" && (
        <div className="project-page__state">
          <span className="spinner" aria-label="Loading project" />
          <p>Loading project…</p>
        </div>
      )}

      {/* ── Error ── */}
      {state.status === "error" && (
        <div className="project-page__state project-page__state--error">
          <p>⚠️ {state.message}</p>
          <button
            className="btn btn--secondary"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      )}

      {/* ── Loaded ── */}
      {state.status === "ok" && (() => {
        const { project } = state;
        const currentRole = myRole(project);
        const boards = project.boards ?? [];
        const members = project.projectMembers ?? [];

        return (
          <>
            {/* Header */}
            <header className="project-page__header">
              <div className="project-page__breadcrumb">
                <button
                  className="breadcrumb__back"
                  onClick={() => navigate("/dashboard")}
                  aria-label="Back to dashboard"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Projects
                </button>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{project.name}</span>
              </div>

              <div className="project-page__title-row">
                <div>
                  <h1 className="project-page__title">
                    {project.name}
                    {project.archived && <span className="badge badge--archived ml-2">Archived</span>}
                  </h1>
                  {project.description && (
                    <p className="project-page__desc">{project.description}</p>
                  )}
                  <div className="project-page__meta">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Created {formatDate(project.createdAt)}
                    </span>
                    <span>·</span>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    {currentRole && (
                      <>
                        <span>·</span>
                        <span className={`badge ${roleBadgeClass(currentRole)}`}>
                          {roleLabel(currentRole)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <main className="project-page__content">

              {/* ── Boards section ── */}
              <section className="project-section">
                <div className="project-section__header">
                  <h2 className="project-section__title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" rx="1.5" />
                      <rect x="14" y="3" width="7" height="5" rx="1.5" />
                      <rect x="14" y="12" width="7" height="9" rx="1.5" />
                      <rect x="3" y="16" width="7" height="5" rx="1.5" />
                    </svg>
                    Boards
                    <span className="section-count">{boards.length}</span>
                  </h2>
                </div>

                {boards.length === 0 ? (
                  <div className="project-section__empty">
                    <p>No boards yet. Create one to start tracking work.</p>
                  </div>
                ) : (
                  <div className="board-grid">
                    {boards.map((board) => (
                      <BoardCard key={board.id} board={board} projectId={project.id} />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Members section ── */}
              <section className="project-section">
                <div className="project-section__header">
                  <h2 className="project-section__title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Members
                    <span className="section-count">{members.length}</span>
                  </h2>
                </div>

                <div className="members-list">
                  {members.map((pm) => {
                    const initials = pm.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const hue = (pm.userID * 53) % 360;

                    return (
                      <div key={pm.userID} className="member-row">
                        <div
                          className="member-row__avatar"
                          style={{ background: `hsl(${hue}, 60%, 48%)` }}
                          title={pm.user.name}
                        >
                          {initials}
                        </div>
                        <div className="member-row__info">
                          <span className="member-row__name">{pm.user.name}</span>
                          <span className="member-row__email">{pm.user.email}</span>
                        </div>
                        <span className={`badge ${roleBadgeClass(pm.role)}`}>
                          {roleLabel(pm.role)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

            </main>
          </>
        );
      })()}
    </div>
  );
};

export default ProjectPage;
