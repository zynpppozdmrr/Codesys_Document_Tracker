// src/components/Auth/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // useNavigate hook'unu import ediyoruz
import './Auth.css';

// onLoginSuccess prop'unu alacak şekilde güncelledik
function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Yönlendirme için hook

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      // Backend'iniz application/x-www-form-urlencoded beklediği için bu formatta gönderiyoruz
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // Backend'deki /api/auth/login endpoint'ine POST isteği gönder
      // `http://localhost:5000` sizin Flask backend'inizin çalıştığı adres olmalı
      const response = await axios.post('http://localhost:5000/api/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.success) {
        localStorage.setItem('jwt_token', response.data.token);
        alert('Giriş başarılı!');
        onLoginSuccess(); // App.js'teki setLoggedIn(true) fonksiyonunu çağır
        navigate('/dashboard'); // Dashboard sayfasına yönlendir
      } else {
        setError(response.data.message || 'Giriş başarısız oldu.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Sunucuya bağlanılamadı veya bilinmeyen bir hata oluştu. Lütfen backend'in çalıştığından emin olun.");
      }
      console.error('Giriş Hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Giriş Yap</h2>
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