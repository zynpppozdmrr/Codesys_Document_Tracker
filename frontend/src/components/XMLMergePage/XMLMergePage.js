import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './XMLMergePage.css';

const API_URL = 'http://127.0.0.1:5000/api/xml/merge';

// Hata mesajı yardımcı
const getApiErrorMessage = (err, fallback = 'Bir hata oluştu.') => {
  const status = err?.response?.status;
  const raw = err?.response?.data?.message || err?.message || fallback;

  if (status === 401) return 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'Kayıt bulunamadı.';
  return typeof raw === 'string' ? raw : fallback;
};

function XMLMergePage() {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [codeBlock, setCodeBlock] = useState('');
  const [mergedContent, setMergedContent] = useState('');
  const [mergedFileName, setMergedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // ✅ yeni

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  }, []);

  const fetchXmlFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const authHeaders = getAuthHeaders();
      const response = await axios.get('http://127.0.0.1:5000/api/xmlfiles', authHeaders);
      if (response.data.success) {
        setXmlFiles(response.data.files);
        if (response.data.files.length > 0) {
          setSelectedFileId(response.data.files[0].id);
        }
      } else {
        const msg = response.data.message || 'Dosyalar listelenirken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'API çağrısı sırasında hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchXmlFiles();
  }, [fetchXmlFiles]);

  const handleMerge = async () => {
    if (!selectedFileId || !codeBlock) {
      toast.error('Lütfen bir dosya seçin ve kod bloğunu girin.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');          // ✅ önceki başarı mesajını temizle
    setMergedContent('');
    setMergedFileName('');

    try {
      const response = await axios.post(
        `${API_URL}/`,
        { file_id: selectedFileId, code_block: codeBlock },
        getAuthHeaders()
      );

      if (response.data.success) {
        setMergedContent(response.data.content);
        setMergedFileName(response.data.file_name);
        const msg = response.data.message || 'XML birleştirme başarılı. Dosya birleştirilmiştir.';
        setSuccessMsg(msg);      // ✅ ekranda yeşil mesaj
        toast.success(msg);      // ✅ toast bildirim
      } else {
        const msg = response.data.message || 'Birleştirme sırasında bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Birleştirme sırasında bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!mergedContent) {
      toast.error('Önce birleştirme işlemini yapmalısınız.');
      return;
    }

    try {
      const authHeaders = getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/download`,
        { content: mergedContent, file_name: mergedFileName },
        { ...authHeaders, responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mergedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Dosya başarıyla indirildi.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Dosya indirme sırasında bir hata oluştu.');
      toast.error(msg);
    }
  };

  if (loading) {
    return <div className="loading-message">Yükleniyor...</div>;
  }

  return (
    <div className="xml-merge-container">
      <h2>XML Dosyasına Kod Ekleme</h2>
      <p className="description">
        Mevcut bir XML dosyasına yeni bir kod bloğu ekleyip birleştirilmiş dosyayı indirebilirsiniz.
      </p>

      <div className="controls-area">
        <div className="form-group">
          <label htmlFor="file-select">Hedef Dosya:</label>
          <select
            id="file-select"
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            disabled={loading}
          >
            <option value="">Dosya Seçin</option>
            {xmlFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.file_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="code-block">Eklenecek Kod Bloğu (XML):</label>
          <textarea
            id="code-block"
            rows="10"
            placeholder="Yeni kod bloğunu buraya yapıştırın..."
            value={codeBlock}
            onChange={(e) => setCodeBlock(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={handleMerge} disabled={loading || !selectedFileId || !codeBlock}>
          {loading ? 'Birleştiriliyor...' : 'Birleştir'}
        </button>
        <button onClick={handleDownload} disabled={!mergedContent}>
          Birleştirilmiş Dosyayı İndir
        </button>
      </div>

      {/* ✅ başarılı işlem mesajı */}
      {successMsg && <p className="success-message" style={{ color: '#16a34a', marginTop: 10 }}>{successMsg}</p>}

      {/* hata mesajı */}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default XMLMergePage;
