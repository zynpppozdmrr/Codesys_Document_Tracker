// src/components/Layout/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

function Layout({ children, onLogout, userRole, isTokenExpired }) {
  return (
    <div className="layout-container">
      <Sidebar userRole={userRole} />
      <div className="main-content-wrapper">
        <header className="app-header">
          <h1>Dokümantasyon ve Versiyon Takip Sistemi </h1>
          {onLogout && (
            <button
              onClick={onLogout}
              className={`logout-button ${isTokenExpired ? 'login-green' : ''}`}
            >
              {isTokenExpired ? 'Giriş Yap' : 'Çıkış Yap'}
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
