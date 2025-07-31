// src/components/XmlFiles/XmlFiles.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './XmlFiles.css';

function XmlFiles() {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  const fetchXmlFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/xmlfiles/', getAuthHeaders());
      if (response.data.success) {
        setXmlFiles(response.data.files);
      } else {
        setError(response.data.message || 'XML dosyaları çekilirken bir hata oluştu.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.status === 401) {
        setError('Yetkisiz erişim. Lütfen tekrar giriş yapın.');
      } else {
        setError('Sunucuya bağlanılamadı veya bilinmeyen bir hata oluştu.');
      }
      console.error('XML Files Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXmlFiles();
  }, [fetchXmlFiles]);

  const handleRescan = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/xmlfiles/rescan', {}, getAuthHeaders());
      if (response.data.success) {
        alert(response.data.message || 'XML dosyaları başarıyla tarandı!');
        fetchXmlFiles();
      } else {
        setError(response.data.message || 'Yeniden tarama sırasında bir hata oluştu.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.status === 401) {
        setError('Yetkisiz erişim. Lütfen tekrar giriş yapın.');
      } else {
        setError('Sunucuya bağlanılamadı veya bilinmeyen bir hata oluştu.');
      }
      console.error('Rescan Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-message">Dosyalar yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="xml-files-container">
      <h2>XML Dosyaları Yönetimi</h2>
      <button onClick={handleRescan} className="rescan-button" disabled={loading}>
        {loading ? 'Taranıyor...' : 'Dosyaları Yeniden Tara'}
      </button>
      {xmlFiles.length === 0 ? (
        <p>Henüz hiç XML dosyası bulunamadı. Lütfen "Dosyaları Yeniden Tara" butonuna basın.</p>
      ) : (
        <div className="table-responsive">
            <table className="xml-files-table">
            <thead>
                <tr>
                {/* <th>ID</th>            <-- Kaldırıldı */}
                <th>Dosya Adı</th>
                {/* <th>Versiyon</th>      <-- Kaldırıldı */}
                <th>Yükleme Tarihi</th>
                <th>Dosya Yolu</th>
                {/* <th>Mevcut Mu?</th>    <-- Kaldırıldı */}
                {/* <th>Aksiyonlar</th>    <-- Kaldırıldı */}
                </tr>
            </thead>
            <tbody>
                {xmlFiles.map((file, index) => (
                <tr key={index}> {/* ID olmadığı için index kullanıyoruz, ancak dosya yolu unique ise daha iyi olur */}
                    {/* <td>{file.id}</td> <-- Kaldırıldı */}
                    <td>{file.file_name}</td>
                    {/* <td>{file.version}</td> <-- Kaldırıldı */}
                    <td>{new Date(file.upload_date).toLocaleDateString()}</td>
                    <td>{file.file_path}</td>
                    {/* <td>{file.exists ? 'Evet' : 'Hayır'}</td> <-- Kaldırıldı */}
                    {/* <td>
                        <button className="action-button view">Görüntüle</button>
                        <button className="action-button compare">Karşılaştır</button>
                    </td> <-- Kaldırıldı */}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}
    </div>
  );
}

export default XmlFiles;