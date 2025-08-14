// src/components/Layout/Layout.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Layout.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const N_ENDPOINT = `${API_BASE}/api/notifications`;

function useAuthHeaders() {
  return useCallback((opts = { json: false }) => {
    const token = localStorage.getItem('jwt_token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.json) headers['Content-Type'] = 'application/json';
    return { headers };
  }, []);
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)} sn`;
    if (diff < 3600) return `${Math.floor(diff/60)} dk`;
    if (diff < 86400) return `${Math.floor(diff/3600)} sa`;
    return d.toLocaleString();
  } catch { return ''; }
}
function initialsFrom(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || '•';
}

function NotificationBell({ disabled = false }) {
  const getHeaders = useAuthHeaders();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (disabled) return;
    try {
      const r = await axios.get(`${N_ENDPOINT}/unread-count`, getHeaders());
      if (r.data?.success) setCount(r.data.count || 0);
    } catch {}
  }, [getHeaders, disabled]);

  const fetchList = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const r = await axios.get(`${N_ENDPOINT}/?only_unread=false&limit=50`, getHeaders());
      if (r.data?.success) setItems(r.data.items || []);
    } catch {}
    finally { setLoading(false); }
  }, [getHeaders, disabled]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (open && e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async () => {
    if (disabled) return;
    const next = !open;
    setOpen(next);
    if (next) await fetchList();
  };

  const markOneRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await axios.put(`${N_ENDPOINT}/${notif.id}/read`, null, getHeaders());
      setItems(prev => prev.map(x => x.id === notif.id ? { ...x, is_read: true } : x));
      setCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const deleteOne = async (notif, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${N_ENDPOINT}/${notif.id}`, getHeaders());
      setItems(prev => prev.filter(x => x.id !== notif.id));
      if (!notif.is_read) setCount(c => Math.max(0, c - 1));
    } catch {}
  };

  return (
    <div className="header-notif" ref={rootRef}>
      <button
        type="button"
        className={`notif-btn ${disabled ? 'is-disabled' : ''}`}
        onClick={toggle}
        title={disabled ? 'Oturum kapalı' : 'Bildirimler'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-disabled={disabled}
      >
        <span aria-hidden>🔔</span>
        {!disabled && count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && !disabled && (
        <div className="notif-panel notif-white" role="dialog" aria-label="Bildirimler">
          {loading ? (
            <div className="notif-empty">Yükleniyor…</div>
          ) : items.length === 0 ? (
            <div className="notif-empty">Bildirim yok</div>
          ) : (
            <ul className="notif-list">
              {items.map(n => {
                const initials = initialsFrom(n.actor_username);
                const versionText = n.version_info ? `Versiyon: ${n.version_info}` : (n.diff_id ? `Diff #${n.diff_id}` : null);
                const fileText = n.xmlfile_name ? `Dosya: ${n.xmlfile_name}` : null;

                return (
                  <li
                    key={n.id}
                    className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => markOneRead(n)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && markOneRead(n)}
                    role="button"
                    tabIndex={0}
                    title={n.is_read ? 'Okundu' : 'Okundu olarak işaretle'}
                  >
                    <div className="notif-avatar" aria-hidden="true">{initials}</div>

                    <div className="notif-body">
                      <div className="notif-line-wrap">
                        <span className="notif-actor">{n.actor_username || 'Bir kullanıcı'}</span>
                        {': '}
                        <span className="notif-msg-full">{n.message}</span>
                      </div>
                      <div className="notif-meta">
                        {fileText && <span>{fileText}</span>}
                        {fileText && versionText && <span> • </span>}
                        {versionText && <span>{versionText}</span>}
                        {(fileText || versionText) && <span> • </span>}
                        <span>Not #{n.note_id} • {timeAgo(n.created_at)}</span>
                      </div>
                    </div>

                    <div className="notif-right">
                      {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
                      <button
                        className="notif-del"
                        title="Bildirimi sil"
                        onClick={(e) => deleteOne(n, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label="Bildirimi sil"
                        type="button"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" className="trash-icon" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm13-15h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Layout({ children, onLogout, userRole, isTokenExpired, username = '' }) {
  const navigate = useNavigate();
  const handleAuthButton = () => {
    if (isTokenExpired) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_role');
      navigate('/login');
    } else {
      onLogout?.();
    }
  };

  return (
    <div className="layout-container">
      <Sidebar userRole={userRole} username={username} isTokenExpired={isTokenExpired} />
      <div className="main-content-wrapper">
        <header className="app-header">
          <h1>Dokümantasyon ve Versiyon Takip Sistemi</h1>
          <div className="header-right">
            <NotificationBell disabled={!!isTokenExpired} />
            <button
              onClick={handleAuthButton}
              className={`logout-button ${isTokenExpired ? 'login-green' : ''}`}
              aria-label={isTokenExpired ? 'Giriş Yap' : 'Çıkış Yap'}
            >
              {isTokenExpired ? 'Giriş Yap' : 'Çıkış Yap'}
            </button>
          </div>
        </header>
        <main className="app-main-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;