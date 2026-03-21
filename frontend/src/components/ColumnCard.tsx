import React, { useState, useRef, useEffect } from 'react';
import type { Column, Task } from '../utils/types';

interface ColumnCardProps {
  column: Column;
  tasks?: Task[];
  onUpdateColumn?: (data: { name: string; WipLimit?: number | null }) => void;
  onDeleteColumn?: () => void;
  onAddTaskClick?: () => void;
}

const TaskCard = ({ task }: { task: Task }) => (
  <div className="task-card">
    <div className="task-card__title">{task.title}</div>
    <div className="task-card__tags">
      <span className={`task-tag task-tag--${task.type.toLowerCase()}`}>{task.type}</span>
      <span className={`task-tag task-tag--${task.priority.toLowerCase()}`}>{task.priority}</span>
    </div>
    <div className="task-card__footer">
      <div className="task-id">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="issue-icon">
           <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
           <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>
        <span>{task.id}</span>
      </div>
      <img src={task.assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${task.assignee?.name || 'Unassigned'}&background=random`} alt="Assignee" className="task-avatar" />
    </div>
  </div>
);

const ColumnCard: React.FC<ColumnCardProps> = ({ column, tasks = [], onUpdateColumn, onDeleteColumn, onAddTaskClick }) => {
  const isDone = column.name.toLowerCase().includes('done');
  
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editWipLimit, setEditWipLimit] = useState(column.wipLimit === null || column.wipLimit === undefined ? '' : column.wipLimit.toString());

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    if (!editName.trim()) return;
    if (onUpdateColumn) {
      const parsedLimit = editWipLimit.trim() === '' ? null : parseInt(editWipLimit, 10);
      onUpdateColumn({
        name: editName,
        WipLimit: isNaN(parsedLimit as any) ? null : parsedLimit
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="board-column">
      <div className="column-header">
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, padding: '4px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '2px' }}>Name</label>
              <input 
                autoFocus
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ padding: '4px', fontSize: '0.8rem', width: '100%' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setIsEditing(false); }
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '2px' }}>WIP Limit (optional)</label>
              <input 
                type="number"
                min="1"
                className="form-input"
                value={editWipLimit}
                onChange={(e) => setEditWipLimit(e.target.value)}
                style={{ padding: '4px', fontSize: '0.8rem', width: '100%' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setIsEditing(false); }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn--primary" style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={handleSave}>Save</button>
              <button className="btn btn--secondary" style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <h3 className="column-title">
            {column.name.toUpperCase()}
            {isDone && (
              <svg className="done-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </h3>
        )}

        {!isEditing && <span className="column-count">{tasks.length}</span>}
        
        {!isEditing && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button className="column-options" onClick={() => setShowOptions(!showOptions)} aria-label="Column options">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            {showOptions && (
              <div className="column-dropdown-menu">
                <button onClick={() => { 
                  setIsEditing(true); 
                  setEditName(column.name);
                  setEditWipLimit(column.wipLimit === null || column.wipLimit === undefined ? '' : column.wipLimit.toString());
                  setShowOptions(false); 
                }}>Update Column</button>
                <button style={{ color: '#ef4444' }} onClick={() => { setShowOptions(false); onDeleteColumn && onDeleteColumn(); }}>Delete Column</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="column-body">
        {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
      <button className="add-task-btn" onClick={onAddTaskClick}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Create
      </button>
    </div>
  );
};

export default ColumnCard;
