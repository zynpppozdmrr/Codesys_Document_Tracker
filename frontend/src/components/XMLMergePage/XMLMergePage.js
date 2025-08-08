import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './XMLMergePage.css';

const API_URL = "http://127.0.0.1:5000/api/xml/merge";

function XMLMergePage() {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [codeBlock, setCodeBlock] = useState('');
  const [mergedContent, setMergedContent] = useState('');
  const [mergedFileName, setMergedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchXmlFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authHeaders = getAuthHeaders();
      const response = await axios.get('http://127.0.0.1:5000/api/xmlfiles', authHeaders);
      if (response.data.success) {
        setXmlFiles(response.data.files);
        if (response.data.files.length > 0) {
          setSelectedFileId(response.data.files[0].id);
        }
      } else {
        setError(response.data.message || 'Dosyalar listelenirken bir hata oluştu.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'API çağrısı sırasında hata oluştu.');
      toast.error('API çağrısı sırasında hata oluştu.');
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
    setMergedContent('');

    try {
      const response = await axios.post(
        `${API_URL}/`,
        { file_id: selectedFileId, code_block: codeBlock },
        getAuthHeaders()
      );

      if (response.data.success) {
        setMergedContent(response.data.content);
        setMergedFileName(response.data.file_name);
        toast.success(response.data.message);
      } else {
        setError(response.data.message);
        toast.error(response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Birleştirme sırasında bir hata oluştu.';
      setError(errorMessage);
      toast.error(errorMessage);
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
      
      toast.success("Dosya başarıyla indirildi.");
    } catch (err) {
      toast.error("Dosya indirme sırasında bir hata oluştu.");
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
            {xmlFiles.map(file => (
              <option key={file.id} value={file.id}>{file.file_name}</option>
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
          {loading ? 'Birleştiriliyor...' : 'XML Birleştir'}
        </button>
        <button onClick={handleDownload} disabled={!mergedContent}>
          Birleştirilmiş Dosyayı İndir
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

    </div>
  );
}

export default XMLMergePage;