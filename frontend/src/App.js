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

const isAuthenticated = () => !!localStorage.getItem('jwt_token');

const isTokenExpired = () => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return true;

  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    const exp = payload.exp;
    if (!exp) return false;

    const now = Math.floor(Date.now() / 1000);
    return now > exp;
  } catch (e) {
    return true;
  }
};

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role'));

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    setUserRole(localStorage.getItem('user_role'));
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    setLoggedIn(false);
    setUserRole(null);
  };

  useEffect(() => {
    setUserRole(localStorage.getItem('user_role'));
  }, [loggedIn]);

  const PrivateRoute = ({ children, requiredRole = null }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" />;
    }
    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/dashboard" />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={loggedIn ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route
          path="*"
          element={
            <Layout
              onLogout={handleLogout}
              userRole={userRole}
              isTokenExpired={isTokenExpired()} // EKLENDİ
            >
              <Routes>
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/xml-files" element={<PrivateRoute><XmlFiles /></PrivateRoute>} />
                <Route path="/xml-files/:fileId" element={<PrivateRoute><XmlFileDetails /></PrivateRoute>} />
                <Route path="/compare-diffs" element={<PrivateRoute><CompareDiffs /></PrivateRoute>} />
                <Route path="/diff-reports" element={<PrivateRoute><DiffReportsList /></PrivateRoute>} />
                <Route path="/notes-relations" element={<PrivateRoute><AllNotesTable /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute requiredRole="admin"><UserManagement /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/filtering" element={<PrivateRoute><FilteringPage /></PrivateRoute>} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
