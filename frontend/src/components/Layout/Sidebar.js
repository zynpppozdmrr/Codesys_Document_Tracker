import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ userRole, username = '', isTokenExpired = false }) {
  const { pathname } = useLocation();
  const isActive = (p) => pathname.startsWith(p);

  const initials = (username || '')
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        <ul className="sidebar-nav">
          <li><Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>Tanıtım Sayfası</Link></li>
          <li><Link to="/glossary" className={`nav-item ${isActive('/glossary') ? 'active' : ''}`}>Bilgilendirme / Proje Kodları</Link></li>
          <li><Link to="/xml-files" className={`nav-item ${isActive('/xml-files') ? 'active' : ''}`}>Proje / Dosya Yönetimi</Link></li>
          <li><Link to="/xml-merge" className={`nav-item ${isActive('/xml-merge') ? 'active' : ''}`}>XML Birleştirme</Link></li>
          <li><Link to="/compare-diffs" className={`nav-item ${isActive('/compare-diffs') ? 'active' : ''}`}>Karşılaştırma Yap</Link></li>
          <li><Link to="/compare-excel" className={`nav-item ${isActive('/compare-excel') ? 'active' : ''}`}>Excel Karşılaştırma</Link></li>
          <li><Link to="/diff-reports" className={`nav-item ${isActive('/diff-reports') ? 'active' : ''}`}>Karşılaştırma Raporları</Link></li>
          <li><Link to="/notes-relations" className={`nav-item ${isActive('/notes-relations') ? 'active' : ''}`}>Notlar & İlişkiler</Link></li>
          <li><Link to="/filtering" className={`nav-item ${isActive('/filtering') ? 'active' : ''}`}>Tablo Oluşturma / Filtreleme</Link></li>
          {userRole === 'admin' && (
            <li><Link to="/users" className={`nav-item ${isActive('/users') ? 'active' : ''}`}>Kullanıcı Yönetimi</Link></li>
          )}
        </ul>
      </div>

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
