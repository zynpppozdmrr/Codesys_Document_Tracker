// src/components/Layout/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const { pathname } = useLocation();
  const isActive = (p) => pathname.startsWith(p);

  return (
    <div className="sidebar">
      <ul className="sidebar-nav">
        <li>
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/xml-files" className={`nav-item ${isActive('/xml-files') ? 'active' : ''}`}>
            XML Dosyaları
          </Link>
        </li>
        <li>
          <Link to="/compare-diffs" className={`nav-item ${isActive('/compare-diffs') ? 'active' : ''}`}>
            Farkları Karşılaştır
          </Link>
        </li>
        {/* YENİ MENÜ */}
        <li>
          <Link to="/diff-reports" className={`nav-item ${isActive('/diff-reports') ? 'active' : ''}`}>
            Karşılaştırma Raporları
          </Link>
        </li>

        <li>
          <Link to="/notes-relations" className={`nav-item ${isActive('/notes-relations') ? 'active' : ''}`}>
            Notlar & İlişkiler
          </Link>
        </li>
        <li>
          <Link to="/users" className={`nav-item ${isActive('/users') ? 'active' : ''}`}>
            Kullanıcı Yönetimi
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
