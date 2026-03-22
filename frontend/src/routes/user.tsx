import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./css/user.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

const UserProfile: React.FC = () => {
  const { state: authState, dispatch } = useAuth();
  const navigate = useNavigate();
  const user = authState.user;

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // base64 preview
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File processing (shared by click-to-browse and drag-and-drop) ─────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", msg: "Please drop an image file (PNG, JPG, WebP, etc.)" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", msg: "Image must be under 5 MB." });
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setAvatarPreview(base64);
      setStatus(null);
    } catch {
      setStatus({ type: "error", msg: "Could not read the file." });
    }
  }, []);

  // ── Native drag-and-drop handlers ─────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      setStatus({ type: "error", msg: "Name cannot be empty." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (avatarPreview) body.avatarUrl = avatarPreview;

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Update failed");
      }

      const updated = await res.json() as { name: string; avatarUrl?: string };
      dispatch({ type: "UPDATE_PROFILE", payload: { name: updated.name, avatarUrl: updated.avatarUrl } });
      setAvatarPreview(null); // clear preview — use committed value from context
      setEditing(false);
      setStatus({ type: "success", msg: "Profile updated successfully!" });
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name ?? "");
    setAvatarPreview(null);
    setStatus(null);
    setEditing(false);
  };

  // ── Logout handler ────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  // ── Current avatar to render ───────────────────────────────────────────────
  const displayAvatar = avatarPreview ?? user?.avatarUrl ?? null;

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <span className="spinner" aria-label="Loading" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="profile-header">
        <button
          className="profile-header__back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="profile-header__title">My Profile</h1>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="profile-content">
        <div className="profile-card">

          {/* Avatar */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {displayAvatar ? (
                <img className="avatar-img" src={displayAvatar} alt={user.name} />
              ) : (
                <div className="avatar-placeholder">{getInitials(user.name)}</div>
              )}
            </div>

            {/* Drag-and-drop zone — shown only in edit mode */}
            {editing && (
              <div
                id="avatar-drop-zone"
                className={`drop-zone${dragOver ? " drag-over" : ""}`}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Drop avatar image or click to browse"
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                <div className="drop-zone__icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span>
                  {dragOver
                    ? "Release to upload"
                    : avatarPreview
                    ? "Drop a new image to replace"
                    : "Drag & drop your avatar here"}
                </span>
                <span className="drop-zone__hint">or click to browse · PNG, JPG, WebP · max 5 MB</span>
                <input
                  ref={fileInputRef}
                  className="drop-zone__input"
                  type="file"
                  accept="image/*"
                  onChange={onFileInputChange}
                  tabIndex={-1}
                />
              </div>
            )}
          </div>

          {/* User info (view mode) */}
          {!editing && (
            <div className="profile-info">
              <h2 className="profile-info__name">{user.name}</h2>
              <p className="profile-info__email">{user.email}</p>
              <span className={`profile-info__role ${user.globalRole === "ADMIN" ? "role--admin" : "role--member"}`}>
                {user.globalRole === "ADMIN" ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    Global Admin
                  </>
                ) : "Member"}
              </span>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="profile-form">
              <div className="form-field">
                <label className="form-label" htmlFor="profile-name">Display Name</label>
                <input
                  id="profile-name"
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={user.email}
                  disabled
                />
                <span className="form-hint">Email cannot be changed here.</span>
              </div>
            </div>
          )}

          {/* Status message */}
          {status && (
            <p className={`status-msg status-msg--${status.type}`} style={{ marginTop: 16 }}>
              {status.type === "success" ? "✓" : "⚠"} {status.msg}
            </p>
          )}

          {/* Action buttons */}
          <div className="profile-actions" style={{ marginTop: editing ? 24 : 8 }}>
            {editing ? (
              <>
                <button className="btn btn--secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                id="btn-edit-profile"
                className="btn btn--primary"
                onClick={() => {
                  setName(user.name);
                  setStatus(null);
                  setEditing(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Logout button at bottom right */}
      {!editing && (
        <button 
          onClick={handleLogout}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card, #2d303e)',
            color: '#ff4d4f',
            border: '1px solid #481d1d',
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#481d1d'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card, #2d303e)'}
          aria-label="Log out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      )}
    </div>
  );
};

export default UserProfile;
