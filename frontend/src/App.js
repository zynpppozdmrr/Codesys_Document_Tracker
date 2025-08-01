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

// Remove this line if NotesRelations is not used elsewhere as a separate component definition
// const NotesRelations = () => <div className="placeholder-page"><h2>Notlar ve İlişkiler Sayfası</h2><p>Burada notlar ve ilişkiler yönetilecek.</p></div>;
const Users = () => <div className="placeholder-page"><h2>Kullanıcı Yönetimi Sayfası</h2><p>Burada kullanıcılar yönetilecek (Admin yetkisi gerektirecek).</p></div>;

const isAuthenticated = () => !!localStorage.getItem('jwt_token');
const PrivateRoute = ({ children }) => (isAuthenticated() ? children : <Navigate to="/login" />);

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());

  const handleLoginSuccess = () => setLoggedIn(true);
  const handleLogout = () => { localStorage.removeItem('jwt_token'); setLoggedIn(false); };

  useEffect(() => {
    console.log("Kullanıcı giriş durumu:", loggedIn ? "Giriş Yapıldı" : "Çıkış Yapıldı");
  }, [loggedIn]);

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
            <PrivateRoute>
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/xml-files" element={<XmlFiles />} />
                  <Route path="/compare-diffs" element={<CompareDiffs />} />
                  <Route path="/diff-reports" element={<DiffReportsList />} />
                  <Route path="/notes-relations" element={<AllNotesTable />} /> {/* This is correctly pointing to AllNotesTable */}
                  <Route path="/users" element={<Users />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;