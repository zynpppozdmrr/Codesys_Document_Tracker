// src/components/UserManagement/UserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './UserManagement.css';

const getApiErrorMessage = (err, fallback = 'Bir hata oluştu.') => {
  const status = err?.response?.status;
  const raw = err?.response?.data?.message || err?.message || fallback;

  if (status === 401) return 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'Kayıt bulunamadı.';
  if (status === 409) return 'Bu kayıt ilişkili veriler içerdiği için işlem gerçekleştirilemedi.';
  return typeof raw === 'string' ? raw : fallback;
};
const isUnauthorized = (err) => err?.response?.status === 401;

// Mikrosaniyeli ISO tarihleri JS Date için normalize et
const normalizeDate = (s) => {
  if (!s) return null;
  const str = String(s);
  const withZ = str.endsWith('Z') || str.includes('+') ? str : `${str}Z`;
  // 6 haneli mikro-saniyeyi 3 haneli mili-saniyeye indir
  return new Date(withZ.replace(/\.(\d{3})(\d{0,3})Z$/, '.$1Z'));
};
const formatLocalDate = (s) => {
  const d = normalizeDate(s);
  return d && !isNaN(d.getTime()) ? d.toLocaleString('tr-TR') : '-';
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthed, setIsAuthed] = useState(true); // oturum durumu

  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');

  const [deletePassword, setDeletePassword] = useState('');

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = getAuthHeader();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setUsers([]);
        setError(msg);
        toast.error(msg);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/users/', auth);
      if (response.data.success) {
        setIsAuthed(true);
        setUsers(response.data.data);
        setError('');
      } else {
        const msg = response.data.message || 'Kullanıcılar getirilemedi.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      if (isUnauthorized(err)) setIsAuthed(false);
      const msg = getApiErrorMessage(err, 'Kullanıcılar getirilirken hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!isAuthed) {
      const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setError('');
    if (!newUserUsername || !newUserPassword) {
      const msg = 'Kullanıcı adı ve şifre boş bırakılamaz.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const auth = getAuthHeader();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setError(msg);
        toast.error(msg);
        return;
      }

      const formData = new URLSearchParams();
      formData.append('username', newUserUsername);
      formData.append('password', newUserPassword);
      formData.append('role', newUserRole);

      const response = await axios.post(
        'http://localhost:5000/api/users/addUser',
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...auth.headers } }
      );

      if (response.data.success) {
        toast.success('Kullanıcı başarıyla eklendi!');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserRole('user');
        fetchUsers();
      } else {
        const msg = response.data.message || 'Kullanıcı eklenirken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      if (isUnauthorized(err)) setIsAuthed(false);
      const msg = getApiErrorMessage(err, 'Kullanıcı eklenirken bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteUser = async (usernameToDelete) => {
    if (!isAuthed) {
      const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setError('');
    if (!deletePassword) {
      toast.error('Kullanıcıyı silmek için kendi şifrenizi girmeniz gerekmektedir.');
      return;
    }
    if (!window.confirm(`'${usernameToDelete}' kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const auth = getAuthHeader();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setError(msg);
        toast.error(msg);
        return;
      }

      const formData = new URLSearchParams();
      formData.append('password', deletePassword);

      const response = await axios.delete(`http://localhost:5000/api/users/${usernameToDelete}`, {
        data: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...auth.headers }
      });

      if (response.data.success) {
        toast.success('Kullanıcı başarıyla silindi!');
        setDeletePassword('');
        fetchUsers();
      } else {
        const msg = response.data.message || 'Kullanıcı silinirken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      if (isUnauthorized(err)) setIsAuthed(false);
      const msg = getApiErrorMessage(err, 'Kullanıcı silinirken bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPassword('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!isAuthed) {
      const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setError('');
    if (!editingUser) return;

    try {
      const auth = getAuthHeader();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setError(msg);
        toast.error(msg);
        return;
      }

      const formData = new URLSearchParams();
      if (editPassword) formData.append('password', editPassword);
      if (editRole) formData.append('role', editRole);

      const response = await axios.put(
        `http://localhost:5000/api/users/${editingUser.username}`,
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...auth.headers } }
      );

      if (response.data.success) {
        toast.success('Kullanıcı başarıyla güncellendi!');
        setEditingUser(null);
        setEditPassword('');
        setEditRole('');
        fetchUsers();
      } else {
        const msg = response.data.message || 'Kullanıcı güncellenirken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      if (isUnauthorized(err)) setIsAuthed(false);
      const msg = getApiErrorMessage(err, 'Kullanıcı güncellenirken bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    }
  };

  if (loading) {
    return <div>Kullanıcılar yükleniyor...</div>;
  }

  return (
    <div className="user-management-container">
      <h2>Kullanıcı Yönetimi</h2>
      {error && <p className="error-message">{error}</p>}

      {/* OTURUM YOKSA EKLEME ARAYÜZÜ GÖRÜNMESİN */}
      {isAuthed && (
        <div className="add-user-section">
          <h3>Yeni Kullanıcı Ekle</h3>
          <form onSubmit={handleAddUser} className="user-form">
            <div className="form-group">
              <label>Kullanıcı Adı:</label>
              <input
                type="text"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Şifre:</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Rol:</label>
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit">Kullanıcı Ekle</button>
          </form>
        </div>
      )}

      <div className="user-list-section">
        <h3>Mevcut Kullanıcılar</h3>
        {users.length === 0 ? (
          <p>Henüz kullanıcı bulunmuyor.</p>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kullanıcı Adı</th>
                <th>Rol</th>
                <th>Oluşturulma Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{formatLocalDate(user.created_at)}</td>
                  <td>
                    <button onClick={() => handleEditUser(user)} className="edit-button" disabled={!isAuthed}>
                      Düzenle
                    </button>
                    <button onClick={() => handleDeleteUser(user.username)} className="delete-button" disabled={!isAuthed}>
                      Sil
                    </button>
                    <input
                      type="password"
                      placeholder="Admin Şifresi"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="delete-password-input"
                      disabled={!isAuthed}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingUser && isAuthed && (
        <div className="edit-user-section">
          <h3>Kullanıcı Düzenle: {editingUser.username}</h3>
          <form onSubmit={handleUpdateUser} className="user-form">
            <div className="form-group">
              <label>Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın):</label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Rol:</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit">Güncelle</button>
              <button type="button" onClick={() => setEditingUser(null)} className="cancel-button">İptal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
