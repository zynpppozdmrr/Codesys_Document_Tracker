// src/components/Auth/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Auth.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // public klasöründen güvenli yol
  const logoSrc = `${process.env.PUBLIC_URL || ''}/bozankaya-logo.png`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (res.data?.success) {
        if (res.data.token) localStorage.setItem('jwt_token', res.data.token);
        if (res.data.role) localStorage.setItem('user_role', res.data.role);
        toast.success('Giriş başarılı!');
        onLoginSuccess?.();
        navigate('/dashboard');
      } else {
        const msg = res.data?.message || 'Giriş başarısız oldu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message;
      let msg = apiMsg || 'Giriş sırasında bir hata oluştu.';
      if (status === 401) msg = 'Kullanıcı adı veya şifre hatalı.';
      if (status === 403) msg = 'Bu işlem için yetkiniz yok.';
      setError(msg);
      toast.error(msg);
      console.error('Giriş Hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* LOGO */}
      <div className="login-brand">
        <img
          src={logoSrc}
          alt="Bozankaya Teknoloji"
          className="login-logo"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      {/* Estetik başlık */}
      <h2 className="login-title">
        Dokümantasyon ve <span className="accent">Versiyon Takip Sistemi</span>
      </h2>
      <p className="login-subtitle">Lütfen hesabınızla giriş yapın</p>

      <form onSubmit={handleSubmit} className="login-form">
        {error && <p className="error-message">{error}</p>}

        <div className="form-group">
          <label htmlFor="username">Kullanıcı Adı:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Şifre:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

export default Login;
