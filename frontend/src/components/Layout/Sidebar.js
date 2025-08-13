import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ userRole, username = '', isTokenExpired = false }) {
  const { pathname } = useLocation();
  const isActive = (p) => pathname.startsWith(p);

  // ---- Arama ve grup açık/kapalı durumu
  const [q, setQ] = useState('');
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const raw = localStorage.getItem('sidebar_open_groups');
      return raw
        ? JSON.parse(raw)
        : { Genel: true, Proje: true, Karşılaştırma: true, Notlar: true, Araçlar: true, Yönetim: true };
    } catch {
      return { Genel: true, Proje: true, Karşılaştırma: true, Notlar: true, Araçlar: true, Yönetim: true };
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  // ---- Menü grupları
  const groups = useMemo(
    () => [
      {
        title: 'Genel',
        items: [
          { label: 'Tanıtım Sayfası', path: '/dashboard', icon: '🏠' },
          { label: 'Bilgilendirme / Proje Kodları', path: '/glossary', icon: 'ℹ️' },
        ],
      },
      {
        title: 'Proje',
        items: [
          { label: 'Proje / Dosya Yönetimi', path: '/xml-files', icon: '📁' },
          { label: 'Projeye Kod Bloğu Ekleme', path: '/xml-merge', icon: '🧱' },
        ],
      },
      {
        title: 'Karşılaştırma',
        items: [
          { label: 'Versiyonları Karşılaştırma', path: '/compare-diffs', icon: '🆚' },
          { label: 'Excel Karşılaştırma', path: '/compare-excel', icon: '📈' },
          { label: 'Karşılaştırma Raporları', path: '/diff-reports', icon: '📊' },
        ],
      },
      {
        title: 'Notlar',
        items: [{ label: 'Notlar & İlişkiler', path: '/notes-relations', icon: '📝' }],
      },
      {
        title: 'Araçlar',
        items: [{ label: 'Tablo Oluşturma / Filtreleme', path: '/filtering', icon: '🔎' }],
      },
      {
        title: 'Yönetim',
        role: 'admin',
        items: [{ label: 'Kullanıcı Yönetimi', path: '/users', icon: '👥' }],
      },
    ],
    []
  );

  // ---- Rol bazlı ve arama filtresi
  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .filter((g) => !g.role || g.role === userRole)
      .map((g) => {
        const items =
          needle.length === 0
            ? g.items
            : g.items.filter((i) => (i.label + ' ' + i.path).toLowerCase().includes(needle));
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, userRole, q]);

  const toggleGroup = (title) => setOpenGroups((p) => ({ ...p, [title]: !p[title] }));

  // ---- Kullanıcı kartı baş harfleri
  const initials = (username || '')
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      {/* Arama kutusu */}
      <div className="sidebar-top">
        <input
          className="sidebar-search"
          type="text"
          placeholder="Menüde ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Menü */}
      <nav className="sidebar-menu">
        {filteredGroups.length === 0 && <div className="sidebar-empty">Sonuç bulunamadı</div>}

        {filteredGroups.map((group) => (
          <div className="nav-group" key={group.title}>
            <button
              type="button"
              className="group-header"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={!!openGroups[group.title]}
            >
              <span className={`chevron ${openGroups[group.title] ? 'open' : ''}`}>▸</span>
              <span className="group-title">{group.title}</span>
            </button>

            {openGroups[group.title] && (
              <ul className="group-list">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                      title={item.label}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Oturum süresi dolduysa kullanıcı kartını gösterme */}
      {!!username && !isTokenExpired && (
        <div className="sidebar-footer">
          <div className="sidebar-user-chip" title={username}>
            <div className="sidebar-user-avatar">{initials || '👤'}</div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{username}</span>
              {userRole && <span className="sidebar-user-role">{userRole}</span>}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
