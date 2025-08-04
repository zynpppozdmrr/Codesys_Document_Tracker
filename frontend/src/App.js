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
import UserManagement from './components/UserManagement/UserManagement'; // UserManagement bileşenini import edin

const isAuthenticated = () => !!localStorage.getItem('jwt_token');

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role')); // userRole state'ini ekle

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
    // Sayfa yüklendiğinde ve loggedIn değiştiğinde rolü güncelle
    setUserRole(localStorage.getItem('user_role'));
  }, [loggedIn]);

  const PrivateRoute = ({ children, requiredRole = null }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" />;
    }
    // Eğer bir rol gereksinimi varsa ve kullanıcı bu role sahip değilse, dashboard'a yönlendir
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
            <Layout onLogout={handleLogout} userRole={userRole}>
              <Routes>
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/xml-files" element={<PrivateRoute><XmlFiles /></PrivateRoute>} />
                <Route path="/compare-diffs" element={<PrivateRoute><CompareDiffs /></PrivateRoute>} />
                <Route path="/diff-reports" element={<PrivateRoute><DiffReportsList /></PrivateRoute>} />
                <Route path="/notes-relations" element={<PrivateRoute><AllNotesTable /></PrivateRoute>} />
                {/* UserManagement sayfası sadece adminler için */}
                <Route path="/users" element={<PrivateRoute requiredRole="admin"><UserManagement /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
