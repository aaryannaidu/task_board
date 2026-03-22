import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTaskById, deleteTask, updateTask, moveTask } from "../utils/TaskApi";
import { getComments, createComment, updateComment, deleteComment } from "../utils/CommentApi";
import { getProjectMembers } from "../utils/ProjectApi";
import { getBoards } from "../utils/BoardApi";
import Avatar from "../components/Avatar";
import type { Task, Comment, ProjectMember, Priority, Column, WorkTransition } from "../utils/types";
import "./css/task.css";

export default function TaskPage() {
    const { id: projectIdStr, taskId: taskIdStr } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Columns state (for moving task) ──────────────────────────────────────
    const [availableColumns, setAvailableColumns] = useState<Column[]>([]);
    const [availableTransitions, setAvailableTransitions] = useState<WorkTransition[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<number | null>(null);

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
    const editorRef = useRef<HTMLDivElement>(null);

    // Link modal state
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");
    const savedRangeRef = useRef<Range | null>(null);

    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        list: false,
        code: false,
    });

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
                for (const board of boards) {
                    if (board.columns?.some(col => col.id === t.columnID)) {
                        setAvailableColumns(board.columns || []);
                        setAvailableTransitions(board.transitions || []);
                        setCurrentBoardId(board.id);
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

    const updateFormattingState = () => {
        const sel = window.getSelection();
        let isCode = false;
        if (sel && sel.focusNode) {
            let node: Node | null = sel.focusNode;
            while (node && node !== editorRef.current) {
                if (node.nodeName === 'CODE') {
                    isCode = true;
                    break;
                }
                node = node.parentNode;
            }
        }
        
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            list: document.queryCommandState('insertUnorderedList'),
            code: isCode
        });
    };

    const toggleCode = () => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        let targetNode: Node | null = sel.focusNode;
        let codeNode: HTMLElement | null = null;
        while (targetNode && targetNode !== editorRef.current) {
            if (targetNode.nodeName === 'CODE') {
                codeNode = targetNode as HTMLElement;
                break;
            }
            targetNode = targetNode.parentNode;
        }

        if (codeNode) {
            // Unwrap the code tag
            const fragment = document.createDocumentFragment();
            while (codeNode.firstChild) {
                fragment.appendChild(codeNode.firstChild);
            }
            codeNode.parentNode?.replaceChild(fragment, codeNode);
        } else {
            const textToCode = sel.toString();
            if (textToCode) {
                document.execCommand('insertHTML', false, `<code>${textToCode}</code>`);
            } else {
                const codeEl = document.createElement('code');
                codeEl.appendChild(document.createTextNode('\u200B'));
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(codeEl);
                range.setStart(codeEl.firstChild!, 1);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        updateFormattingState();
    };

    const openLinkModal = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
            setLinkText(sel.toString());
        } else {
            savedRangeRef.current = null;
            setLinkText("");
        }
        setLinkUrl("");
        setLinkModalOpen(true);
    };

    const confirmLink = () => {
        if (!linkUrl) {
            setLinkModalOpen(false);
            return;
        }

        editorRef.current?.focus();
        const sel = window.getSelection();
        if (savedRangeRef.current && sel) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }

        // Insert hyperlink natively using HTML
        const aHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText || linkUrl}</a>`;
        document.execCommand('insertHTML', false, aHtml);

        if (editorRef.current) setCommentText(editorRef.current.innerHTML);
        setLinkModalOpen(false);
        updateFormattingState();
    };

    const insertMention = (name: string) => {
        const sel = window.getSelection();
        if (sel && sel.focusNode && sel.focusNode.nodeType === 3) {
            const text = sel.focusNode.nodeValue || "";
            const matchIndex = text.search(/@\w*$/);
            if (matchIndex !== -1) {
                sel.focusNode.nodeValue = text.slice(0, matchIndex) + `@${name}\u00A0`;
                const range = document.createRange();
                range.setStart(sel.focusNode, matchIndex + name.length + 2);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        if (editorRef.current) setCommentText(editorRef.current.innerHTML);
        setMentionQuery(null);
        editorRef.current?.focus();
    };

    const filteredMembers = mentionQuery !== null
        ? members.filter(m => m.user.name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
        : [];

    // ── Comment CRUD ─────────────────────────────────────────────────────────
    const handleSubmitComment = async () => {
        // Strip out HTML tags just for the empty check
        const plainText = commentText.replace(/<[^>]+>/g, '').trim();
        if (!plainText) return;
        setSubmittingComment(true);
        try {
            const created = await createComment(projectId, taskId, commentText);
            setComments(prev => [...prev, created]);
            setCommentText("");
            if (editorRef.current) {
                editorRef.current.innerHTML = "";
            }
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
        if (!window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
        try {
            await deleteTask(projectId, taskId);
            // Navigate back to the board page if we know the board, otherwise the project page
            if (currentBoardId) {
                navigate(`/projects/${projectId}/boards/${currentBoardId}`);
            } else {
                navigate(`/projects/${projectId}`);
            }
        } catch (err: any) {
            alert(err.message || "Failed to delete task");
        }
    };

    const handleCloseTask = async () => {
        if (!task) return;
        if (!task.resolveAt) {
            alert("Task must be resolved (in Done column) before it can be closed.");
            return;
        }
        if (!window.confirm("Mark this task as closed? This action indicates the task is fully complete.")) return;
        try {
            const updated = await updateTask(projectId, taskId, { closedAt: new Date().toISOString() });
            setTask(prev => prev ? { ...prev, closedAt: updated.closedAt } : prev);
        } catch (err: any) {
            alert(err.message || "Failed to close task");
        }
    };

    const renderCommentContentHTML = (content: string) => {
        // Simple mention highlighter that avoids touching HTML attributes. 
        // In a complex app we'd use a real parser. 
        const highlighted = content.replace(/(?<!=["'])(@\w+)/g, '<span class="mention-highlight">$1</span>');
        return highlighted;
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
                        <>
                            {task.resolveAt && !task.closedAt && (
                                <button className="close-task-btn" onClick={handleCloseTask}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    Close Task
                                </button>
                            )}
                            <button className="edit-mode-btn" onClick={enterEditMode}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit Task
                            </button>
                        </>
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
                            <div className="rich-text-editor-wrap">
                                <div className="rte-toolbar">
                                    <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); updateFormattingState(); }} title="Bold" className={`rte-btn ${activeFormats.bold ? 'active' : ''}`}><b>B</b></button>
                                    <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); updateFormattingState(); }} title="Italic" className={`rte-btn ${activeFormats.italic ? 'active' : ''}`}><i>I</i></button>
                                    <button onMouseDown={(e) => { 
                                        e.preventDefault(); 
                                        toggleCode();
                                    }} title="Code" className={`rte-btn ${activeFormats.code ? 'active' : ''}`}>&lt;/&gt;</button>
                                    <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false); updateFormattingState(); }} title="List" className={`rte-btn ${activeFormats.list ? 'active' : ''}`}>•</button>
                                    <button onMouseDown={(e) => { 
                                        e.preventDefault(); 
                                        openLinkModal();
                                    }} title="Link" className="rte-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </button>
                                </div>
                                <div
                                    ref={editorRef}
                                    className="comment-contenteditable"
                                    contentEditable
                                    onInput={(e) => {
                                        setCommentText(e.currentTarget.innerHTML);
                                        updateFormattingState();
                                        const sel = window.getSelection();
                                        if (sel && sel.focusNode && sel.focusNode.nodeType === 3) {
                                            const text = sel.focusNode.nodeValue?.slice(0, sel.focusOffset) || "";
                                            const match = text.match(/@(\w*)$/);
                                            if (match) {
                                                setMentionQuery(match[1]);
                                                return;
                                            }
                                        }
                                        setMentionQuery(null);
                                    }}
                                    onKeyUp={updateFormattingState}
                                    onMouseUp={updateFormattingState}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleSubmitComment();
                                        }
                                        if (e.key === "Escape") setMentionQuery(null);
                                    }}
                                    data-placeholder="Add a comment… Use @name to mention"
                                />
                                
                                {linkModalOpen && (
                                    <div className="rte-link-modal-overlay" onMouseDown={(e) => {
                                        if (e.target === e.currentTarget) {
                                            e.preventDefault();
                                            setLinkModalOpen(false);
                                        }
                                    }}>
                                        <div className="rte-link-modal">
                                            <div className="rte-lm-header">Add Link</div>
                                            <input 
                                                className="rte-lm-input" 
                                                placeholder="Text to display" 
                                                value={linkText} 
                                                onChange={e => setLinkText(e.target.value)} 
                                            />
                                            <input 
                                                className="rte-lm-input" 
                                                placeholder="URL (e.g. https://google.com)" 
                                                value={linkUrl} 
                                                onChange={e => setLinkUrl(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="rte-lm-actions">
                                                <button className="rte-lm-btn-cancel" onClick={(e) => { e.preventDefault(); setLinkModalOpen(false); }}>Cancel</button>
                                                <button className="rte-lm-btn-save" onClick={(e) => { e.preventDefault(); confirmLink(); }}>Save</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                                <div 
                                                    className="comment-body" 
                                                    dangerouslySetInnerHTML={{ __html: renderCommentContentHTML(comment.content) }} 
                                                />
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
                            (() => {
                                // Only show the current column + columns reachable via a valid transition
                                const validToStatuses = new Set(
                                    availableTransitions
                                        .filter(t => t.fromStatus === task.status)
                                        .map(t => t.toStatus)
                                );
                                const allowedCols = availableColumns.filter(
                                    col => col.id === task.columnID || validToStatuses.has(col.name)
                                );
                                return (
                                    <>
                                        <select
                                            className="sidebar-select"
                                            value={editStatusColumnId}
                                            onChange={e => setEditStatusColumnId(e.target.value)}
                                        >
                                            {allowedCols.map(col => (
                                                <option key={col.id} value={col.id}>{col.name}</option>
                                            ))}
                                        </select>
                                        {allowedCols.length <= 1 && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-gray)', marginTop: '4px' }}>
                                                No further transitions defined for this status.
                                            </div>
                                        )}
                                    </>
                                );
                            })()
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

                    {task.resolveAt && (
                        <div className="sidebar-group">
                            <label>RESOLVED</label>
                            <div className="sidebar-value date-val resolved-val">{new Date(task.resolveAt).toLocaleString()}</div>
                        </div>
                    )}

                    {task.closedAt && (
                        <div className="sidebar-group">
                            <label>CLOSED</label>
                            <div className="sidebar-value date-val closed-val">{new Date(task.closedAt).toLocaleString()}</div>
                        </div>
                    )}

                    {/* ── Resolved / Closed status banner ── */}
                    {task.resolveAt && (
                        <div className={`task-lifecycle-banner ${task.closedAt ? 'banner--closed' : 'banner--resolved'}`}>
                            {task.closedAt ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span>This task is <strong>closed</strong>.</span>
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                    <span>Task is <strong>resolved</strong>. Click <em>Close Task</em> to archive it.</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
