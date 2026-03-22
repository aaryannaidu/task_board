import React, { useEffect, useReducer, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getProjectDetails, 
  updateProject, 
  archiveProject, 
  addMember, 
  changeMemberRole, 
  removeMember 
} from "../utils/ProjectApi";
import { createBoard, createColumn } from "../utils/BoardApi";
import { useAuth } from "../contexts/AuthContext";
import BoardCard from "../components/BoardCard";
import HeaderActions from "../components/HeaderActions";
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

function reducer(_state: State, action: Action): State {
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
  const [editMember, setEditMember] = useState<{ id: number, name: string, role: ProjectRole } | null>(null);

  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const projectId = id ? parseInt(id, 10) : NaN;

  // ─── Modals State ─────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  const [settingsForm, setSettingsForm] = useState({ name: "", description: "" });
  const [addMemberForm, setAddMemberForm] = useState({ email: "", role: "MEMBER" as ProjectRole });
  const [createBoardForm, setCreateBoardForm] = useState({
    name: "",
    columns: ["To Do", "In Progress", "In Review", "Done"]
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync settings form when project loaded
  useEffect(() => {
    if (state.status === "ok") {
      setSettingsForm({ 
        name: state.project.name, 
        description: state.project.description || "" 
      });
    }
  }, [state.status, state.status === "ok" ? state.project.name : null]);

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

  // ─── Admin Actions ──────────────────────────────────────────────────────────

  async function handleUpdateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsForm.name.trim()) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const updated = await updateProject(projectId, { 
        name: settingsForm.name, 
        description: settingsForm.description 
      });
      // Merge boards & members back natively since update API returns bare project
      if (state.status === "ok") {
        updated.boards = state.project.boards;
        updated.projectMembers = state.project.projectMembers;
      }
      dispatch({ type: "FETCH_OK", project: updated });
      setShowSettings(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleToggleArchive() {
    setIsProcessing(true);
    setActionError(null);
    try {
      const { project: updated } = await archiveProject(projectId);
      if (state.status === "ok") {
        updated.boards = state.project.boards;
        updated.projectMembers = state.project.projectMembers;
      }
      dispatch({ type: "FETCH_OK", project: updated });
      setShowSettings(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to archive project");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addMemberForm.email.trim()) {
      setActionError("Email address is required");
      return;
    }
    
    setIsProcessing(true);
    setActionError(null);
    try {
      await addMember(projectId, { email: addMemberForm.email.trim(), role: addMemberForm.role });
      const updatedParams = await getProjectDetails(projectId);
      dispatch({ type: "FETCH_OK", project: updatedParams });
      setShowAddMember(false);
      setAddMemberForm({ email: "", role: "MEMBER" });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRoleChange(userId: number, newRole: ProjectRole) {
    setIsProcessing(true);
    setActionError(null);
    try {
      await changeMemberRole(projectId, userId, { role: newRole });
      const updated = await getProjectDetails(projectId);
      dispatch({ type: "FETCH_OK", project: updated });
      setEditMember(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await removeMember(projectId, userId);
      const updated = await getProjectDetails(projectId);
      dispatch({ type: "FETCH_OK", project: updated });
      setEditMember(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!createBoardForm.name.trim()) {
      setActionError("Board name is required");
      return;
    }
    if (createBoardForm.columns.some(c => !c.trim())) {
      setActionError("All column names must be filled");
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    try {
      const newBoard = await createBoard(projectId, { name: createBoardForm.name.trim() });
      
      for (let i = 0; i < createBoardForm.columns.length; i++) {
        await createColumn(projectId, newBoard.id, { 
          name: createBoardForm.columns[i].trim(),
          order: i + 1 
        });
      }
      
      const updated = await getProjectDetails(projectId);
      dispatch({ type: "FETCH_OK", project: updated });
      
      setShowCreateBoard(false);
      setCreateBoardForm({ name: "", columns: ["To Do", "In Progress", "In Review", "Done"] });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsProcessing(false);
    }
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
        const isAdmin = currentRole === "ADMIN" || authState.user?.globalRole === "ADMIN";
        const boards = project.boards ?? [];
        const members = project.projectMembers ?? [];

        return (
          <>
            {/* Header */}
            <header className="project-page__header">
              <div className="project-page__breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
                <HeaderActions />
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

                {isAdmin && (
                  <button 
                    className="btn btn--secondary btn--small"
                    onClick={() => {
                        setSettingsForm({ name: project.name, description: project.description || "" });
                        setActionError(null);
                        setShowSettings(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                  </button>
                )}
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
                  {isAdmin && (
                    <button 
                      className="btn btn--secondary btn--small" 
                      onClick={() => {
                          setActionError(null);
                          setShowCreateBoard(true);
                      }}
                    >
                        + Create Board
                    </button>
                  )}
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
                  {isAdmin && (
                    <button 
                      className="btn btn--secondary btn--small" 
                      onClick={() => {
                          setActionError(null);
                          setShowAddMember(true);
                      }}
                    >
                        + Add Member
                    </button>
                  )}
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

                        {currentRole === "ADMIN" && pm.userID !== authState.user?.id && (
                           <button 
                             className="btn btn--secondary btn--small ml-2"
                             onClick={() => {
                               setActionError(null);
                               setEditMember({ id: pm.userID, name: pm.user.name, role: pm.role });
                             }}
                           >
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                               <path d="M12 20h9"></path>
                               <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                             </svg>
                             Edit
                           </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

            </main>

            {/* ── Settings Modal ── */}
            {showSettings && (
              <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
                <div className="modal">
                  <h2 className="modal__title">Project Settings</h2>
                  <button className="modal__close" onClick={() => setShowSettings(false)}>✕</button>

                  <form className="form" onSubmit={handleUpdateProject}>
                    {actionError && <div className="form__error">{actionError}</div>}

                    <div className="form__group">
                      <label htmlFor="edit-name">Project Name</label>
                      <input
                        id="edit-name"
                        type="text"
                        className="input"
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="form__group">
                      <label htmlFor="edit-desc">Description (Optional)</label>
                      <textarea
                        id="edit-desc"
                        className="input"
                        value={settingsForm.description}
                        onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                        disabled={isProcessing}
                        rows={3}
                      />
                    </div>

                    <div className="modal__actions">
                      <button type="button" className="btn btn--secondary" onClick={() => setShowSettings(false)} disabled={isProcessing}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn--primary" disabled={isProcessing}>
                        Save Changes
                      </button>
                    </div>
                  </form>

                  <hr className="modal-divider" />
                  
                  <div className="modal-danger-zone">
                    <h3 className="danger-title">Danger Zone</h3>
                    <p className="danger-desc">Archiving a project hides it from the main dashboard but retains all its data. It can be unarchived later.</p>
                    <button 
                      className="btn action-btn-danger" 
                      onClick={handleToggleArchive} 
                      disabled={isProcessing}
                    >
                      {project.archived ? "Unarchive Project" : "Archive Project"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Add Member Modal ── */}
            {showAddMember && (
              <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAddMember(false)}>
                <div className="modal">
                  <h2 className="modal__title">Add Member</h2>
                  <button className="modal__close" onClick={() => setShowAddMember(false)}>✕</button>

                  <form className="form" onSubmit={handleAddMember}>
                    {actionError && <div className="form__error">{actionError}</div>}

                    <p className="form-info">Enter the email address of the person you want to invite.</p>

                    <div className="form__group">
                      <label htmlFor="add-user-email">Email Address</label>
                      <input
                        id="add-user-email"
                        type="email"
                        className="input"
                        placeholder="user@example.com"
                        value={addMemberForm.email}
                        onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="form__group">
                      <label htmlFor="add-role">Role</label>
                      <select
                        id="add-role"
                        className="input"
                        value={addMemberForm.role}
                        onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value as ProjectRole })}
                        disabled={isProcessing}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </div>

                    <div className="modal__actions">
                      <button type="button" className="btn btn--secondary" onClick={() => setShowAddMember(false)} disabled={isProcessing}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn--primary" disabled={isProcessing}>
                        Add User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Create Board Modal ── */}
            {showCreateBoard && (
              <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreateBoard(false)}>
                <div className="modal">
                  <h2 className="modal__title">Create Board</h2>
                  <button className="modal__close" onClick={() => setShowCreateBoard(false)}>✕</button>

                  <form className="form" onSubmit={handleCreateBoard}>
                    {actionError && <div className="form__error">{actionError}</div>}
                    
                    <div className="form__group">
                      <label htmlFor="board-name">Board Name</label>
                      <input
                        id="board-name"
                        type="text"
                        className="input"
                        placeholder="e.g. Sprint Tracking"
                        value={createBoardForm.name}
                        onChange={(e) => setCreateBoardForm({ ...createBoardForm, name: e.target.value })}
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="form__group">
                      <label>How do you track work?</label>
                      <p className="form-info" style={{marginTop: '0.25rem'}}>As you complete work, it moves through these statuses.</p>
                      
                      <div className="column-inputs" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
                        {createBoardForm.columns.map((col, idx) => (
                          <div key={idx} style={{display: 'flex', gap: '0.5rem'}}>
                            <input
                              type="text"
                              className="input"
                              value={col}
                              onChange={(e) => {
                                const newCols = [...createBoardForm.columns];
                                newCols[idx] = e.target.value;
                                setCreateBoardForm({ ...createBoardForm, columns: newCols });
                              }}
                              required
                              disabled={isProcessing}
                            />
                            <button 
                              type="button" 
                              className="btn btn--secondary btn--icon"
                              style={{padding: '0 0.75rem'}}
                              onClick={() => {
                                 const newCols = createBoardForm.columns.filter((_, i) => i !== idx);
                                 setCreateBoardForm({ ...createBoardForm, columns: newCols });
                              }}
                              disabled={isProcessing || createBoardForm.columns.length <= 1}
                              aria-label="Remove status"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        
                        <button 
                          type="button" 
                          className="btn btn--secondary" 
                          style={{alignSelf: 'flex-start', marginTop: '0.5rem', border: 'none', background: 'transparent', paddingLeft: 0, fontWeight: 600}}
                          onClick={() => setCreateBoardForm(prev => ({ ...prev, columns: [...prev.columns, "New Status"] }))}
                          disabled={isProcessing}
                        >
                          + Add status
                        </button>
                      </div>
                    </div>

                    <div className="modal__actions">
                      <button type="button" className="btn btn--secondary" onClick={() => setShowCreateBoard(false)} disabled={isProcessing}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn--primary" disabled={isProcessing}>
                        Finish
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </>
        );
      })()}

      {/* ── Edit Member Modal ── */}
      {editMember && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditMember(null)}>
          <div className="modal">
            <h2 className="modal__title">Edit Member</h2>
            <button className="modal__close" onClick={() => setEditMember(null)}>✕</button>

            <div className="form">
              {actionError && <div className="form__error">{actionError}</div>}
              
              <p className="form-info">Update role for <strong>{editMember.name}</strong></p>

              <div className="form__group">
                <label>Role</label>
                <select
                  className="input"
                  value={editMember.role}
                  onChange={(e) => setEditMember({ ...editMember, role: e.target.value as ProjectRole })}
                  disabled={isProcessing}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="modal__actions">
                <button 
                  type="button" 
                  className="btn btn--secondary" 
                  onClick={() => setEditMember(null)} 
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn--primary" 
                  onClick={() => handleRoleChange(editMember.id, editMember.role)} 
                  disabled={isProcessing}
                >
                  Save Role
                </button>
              </div>
            </div>

            <hr className="modal-divider" />
            
            <div className="modal-danger-zone">
              <h3 className="danger-title">Remove Member</h3>
              <p className="danger-desc">This will immediately revoke their access to the project. They will not be able to view or edit tasks.</p>
              <button 
                className="btn action-btn-danger" 
                onClick={() => handleRemoveMember(editMember.id)}
                disabled={isProcessing}
              >
                Remove from Project
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectPage;
