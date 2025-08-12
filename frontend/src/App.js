// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Layout from './components/Layout/Layout';
import XmlFiles from './components/XmlFiles/XmlFiles';
import CompareDiffs from './components/CompareDiffs/CompareDiffs';
import DiffReportsList from './components/DiffReports/DiffReportsList/DiffReportsList';
import AllNotesTable from './components/Notes/AllNotesTable';
import UserManagement from './components/UserManagement/UserManagement';
import XmlFileDetails from './components/XmlFiles/XmlFileDetails';
import FilteringPage from './components/Filtering/FilteringPage';
import CompareExcel from './components/CompareExcel/CompareExcel';
import XMLMergePage from './components/XMLMergePage/XMLMergePage';
import ProjectGlossaryPage from './components/Glossary/ProjectGlossaryPage';

import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ---- helpers
const isAuthenticated = () => !!localStorage.getItem('jwt_token');

const getTokenPayload = () => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return null;
  try {
    const [, payloadBase64] = token.split('.');
    return JSON.parse(atob(payloadBase64));
  } catch {
    return null;
  }
};

const calcTokenExpired = () => {
  const payload = getTokenPayload();
  if (!payload?.exp) return !isAuthenticated();
  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp;
};

const getUsernameFromToken = () => {
  const payload = getTokenPayload();
  return payload?.sub || payload?.identity || payload?.username || '';
};

// ---- app
function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role'));
  const [username, setUsername] = useState(getUsernameFromToken());
  const [tokenExpired, setTokenExpired] = useState(calcTokenExpired());

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    setUserRole(localStorage.getItem('user_role'));
    setUsername(getUsernameFromToken());
    setTokenExpired(calcTokenExpired()); // girişte yenile
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    setLoggedIn(false);
    setUserRole(null);
    setUsername('');
    setTokenExpired(true); // logout sonrası direkt giriş yap göster
  };

  // giriş/çıkış olduğunda üst bilgileri tazele
  useEffect(() => {
    setUserRole(localStorage.getItem('user_role'));
    setUsername(getUsernameFromToken());
    setTokenExpired(calcTokenExpired());
  }, [loggedIn]);

  // 401 yakalayınca expired kabul et
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          setTokenExpired(true);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // her 10 sn’de bir ve sekme odağa geldiğinde tekrar hesapla + storage senkronu
  useEffect(() => {
    const tick = () => setTokenExpired(calcTokenExpired());
    const iv = setInterval(tick, 10000);
    const onVis = () => document.visibilityState === 'visible' && tick();
    window.addEventListener('visibilitychange', onVis);

    const onStorage = (e) => {
      if (e.key === 'jwt_token' || e.key === 'user_role') {
        setTokenExpired(calcTokenExpired());
        setUsername(getUsernameFromToken());
        setUserRole(localStorage.getItem('user_role'));
        setLoggedIn(isAuthenticated());
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(iv);
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const PrivateRoute = ({ children, requiredRole = null }) => {
    if (!isAuthenticated()) return <Navigate to="/login" />;
    if (requiredRole && userRole !== requiredRole) return <Navigate to="/dashboard" />;
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            (!loggedIn || tokenExpired)   // ⬅️ süresi dolmuşsa login sayfasını göster
              ? <Login onLoginSuccess={handleLoginSuccess} />
              : <Navigate to="/dashboard" />
          }
        />

        <Route
          path="*"
          element={
            <Layout
              onLogout={handleLogout}
              userRole={userRole}
              isTokenExpired={tokenExpired}   // ⬅️ buton ve sidebar için canlı prop
              username={username}
            >
              <Routes>
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/glossary" element={<PrivateRoute><ProjectGlossaryPage /></PrivateRoute>} />
                <Route path="/xml-files" element={<PrivateRoute><XmlFiles /></PrivateRoute>} />
                <Route path="/xml-files/:fileId" element={<PrivateRoute><XmlFileDetails /></PrivateRoute>} />
                <Route path="/compare-diffs" element={<PrivateRoute><CompareDiffs /></PrivateRoute>} />
                <Route path="/diff-reports" element={<PrivateRoute><DiffReportsList /></PrivateRoute>} />
                <Route path="/notes-relations" element={<PrivateRoute><AllNotesTable /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute requiredRole="admin"><UserManagement /></PrivateRoute>} />
                <Route path="/filtering" element={<PrivateRoute><FilteringPage /></PrivateRoute>} />
                <Route path="/compare-excel" element={<PrivateRoute><CompareExcel /></PrivateRoute>} />
                <Route path="/xml-merge" element={<PrivateRoute><XMLMergePage /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>

      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
    </Router>
  );
}

export default App;
