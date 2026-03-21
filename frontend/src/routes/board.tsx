import React, { useEffect, useReducer, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBoards, updateBoard, createColumn, updateColumn, deleteColumn, reorderColumns } from "../utils/BoardApi";
import { getTasks, createTask } from "../utils/TaskApi";
import { getProjectMembers } from "../utils/ProjectApi";
import type { Board, Column, Task, ProjectMember, IssueType, Priority } from "../utils/types";
import ColumnCard from "../components/ColumnCard";
import "./css/board.css";

// ─── Local state ──────────────────────────────────────────────────────────────

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; board: Board; tasks: Task[]; members: ProjectMember[] };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; board: Board; tasks: Task[]; members: ProjectMember[] }
  | { type: "FETCH_ERROR"; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":  return { status: "loading" };
    case "FETCH_OK":     return { status: "ok", board: action.board, tasks: action.tasks, members: action.members };
    case "FETCH_ERROR":  return { status: "error", message: action.message };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const BoardPage: React.FC = () => {
  const { id, boardId } = useParams<{ id: string; boardId: string }>();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [draggingColIndex, setDraggingColIndex] = useState<number | null>(null);

  // Modal State
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createTaskColId, setCreateTaskColId] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<IssueType>("TASK");
  const [taskPriority, setTaskPriority] = useState<Priority>("MEDIUM");
  const [taskParentId, setTaskParentId] = useState<string>("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState("");

  const projectIdNum = id ? parseInt(id, 10) : NaN;
  const boardIdNum = boardId ? parseInt(boardId, 10) : NaN;

  // ─── Fetch Board Details ───────────────────────────────────────────────────
  useEffect(() => {
    if (isNaN(projectIdNum) || isNaN(boardIdNum)) {
      dispatch({ type: "FETCH_ERROR", message: "Invalid project or board ID." });
      return;
    }

    dispatch({ type: "FETCH_START" });
    
    Promise.all([
      getBoards(projectIdNum),
      getTasks(projectIdNum),
      getProjectMembers(projectIdNum)
    ])
      .then(([boards, tasks, members]) => {
        const targetBoard = boards.find((b) => b.id === boardIdNum);
        if (targetBoard) {
          dispatch({ type: "FETCH_OK", board: targetBoard, tasks, members });
        } else {
          dispatch({ type: "FETCH_ERROR", message: "Board not found." });
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load board details";
        dispatch({ type: "FETCH_ERROR", message });
      });
  }, [projectIdNum, boardIdNum]);

  const handleSaveName = async () => {
    if (!editName.trim() || state.status !== "ok") return;
    try {
      const updatedBoard = await updateBoard(projectIdNum, boardIdNum, { name: editName });
      const mergedBoard = {
        ...state.board,
        name: updatedBoard.name,
        updatedAt: updatedBoard.updatedAt
      };
      dispatch({ type: "FETCH_OK", board: mergedBoard, tasks: state.tasks, members: state.members });
      setIsEditingName(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update board";
      alert(message);
    }
  };

  const handleCreateColumn = async () => {
    if (state.status !== "ok") return;
    const name = window.prompt("Enter column name:");
    if (!name || !name.trim()) return;
    try {
      const newCol = await createColumn(projectIdNum, boardIdNum, { name: name.trim() });
      const updatedColumns = [...(state.board.columns || []), newCol];
      dispatch({ type: "FETCH_OK", board: { ...state.board, columns: updatedColumns }, tasks: state.tasks, members: state.members });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create column");
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingColIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (index: number) => {
    if (draggingColIndex === null || draggingColIndex === index || state.status !== "ok") return;
    const newCols = [...(state.board.columns || [])];
    const draggedCol = newCols[draggingColIndex];
    newCols.splice(draggingColIndex, 1);
    newCols.splice(index, 0, draggedCol);
    dispatch({ type: "FETCH_OK", board: { ...state.board, columns: newCols }, tasks: state.tasks, members: state.members });
    setDraggingColIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow drop
  };

  const handleDragEnd = async () => {
    if (draggingColIndex === null || state.status !== "ok") return;
    setDraggingColIndex(null);
    try {
      const payload = state.board.columns!.map((c, i) => ({ id: c.id, order: i + 1 }));
      await reorderColumns(projectIdNum, boardIdNum, { columns: payload });
    } catch (err) {
      alert("Failed to sync column order with server.");
    }
  };

  const handleOpenCreateTaskModal = (columnId: number) => {
    setCreateTaskColId(columnId);
    setTaskTitle("");
    setTaskType("TASK");
    setTaskPriority("MEDIUM");
    setTaskParentId("");
    setTaskAssigneeId("");
    setTaskDescription("");
    setCreateTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = async () => {
    if (state.status !== "ok" || createTaskColId === null) return;
    if (!taskTitle.trim()) {
      alert("Title is required");
      return;
    }
    try {
      const { task } = await createTask(projectIdNum, {
        title: taskTitle.trim(),
        columnId: createTaskColId,
        type: taskType,
        priority: taskPriority,
        parentID: taskParentId ? parseInt(taskParentId, 10) : undefined,
        assigneeId: taskAssigneeId ? parseInt(taskAssigneeId, 10) : undefined,
        description: taskDescription.trim() || undefined
      });
      
      const assigneeMember = state.members.find(m => m.userID === parseInt(taskAssigneeId, 10));
      const fullTask = {
        ...task,
        assignee: assigneeMember ? assigneeMember.user : undefined,
      };
      
      dispatch({ type: "FETCH_OK", board: state.board, tasks: [...state.tasks, fullTask], members: state.members });
      setCreateTaskModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create task");
    }
  };

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
        const { board, tasks } = state;
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {isEditingName ? (
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <input 
                         type="text" 
                         value={editName}
                         onChange={(e) => setEditName(e.target.value)}
                         className="form-input"
                         style={{ padding: '4px 8px', fontSize: '1.2rem', fontWeight: 'bold' }}
                         autoFocus
                       />
                       <button className="btn btn--primary btn--small" onClick={handleSaveName}>Save</button>
                       <button className="btn btn--secondary btn--small" onClick={() => setIsEditingName(false)}>Cancel</button>
                     </div>
                  ) : (
                    <>
                      <h1 className="board-page__title">{board.name}</h1>
                      <button
                        className="btn btn--icon btn--small mt-1"
                        style={{ marginLeft: '12px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                        onClick={() => {
                          setEditName(board.name);
                          setIsEditingName(true);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                        aria-label="Edit board name"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <div className="board-page__actions">
                    <button className="btn btn--primary btn--small" onClick={handleCreateColumn}>
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
                     <button className="btn btn--secondary mt-2" onClick={handleCreateColumn}>Create Column</button>
                   </div>
                 ) : (
                   <div className="columns-container">
                     {columns.map((col: Column, index: number) => (
                       <div 
                         key={col.id}
                         draggable
                         onDragStart={(e) => handleDragStart(e, index)}
                         onDragEnter={() => handleDragEnter(index)}
                         onDragOver={handleDragOver}
                         onDragEnd={handleDragEnd}
                         style={{ 
                           transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)', 
                           cursor: 'grab',
                           opacity: draggingColIndex === index ? 0.8 : 1,
                           transform: draggingColIndex === index ? 'scale(0.98)' : 'scale(1)',
                           outline: draggingColIndex === index ? '2px dashed #3b82f6' : 'none',
                           outlineOffset: '4px',
                           borderRadius: '8px',
                           zIndex: draggingColIndex === index ? 10 : 1
                         }}
                       >
                         <ColumnCard 
                           column={col} 
                           tasks={tasks.filter((t) => t.columnID === col.id)}
                           onAddTaskClick={() => handleOpenCreateTaskModal(col.id)}
                           onUpdateColumn={async (data) => {
                             try {
                               const updatedCol = await updateColumn(projectIdNum, boardIdNum, col.id, data);
                               const newCols = columns.map((c: Column) => c.id === col.id ? updatedCol : c);
                               dispatch({ type: "FETCH_OK", board: { ...board, columns: newCols }, tasks: state.tasks, members: state.members });
                             } catch(err: any) { alert(err.message || "Failed to update column"); }
                           }}
                           onDeleteColumn={async () => {
                             if (!window.confirm(`Are you sure you want to delete the column "${col.name}"?`)) return;
                             try {
                               await deleteColumn(projectIdNum, boardIdNum, col.id);
                               const newCols = columns.filter((c: Column) => c.id !== col.id);
                               dispatch({ type: "FETCH_OK", board: { ...board, columns: newCols }, tasks: state.tasks, members: state.members });
                             } catch(err: any) { alert(err.message || "Failed to delete column"); }
                           }}
                         />
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </main>
            
            {createTaskModalOpen && (
              <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal-content" style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Create Issue</h2>
                  
                  <input 
                    className="form-input" 
                    placeholder="Task Title"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <select 
                      className="form-input"
                      value={taskType}
                      onChange={e => setTaskType(e.target.value as IssueType)}
                      style={{ flex: 1, padding: '10px', boxSizing: 'border-box' }}
                    >
                      <option value="BUG">Bug</option>
                      <option value="TASK">Task</option>
                      <option value="STORY">Story</option>
                    </select>
                    
                    <select 
                      className="form-input"
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value as Priority)}
                      style={{ flex: 1, padding: '10px', boxSizing: 'border-box' }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  
                  <select
                    className="form-input"
                    value={taskParentId}
                    onChange={e => setTaskParentId(e.target.value)}
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                  >
                    <option value="">📖 Select Story (Optional)</option>
                    {state.tasks.filter(t => t.type === 'STORY').map(story => (
                      <option key={story.id} value={story.id}>📖 {story.title}</option>
                    ))}
                  </select>
                  
                  <select
                    className="form-input"
                    value={taskAssigneeId}
                    onChange={e => setTaskAssigneeId(e.target.value)}
                    style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                  >
                    <option value="">👤 Unassigned</option>
                    {state.members.map(member => (
                      <option key={member.userID} value={member.userID}>{member.user.name}</option>
                    ))}
                  </select>
                  
                  <textarea
                    className="form-input"
                    placeholder="Description"
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    style={{ width: '100%', padding: '10px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button className="btn btn--secondary" onClick={() => setCreateTaskModalOpen(false)}>Cancel</button>
                    <button className="btn btn--primary" onClick={handleCreateTaskSubmit}>Create</button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

export default BoardPage;
