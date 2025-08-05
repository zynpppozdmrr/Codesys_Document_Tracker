// src/components/UserManagement/UserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const getAuthHeader = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // useCallback kullanarak fetchUsers fonksiyonunun gereksiz yere yeniden oluşturulmasını engelliyoruz
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/users/', getAuthHeader());
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError(response.data.message || 'Kullanıcılar getirilemedi.');
      }
    } catch (err) {
      console.error('Kullanıcıları getirme hatası:', err);
      setError("Oturum süreniz dolmuştur lütfen giriş yapın.");
    } finally {
      setLoading(false);
    }
  }, []); // Bağımlılık dizisi boş olduğu için bu fonksiyon sadece bir kez oluşturulur

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // fetchUsers fonksiyonunu bağımlılık olarak ekledik

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!newUserUsername || !newUserPassword) {
      setError('Kullanıcı adı ve şifre boş bırakılamaz.');
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', newUserUsername);
      formData.append('password', newUserPassword);
      formData.append('role', newUserRole);

      const response = await axios.post('http://localhost:5000/api/users/addUser', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeader().headers
        }
      });

      if (response.data.success) {
        alert('Kullanıcı başarıyla eklendi!');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserRole('user');
        fetchUsers();
      } else {
        setError(response.data.message || 'Kullanıcı eklenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Kullanıcı ekleme hatası:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Kullanıcı eklenirken bir hata oluştu.");
      }
    }
  };

  const handleDeleteUser = async (usernameToDelete) => {
    setError('');
    if (!deletePassword) {
      alert('Kullanıcıyı silmek için kendi şifrenizi girmeniz gerekmektedir.');
      return;
    }

    if (!window.confirm(`'${usernameToDelete}' kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('password', deletePassword);

      const response = await axios.delete(`http://localhost:5000/api/users/${usernameToDelete}`, {
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeader().headers
        }
      });

      if (response.data.success) {
        alert('Kullanıcı başarıyla silindi!');
        setDeletePassword('');
        fetchUsers();
      } else {
        setError(response.data.message || 'Kullanıcı silinirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Kullanıcı silme hatası:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Kullanıcı silinirken bir hata oluştu.");
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPassword('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingUser) return;

    try {
      const formData = new URLSearchParams();
      if (editPassword) {
        formData.append('password', editPassword);
      }
      if (editRole) {
        formData.append('role', editRole);
      }

      const response = await axios.put(`http://localhost:5000/api/users/${editingUser.username}`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getAuthHeader().headers
        }
      });

      if (response.data.success) {
        alert('Kullanıcı başarıyla güncellendi!');
        setEditingUser(null);
        setEditPassword('');
        setEditRole('');
        fetchUsers();
      } else {
        setError(response.data.message || 'Kullanıcı güncellenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Kullanıcı güncelleme hatası:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Kullanıcı güncellenirken bir hata oluştu.");
      }
    }
  };

  if (loading) {
    return <div>Kullanıcılar yükleniyor...</div>;
  }

  return (
    <div className="user-management-container">
      <h2>Kullanıcı Yönetimi</h2>
      {error && <p className="error-message">{error}</p>}

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
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleEditUser(user)} className="edit-button">Düzenle</button>
                    <button onClick={() => handleDeleteUser(user.username)} className="delete-button">Sil</button>
                    <input
                      type="password"
                      placeholder="Admin Şifresi"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="delete-password-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingUser && (
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