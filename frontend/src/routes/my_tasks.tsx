import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getProjects } from "../utils/ProjectApi";
import { getTasks } from "../utils/TaskApi";
import type { Task, Project } from "../utils/types";
import "./css/dashboard.css"; // Reuse dashboard layout classes for the frame

interface TaskWithProject extends Task {
  project: Project;
}

const MyTasks: React.FC = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authState.user) return;

    async function fetchMyTasks() {
      try {
        setLoading(true);
        // 1. Fetch all projects the user is part of
        const projects = await getProjects();

        // 2. Fetch all tasks for all projects concurrently
        const tasksPromises = projects.map(async (project) => {
          const projectTasks = await getTasks(project.id).catch(() => [] as Task[]);
          return projectTasks.map(t => ({ ...t, project }));
        });

        const nestedTasks = await Promise.all(tasksPromises);
        
        // 3. Flatten and filter down to tasks assigned to the current user
        const allTasks = nestedTasks.flat();
        const myAssignedTasks = allTasks.filter(
          (t) => t.assigneeID === authState.user!.id
        );

        // Sort by created date descending
        myAssignedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setTasks(myAssignedTasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    void fetchMyTasks();
  }, [authState.user]);

  // Priority color helper
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "#ef4444"; // red
      case "HIGH": return "#f97316"; // orange
      case "MEDIUM": return "#eab308"; // yellow
      default: return "#3b82f6"; // blue
    }
  };

  // Type icon helper
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUG": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
      case "STORY": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M2 15h10"></path><path d="M9 18l3-3-3-3"></path></svg>;
      default: return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
    }
  };

  return (
    <div className="dashboard">
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
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            My Tasks
          </h1>
          <p className="dashboard__subtitle">
            Tasks assigned to {authState.user?.name ?? "you"} across all projects
          </p>
        </div>

        <div className="dashboard__actions">
          <button
            className="btn btn--secondary"
            onClick={() => navigate("/dashboard")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="dashboard__content">
        {loading && (
          <div className="dashboard__state">
            <span className="spinner" aria-label="Loading tasks" />
            <p>Gathering your tasks...</p>
          </div>
        )}

        {error && (
          <div className="dashboard__state dashboard__state--error">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="dashboard__state">
            <p className="dashboard__empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </p>
            <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.5rem" }}>You're all caught up!</h2>
            <p style={{ maxWidth: "420px", margin: "14px auto 30px", lineHeight: "1.6" }}>
              There are no tasks currently assigned to you. Enjoy the peace and quiet.
            </p>
            <button
              className="btn btn--primary"
              onClick={() => navigate("/dashboard")}
            >
              Go to Projects
            </button>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>
            {tasks.map(task => (
              <div 
                key={`${task.project.id}-${task.id}`}
                onClick={() => navigate(`/projects/${task.project.id}/tasks/${task.id}`)}
                style={{
                  background: 'var(--bg-surface, rgba(20,20,30,0.6))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.2sease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-color, #6366f1)';
                  e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255,255,255,0.08))';
                  e.currentTarget.style.background = 'var(--bg-surface, rgba(20,20,30,0.6))';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Type icon & Priority */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '40px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                     {getTypeIcon(task.type)}
                  </div>
                  <div style={{ 
                    width: '6px', height: '6px', borderRadius: '50%', 
                    background: getPriorityColor(task.priority),
                    boxShadow: `0 0 8px ${getPriorityColor(task.priority)}`
                  }} title={`Priority: ${task.priority}`} />
                </div>

                {/* Main Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim, #9ca3af)', letterSpacing: '0.04em', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                      {task.project.name}
                    </div>
                    {task.status && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main, #f8f8f8)' }}>
                    {task.title}
                  </h3>
                  {task.dueDate && (
                     <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                       Due {new Date(task.dueDate).toLocaleDateString()}
                     </p>
                  )}
                </div>

                {/* Action arrow */}
                <div style={{ color: 'var(--text-dim, #9ca3af)' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTasks;
