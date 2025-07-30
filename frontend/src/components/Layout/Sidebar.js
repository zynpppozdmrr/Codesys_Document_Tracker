// src/components/Layout/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom'; // Link bileşeni ile sayfa yenilemeden gezinme
import './Sidebar.css'; // Stil dosyası

function Sidebar() {
  return (
    <div className="sidebar">
      <ul className="sidebar-nav">
        <li>
          <Link to="/dashboard" className="nav-item">
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/xml-files" className="nav-item">
            XML Dosyaları
          </Link>
        </li>
        <li>
          <Link to="/compare-diffs" className="nav-item">
            Farkları Karşılaştır
          </Link>
        </li>
        <li>
          <Link to="/notes-relations" className="nav-item">
            Notlar & İlişkiler
          </Link>
        </li>
        <li>
          <Link to="/users" className="nav-item">
            Kullanıcı Yönetimi
          </Link>
        </li>
        {/* Gelecekte eklenecek diğer menü öğeleri */}
      </ul>
    </div>
  );
}

export default Sidebar;