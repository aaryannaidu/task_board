import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskById, deleteTask, updateTask, moveTask } from "../utils/TaskApi";
import { getComments, createComment, updateComment, deleteComment } from "../utils/CommentApi";
import { getProjectMembers } from "../utils/ProjectApi";
import { getBoards } from "../utils/BoardApi";
import Avatar from "../components/Avatar";
import type { Task, Comment, ProjectMember, Priority, Column } from "../utils/types";
import "./css/task.css";

export default function TaskPage() {
    const { id: projectIdStr, taskId: taskIdStr } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Columns state (for moving task) ──────────────────────────────────────
    const [availableColumns, setAvailableColumns] = useState<Column[]>([]);

    // ── Edit mode ────────────────────────────────────────────────────────────
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    // editable fields
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editPriority, setEditPriority] = useState<Priority>("MEDIUM");
    const [editAssigneeId, setEditAssigneeId] = useState<string>("");
    const [editDueDate, setEditDueDate] = useState<string>("");
    const [editStatusColumnId, setEditStatusColumnId] = useState<string>("");

    // ── Comments state ───────────────────────────────────────────────────────
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState("");

    // ── @ mention state ──────────────────────────────────────────────────────
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionDropdownPos, setMentionDropdownPos] = useState<number>(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const projectId = parseInt(projectIdStr || "0", 10);
    const taskId = parseInt(taskIdStr || "0", 10);

    useEffect(() => {
        if (!projectId || !taskId) return;
        Promise.all([
            getTaskById(projectId, taskId),
            getComments(projectId, taskId),
            getProjectMembers(projectId),
            getBoards(projectId)
        ])
            .then(([t, c, m, boards]) => {
                setTask(t);
                setComments(c);
                setMembers(m);
                // Find which board contains this task's column
                for (const board of boards) {
                    if (board.columns?.some(col => col.id === t.columnID)) {
                        setAvailableColumns(board.columns || []);
                        break;
                    }
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [projectId, taskId]);

    // ── Enter edit mode ──────────────────────────────────────────────────────
    const enterEditMode = () => {
        if (!task) return;
        setEditTitle(task.title);
        setEditDescription(task.description ?? "");
        setEditPriority(task.priority);
        setEditAssigneeId(task.assigneeID?.toString() ?? "");
        setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
        setEditStatusColumnId(task.columnID.toString());
        setEditMode(true);
    };

    const cancelEdit = () => setEditMode(false);

    const handleSaveTask = async () => {
        if (!task) return;
        setSaving(true);
        try {
            // 1. If status (column) changed, try moving it first since it might fail due to transition rules
            let currentTask = task;
            if (editStatusColumnId && parseInt(editStatusColumnId, 10) !== task.columnID) {
                const moveRes = await moveTask(projectId, taskId, { columnId: parseInt(editStatusColumnId, 10) });
                currentTask = moveRes; // wait for the move to complete
            }

            // 2. Update other details
            const updated = await updateTask(projectId, taskId, {
                title: editTitle.trim() || currentTask.title,
                description: editDescription.trim() || undefined,
                prioroity: editPriority,
                assigneeId: editAssigneeId ? parseInt(editAssigneeId, 10) : undefined,
                dueDate: editDueDate || undefined,
            });

            // Re-fetch to get full relations (assignee name etc.)
            const fresh = await getTaskById(projectId, taskId);
            setTask({ ...updated, assignee: fresh.assignee, reporter: fresh.reporter });
            setEditMode(false);
        } catch (err: any) {
            alert(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    // ── @ mention logic ──────────────────────────────────────────────────────
    const handleCommentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCommentText(val);
        const cursorPos = e.target.selectionStart;
        const textUpToCursor = val.slice(0, cursorPos);
        const atIndex = textUpToCursor.lastIndexOf("@");
        if (atIndex !== -1) {
            const query = textUpToCursor.slice(atIndex + 1);
            if (!query.includes(" ")) {
                setMentionQuery(query);
                setMentionDropdownPos(atIndex);
                return;
            }
        }
        setMentionQuery(null);
    };

    const insertMention = (name: string) => {
        const before = commentText.slice(0, mentionDropdownPos);
        const after = commentText.slice(mentionDropdownPos + 1 + (mentionQuery?.length ?? 0));
        setCommentText(`${before}@${name} ${after}`);
        setMentionQuery(null);
        textareaRef.current?.focus();
    };

    const filteredMembers = mentionQuery !== null
        ? members.filter(m => m.user.name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
        : [];

    // ── Comment CRUD ─────────────────────────────────────────────────────────
    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;
        setSubmittingComment(true);
        try {
            const created = await createComment(projectId, taskId, commentText.trim());
            setComments(prev => [...prev, created]);
            setCommentText("");
        } catch (err: any) {
            alert(err.message || "Failed to post comment");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleEditComment = async (commentId: number) => {
        if (!editCommentText.trim()) return;
        try {
            const updated = await updateComment(projectId, taskId, commentId, editCommentText.trim());
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: updated.content } : c));
            setEditingCommentId(null);
            setEditCommentText("");
        } catch (err: any) {
            alert(err.message || "Failed to update comment");
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            await deleteComment(projectId, taskId, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err: any) {
            alert(err.message || "Failed to delete comment");
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteTask(projectId, taskId);
            navigate(`/projects/${projectId}`);
        } catch (err: any) {
            alert(err.message || "Failed to delete task");
        }
    };

    const renderCommentContent = (content: string) => {
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, i) =>
            part.startsWith("@")
                ? <span key={i} className="mention-highlight">{part}</span>
                : part
        );
    };

    if (loading) return <div className="task-page-loading">Loading task details...</div>;
    if (error) return <div className="task-page-error">Error: {error}</div>;
    if (!task) return <div className="task-page-error">Task not found</div>;

    return (
        <div className="task-page-container">
            {/* ── Header ── */}
            <div className="task-page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>&larr; Back</button>
                <div className="header-right-actions">
                    {editMode ? (
                        <>
                            <button className="save-btn" onClick={handleSaveTask} disabled={saving}>
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                            <button className="cancel-edit-btn" onClick={cancelEdit}>Cancel</button>
                        </>
                    ) : (
                        <button className="edit-mode-btn" onClick={enterEditMode}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Task
                        </button>
                    )}
                    <button className="delete-btn" onClick={handleDeleteTask}>Delete</button>
                </div>
            </div>

            <div className="task-content">
                <div className="task-main">

                    {/* ── Title ── */}
                    <div className="task-title-section">
                        <span className="task-type-badge">{task.type}</span>
                        {editMode ? (
                            <input
                                className="edit-title-input"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="Task title"
                            />
                        ) : (
                            <h1>{task.title}</h1>
                        )}
                    </div>

                    {/* ── Description ── */}
                    <div className="task-description-section">
                        <div className="section-label">Description</div>
                        {editMode ? (
                            <textarea
                                className="edit-description-textarea"
                                value={editDescription}
                                onChange={e => setEditDescription(e.target.value)}
                                placeholder="Add a description…"
                                rows={5}
                            />
                        ) : (
                            <div className="task-description-box">
                                {task.description || <span className="empty-placeholder">No description provided.</span>}
                            </div>
                        )}
                    </div>

                    {/* ── Child Issues (Stories only) ── */}
                    {task.type === "STORY" && (
                        <div className="task-children-section">
                            <div className="section-label">Child Issues</div>
                            {task.children && task.children.length > 0 ? (
                                <div className="children-list">
                                    {task.children.map(child => (
                                        <div 
                                            key={child.id} 
                                            className="child-card"
                                            onClick={() => navigate(`/projects/${projectId}/tasks/${child.id}`)}
                                        >
                                            <div className="child-card-header">
                                                <span className={`task-type-badge ${child.type === 'BUG' ? 'bug-badge' : 'task-badge'}`}>
                                                    {child.type}
                                                </span>
                                                <span className="child-id">t-{child.id}</span>
                                            </div>
                                            <div className="child-title">{child.title}</div>
                                            <div className="child-status-wrapper">
                                                <div className="status-badge" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.4rem', width: 'fit-content' }}>
                                                    {child.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-placeholder children-empty">No child tasks or bugs yet.</div>
                            )}
                        </div>
                    )}

                    {/* ── Comments Section ── */}
                    <div className="task-activity-section">
                        <div className="section-label">Comments ({comments.length})</div>

                        {/* Comment input */}
                        <div className="comment-composer">
                            <div className="comment-composer__input-wrap">
                                <textarea
                                    ref={textareaRef}
                                    className="comment-textarea"
                                    placeholder="Add a comment… type @ to mention a teammate"
                                    value={commentText}
                                    onChange={handleCommentInput}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleSubmitComment();
                                        }
                                        if (e.key === "Escape") setMentionQuery(null);
                                    }}
                                    rows={3}
                                />
                                {mentionQuery !== null && filteredMembers.length > 0 && (
                                    <ul className="mention-dropdown">
                                        {filteredMembers.map(m => (
                                            <li
                                                key={m.userID}
                                                className="mention-dropdown__item"
                                                onMouseDown={(e) => { e.preventDefault(); insertMention(m.user.name); }}
                                            >
                                                <Avatar
                                                    name={m.user.name}
                                                    avatarUrl={m.user.avatarUrl}
                                                    seed={m.userID}
                                                    size={28}
                                                    className="mention-avatar"
                                                />
                                                <span>{m.user.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="comment-actions">
                                <span className="comment-hint">Ctrl+Enter to submit · @ to mention</span>
                                <button
                                    className="comment-submit-btn"
                                    onClick={handleSubmitComment}
                                    disabled={submittingComment || !commentText.trim()}
                                >
                                    {submittingComment ? "Posting…" : "Comment"}
                                </button>
                            </div>
                        </div>

                        {/* Comment list */}
                        <div className="activity-list">
                            {comments.map(comment => (
                                <div key={comment.id} className="activity-item activity-item--comment">
                                    <Avatar
                                        name={comment.author?.name ?? "User"}
                                        avatarUrl={comment.author?.avatarUrl}
                                        seed={comment.author?.id}
                                        size={36}
                                        className="activity-avatar"
                                    />
                                    <div className="activity-details activity-details--flex">
                                        <div className="comment-header">
                                            <strong>{comment.author?.name || "User"}</strong>
                                            <span className="comment-time">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="comment-edit-wrap">
                                                <textarea
                                                    className="comment-textarea comment-textarea--edit"
                                                    value={editCommentText}
                                                    onChange={e => setEditCommentText(e.target.value)}
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="comment-edit-actions">
                                                    <button className="comment-save-btn" onClick={() => handleEditComment(comment.id)}>Save</button>
                                                    <button className="comment-cancel-btn" onClick={() => { setEditingCommentId(null); setEditCommentText(""); }}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="comment-body">{renderCommentContent(comment.content)}</p>
                                                <div className="comment-meta-actions">
                                                    <button className="comment-action-btn" onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}>Edit</button>
                                                    <button className="comment-action-btn comment-action-btn--danger" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* "Created" system entry at the bottom as a log */}
                            <div className="activity-item activity-item--system">
                                <Avatar
                                    name={task.reporter?.name ?? "Unknown"}
                                    avatarUrl={(task.reporter as any)?.avatarUrl}
                                    seed={task.reporter?.id}
                                    size={36}
                                    className="activity-avatar"
                                />
                                <div className="activity-details">
                                    <p><strong>{task.reporter?.name || "Unknown"}</strong> created this task</p>
                                    <span>{new Date(task.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className="task-sidebar">
                    <div className="sidebar-group">
                        <label>STATUS</label>
                        {editMode && task.type !== "STORY" ? (
                            <select
                                className="sidebar-select"
                                value={editStatusColumnId}
                                onChange={e => setEditStatusColumnId(e.target.value)}
                            >
                                {availableColumns.map(col => (
                                    <option key={col.id} value={col.id}>{col.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="sidebar-value status-badge">{task.status}</div>
                        )}
                        {editMode && task.type === "STORY" && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '4px' }}>
                                Stories cannot be moved between columns.
                            </div>
                        )}
                    </div>

                    <div className="sidebar-group">
                        <label>PRIORITY</label>
                        {editMode ? (
                            <select
                                className="sidebar-select"
                                value={editPriority}
                                onChange={e => setEditPriority(e.target.value as Priority)}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        ) : (
                            <div className="sidebar-value priority-badge">{task.priority}</div>
                        )}
                    </div>

                    <div className="sidebar-group">
                        <label>ASSIGNEE</label>
                        {editMode ? (
                            <select
                                className="sidebar-select"
                                value={editAssigneeId}
                                onChange={e => setEditAssigneeId(e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.userID} value={m.userID}>{m.user.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="sidebar-user">
                                {task.assignee ? (
                                    <>
                                        <Avatar
                                            name={task.assignee.name}
                                            avatarUrl={task.assignee.avatarUrl}
                                            seed={task.assignee.id}
                                            size={32}
                                            className="user-avatar"
                                        />
                                        <span>{task.assignee.name}</span>
                                    </>
                                ) : (
                                    <span className="unassigned">Unassigned</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="sidebar-group">
                        <label>PARENT STORY</label>
                        <div className="sidebar-value">
                            {task.parentID ? `t-${task.parentID}` : 'None'}
                        </div>
                    </div>

                    <div className="sidebar-group">
                        <label>REPORTER</label>
                        <div className="sidebar-user">
                            {task.reporter ? (
                                <>
                                    <Avatar
                                        name={task.reporter.name}
                                        avatarUrl={(task.reporter as any)?.avatarUrl}
                                        seed={task.reporter.id}
                                        size={32}
                                        className="user-avatar"
                                    />
                                    <span>{task.reporter.name}</span>
                                </>
                            ) : (
                                <span className="unassigned">Unknown</span>
                            )}
                        </div>
                    </div>

                    <div className="sidebar-group">
                        <label>DUE DATE</label>
                        {editMode ? (
                            <input
                                type="date"
                                className="sidebar-date-input"
                                value={editDueDate}
                                onChange={e => setEditDueDate(e.target.value)}
                            />
                        ) : (
                            <div className="sidebar-value">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                            </div>
                        )}
                    </div>

                    <div className="sidebar-group">
                        <label>CREATED</label>
                        <div className="sidebar-value date-val">{new Date(task.createdAt).toLocaleString()}</div>
                    </div>

                    <div className="sidebar-group">
                        <label>UPDATED</label>
                        <div className="sidebar-value date-val">{new Date(task.updatedAt).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
