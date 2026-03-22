import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getNotifications, markAsRead, markAllRead } from "../utils/NotificationsApi";
import type { Notification } from "../utils/types";

const HeaderActions: React.FC = () => {
  const { state: authState, dispatch: dispatchAuth } = useAuth();
  const navigate = useNavigate();

  // ─── Notifications state ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!authState.user) return;
    const fetchNotifs = () => {
      getNotifications().then(setNotifications).catch(console.error);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [authState.user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // ─── User Menu state ────────────────────────────────────────────────────────
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function handleLogout() {
    if (!window.confirm("Are you sure you want to log out?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    dispatchAuth({ type: "LOGOUT" });
    navigate("/login");
  }

  // Close menus when clicking outside could be added, but toggling is fine for now
  
  if (!authState.user) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      
      {/* Notifications button */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn--icon"
          style={{ background: 'transparent', border: '1px solid var(--border-color)', position: 'relative', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowUserMenu(false);
          }}
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '360px', maxHeight: '500px',
            background: '#12121a', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main, #f8f8f8)' }}>Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead} 
                  style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ padding: '0', overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim, #9ca3af)', margin: 0 }}>No notifications yet.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: n.read ? 'var(--text-dim, #9ca3af)' : 'var(--text-main, #f8f8f8)' }}>
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(156, 163, 175, 0.6)' }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                        {!n.read && (
                          <button onClick={() => handleMarkAsRead(n.id)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: '4px' }}>
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar menu */}
      <div style={{ position: 'relative' }}>
        <button
          id="btn-avatar"
          onClick={() => {
            setShowUserMenu(!showUserMenu);
            setShowNotifications(false);
          }}
          aria-label="User menu"
          title={authState.user.name ?? 'Menu'}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', padding: 0,
            border: '2px solid rgba(99,102,241,0.5)', cursor: 'pointer',
            overflow: 'hidden', background: 'linear-gradient(135deg,#818cf8,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'box-shadow 0.2s, transform 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.35)';
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {authState.user.avatarUrl ? (
            <img
              src={authState.user.avatarUrl}
              alt={authState.user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>
              {authState.user.name
                ? authState.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)
                : '?'}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '200px',
            background: '#12121a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <button
              onClick={() => navigate('/profile')}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main, #f8f8f8)', textAlign: 'left', padding: '14px 16px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Profile
            </button>
            <button
              onClick={() => { setShowUserMenu(false); navigate('/dashboard'); }}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main, #f8f8f8)', textAlign: 'left', padding: '14px 16px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Home
            </button>
            <button
              onClick={() => navigate('/my-tasks')}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main, #f8f8f8)', textAlign: 'left', padding: '14px 16px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              My Tasks
            </button>
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: '#ff4d4f', textAlign: 'left', padding: '14px 16px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,79,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Logout
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default HeaderActions;
