// src/components/XmlFiles/XmlFiles.js
import React, { useState, useEffect, useCallback } from 'react'; // useCallback'i ekledik
import axios from 'axios';
import './XmlFiles.css'; // Stil dosyası

function XmlFiles() {
  const [xmlFiles, setXmlFiles] = useState([]); // XML dosyalarını tutacak state
  const [loading, setLoading] = useState(true); // Yükleme durumu
  const [error, setError] = useState(''); // Hata mesajları

  // Helper function to get JWT token
  // Bu fonksiyon her render'da yeniden oluşturulacağı için useCallback içine almayacağız.
  // Ancak fetchXmlFiles'ın bağımlılığı olduğu için o fonksiyonda kullanılacak.
  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // XML dosyalarını backend'den çeken fonksiyonu useCallback ile sarmaladık
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
        // Opsiyonel: Token süresi dolduysa otomatik çıkış yapma
        // localStorage.removeItem('jwt_token');
        // window.location.href = '/login';
      } else {
        setError('Sunucuya bağlanılamadı veya bilinmeyen bir hata oluştu.');
      }
      console.error('XML Files Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // getAuthHeaders fonksiyonu içerisinde state/prop kullanmadığı için
          // ve her zaman aynı değeri döndüreceği için (token her değiştiğinde)
          // buraya getAuthHeaders'ı eklemek yerine boş bağımlılık bırakmak daha uygun.
          // Çünkü getAuthHeaders'ın kendisi de aslında bir bağımlılıktır ve onu useCallback içine almak
          // daha karmaşık bir döngüye yol açabilir. Bu senaryoda empty array safest.

  // Bileşen yüklendiğinde ve fetchXmlFiles değiştiğinde dosyaları çek
  useEffect(() => {
    fetchXmlFiles();
  }, [fetchXmlFiles]); // fetchXmlFiles fonksiyonuna bağımlı

  // Dosyaları yeniden tarama fonksiyonu
  const handleRescan = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/xmlfiles/rescan', {}, getAuthHeaders());
      if (response.data.success) {
        alert('XML dosyaları başarıyla tarandı!');
        fetchXmlFiles(); // Yeniden taramadan sonra listeyi güncelle
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
                <th>ID</th>
                <th>Dosya Adı</th>
                <th>Dosya Yolu</th>
                <th>Yükleme Tarihi</th>
                <th>Versiyon</th>
                <th>Mevcut Mu?</th>
                <th>Aksiyonlar</th>
                </tr>
            </thead>
            <tbody>
                {xmlFiles.map((file) => (
                <tr key={file.id}>
                    <td>{file.id}</td>
                    <td>{file.file_name}</td>
                    <td>{file.file_path}</td>
                    <td>{new Date(file.upload_date).toLocaleDateString()}</td> {/* Tarih formatı */}
                    <td>{file.version}</td>
                    <td>{file.exists ? 'Evet' : 'Hayır'}</td>
                    <td>
                    {/* Gelecekte eklenecek aksiyon butonları */}
                    <button className="action-button view">Görüntüle</button>
                    <button className="action-button compare">Karşılaştır</button>
                    </td>
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