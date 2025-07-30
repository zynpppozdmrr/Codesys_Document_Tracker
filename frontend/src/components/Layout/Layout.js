// src/components/Layout/Layout.js
import React from 'react';
import Sidebar from './Sidebar'; // Sidebar bileşenini import ediyoruz
import './Layout.css'; // Stil dosyası

function Layout({ children, onLogout }) {
  return (
    <div className="layout-container">
      <Sidebar /> {/* Yan menü */}
      <div className="main-content-wrapper">
        <header className="app-header"> {/* Uygulama başlığı */}
          <h1>CODESYS Dokümantasyon Takip Sistemi</h1>
          {onLogout && ( // Logout butonu prop olarak gelirse göster
            <button onClick={onLogout} className="logout-button">
              Çıkış Yap
            </button>
          )}
        </header>
        <main className="app-main-content">
          {children} {/* Rotalara göre değişecek içerik */}
        </main>
      </div>
    </div>
  );
}

export default Layout;