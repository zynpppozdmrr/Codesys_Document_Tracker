// src/components/Layout/Layout.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

function Layout({ children, onLogout, userRole, isTokenExpired, username = '' }) {
  const navigate = useNavigate();

  const handleAuthButton = () => {
    if (isTokenExpired) {
      // oturum geçersiz: token'ı temizle ve login'e git
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_role');
      navigate('/login');
    } else {
      // oturum açık: çıkış yap
      onLogout?.();
    }
  };

  return (
    <div className="layout-container">
      {/* Sidebar’a isTokenExpired veriyoruz ki kullanıcı kartı expire olunca gizlensin */}
      <Sidebar userRole={userRole} username={username} isTokenExpired={isTokenExpired} />

      <div className="main-content-wrapper">
        <header className="app-header">
          <h1>Dokümantasyon ve Versiyon Takip Sistemi</h1>
          <div className="header-right">
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
