// src/components/Layout/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

function Layout({ children, onLogout, userRole }) { // userRole prop'unu alıyoruz
  return (
    <div className="layout-container">
      <Sidebar userRole={userRole} /> {/* userRole prop'unu Sidebar'a geçiyoruz */}
      <div className="main-content-wrapper">
        <header className="app-header">
          <h1>CODESYS Dokümantasyon Takip Sistemi</h1>
          {onLogout && (
            <button onClick={onLogout} className="logout-button">
              Çıkış Yap
            </button>
          )}
        </header>
        <main className="app-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;