import React, { useEffect, useReducer, useState } from "react";
import { getProjects, createProject } from "../utils/ProjectApi";
import { useAuth } from "../contexts/AuthContext";
import ProjectCard from "../components/ProjectCard";
import HeaderActions from "../components/HeaderActions";
import type { Project, ProjectRole, CreateProjectBody } from "../utils/types";
import "./css/dashboard.css";

// ─── Local state ──────────────────────────────────────────────────────────────

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projects: Project[] };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; projects: Project[] }
  | { type: "FETCH_ERROR"; message: string }
  | { type: "ADD_PROJECT"; project: Project };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { status: "loading" };
    case "FETCH_OK":
      return { status: "ok", projects: action.projects };
    case "FETCH_ERROR":
      return { status: "error", message: action.message };
    case "ADD_PROJECT":
      if (state.status !== "ok") return state;
      return { status: "ok", projects: [action.project, ...state.projects] };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  // Create-project modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateProjectBody>({ name: "", description: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function openModal() {
    setForm({ name: "", description: "" });
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (creating) return;
    setShowModal(false);
    setForm({ name: "", description: "" });
    setFormError(null);
  }

  // Toggle show archived
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    dispatch({ type: "FETCH_START" });
    getProjects()
      .then((projects) => dispatch({ type: "FETCH_OK", projects }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load projects";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, []);

  // ─── Create project ────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      const created = await createProject({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
      });
      dispatch({ type: "ADD_PROJECT", project: created });
      setShowModal(false);
      setForm({ name: "", description: "" });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  // ─── Derive the current user's role in each project ───────────────────────

  function myRole(project: Project): ProjectRole | null {
    if (!authState.user) return null;
    return (
      project.projectMembers.find((pm) => pm.userID === authState.user!.id)?.role ?? null
    );
  }

  // ─── Filtered project list ─────────────────────────────────────────────────

  const visibleProjects =
    state.status === "ok"
      ? state.projects.filter((p) => showArchived || !p.archived)
      : [];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#paint0_linear)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="paint0_linear" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#818cf8"/>
                  <stop offset="1" stopColor="#4f46e5"/>
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <path d="M3 14h7v7H3z"></path>
            </svg>
            Projects
          </h1>
          <p className="dashboard__subtitle">
            {state.status === "ok"
              ? `${visibleProjects.length} project${visibleProjects.length !== 1 ? "s" : ""}`
              : "Loading…"}
          </p>
        </div>

        <div className="dashboard__actions">
          <label className="dashboard__toggle" htmlFor="show-archived">
            <input
              id="show-archived"
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <div className="toggle-switch">
              <div className="toggle-slider"></div>
            </div>
            Show archived
          </label>

          {authState.user?.globalRole === 'ADMIN' && (
            <button
              id="btn-new-project"
              className="btn btn--primary"
              onClick={openModal}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Project
            </button>
          )}

          <HeaderActions />
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard__content">
        {state.status === "loading" && (
          <div className="dashboard__state">
            <span className="spinner" aria-label="Loading projects" />
            <p>Loading projects…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="dashboard__state dashboard__state--error">
            <p>⚠️ {state.message}</p>
            <button
              className="btn btn--secondary"
              onClick={() => {
                dispatch({ type: "FETCH_START" });
                getProjects()
                  .then((p) => dispatch({ type: "FETCH_OK", projects: p }))
                  .catch((err: unknown) =>
                    dispatch({
                      type: "FETCH_ERROR",
                      message: err instanceof Error ? err.message : "Error",
                    })
                  );
              }}
            >
              Retry
            </button>
          </div>
        )}

        {state.status === "ok" && visibleProjects.length === 0 && (
          <div className="dashboard__state">
            <p className="dashboard__empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </p>
            <p>No projects yet.</p>
            {authState.user?.globalRole === 'ADMIN' && (
              <button
                className="btn btn--primary"
                onClick={openModal}
              >
                Create your first project
              </button>
            )}
          </div>
        )}

        {state.status === "ok" && visibleProjects.length > 0 && (
          <div className="project-grid">
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserRole={myRole(project)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create project modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal">
            <header className="modal__header">
              <h2 id="modal-title" className="modal__title">New Project</h2>
              <button
                className="modal__close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </header>

            <form className="modal__form" onSubmit={handleCreate} noValidate>
              <div className="form-field">
                <label htmlFor="project-name" className="form-label">
                  Project name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="project-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Mobile App Redesign"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-desc" className="form-label">
                  Description
                </label>
                <textarea
                  id="project-desc"
                  className="form-input form-textarea"
                  placeholder="What is this project about? (optional)"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeModal}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-create-project"
                  className="btn btn--primary"
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default Dashboard;