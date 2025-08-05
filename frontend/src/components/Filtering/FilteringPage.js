// src/components/Filtering/FilteringPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import './FilteringPage.css';

const FilteringPage = () => {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [keywords, setKeywords] = useState([{ id: 1, value: '' }]);
  const [filterResults, setFilterResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  useEffect(() => {
    const fetchXmlFiles = async () => {
      setLoading(true);
      setError('');
      try {
        const authHeaders = getAuthHeaders();
        // Token yoksa işlemi durdur
        if (!authHeaders.headers || !authHeaders.headers.Authorization) {
          setError('Yetkilendirme token\'ı bulunamadı. Lütfen giriş yapın.');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/xmlfiles', authHeaders);
        if (response.data.success) {
          setXmlFiles(response.data.files);
          if (response.data.files.length > 0) {
            setSelectedFileId(response.data.files[0].id);
          }
        } else {
          setError(response.data.message || 'XML dosyaları getirilirken bir hata oluştu.');
        }
      } catch (err) {
        setError('Oturum süreniz dolmuştur lütfen giriş yapın. ');
        console.error("XML dosyalarını çekerken hata:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchXmlFiles();
  }, [getAuthHeaders]);

  const addKeyword = () => {
    setKeywords([...keywords, { id: Date.now(), value: '' }]);
  };

  const removeKeyword = (id) => {
    setKeywords(keywords.filter(keyword => keyword.id !== id));
  };

  const handleKeywordChange = (id, value) => {
    setKeywords(keywords.map(keyword =>
      keyword.id === id ? { ...keyword, value } : keyword
    ));
  };
  
  const handleFilter = async () => {
    setLoading(true);
    setError('');
    setFilterResults(null);
    try {
      const activeKeywords = keywords.map(k => k.value).filter(v => v.trim() !== '');
      if (!selectedFileId || activeKeywords.length === 0) {
        setError('Lütfen bir dosya seçin ve en az bir anahtar kelime girin.');
        setLoading(false);
        return;
      }
      
      const authHeaders = getAuthHeaders();
      if (!authHeaders.headers || !authHeaders.headers.Authorization) {
          setError('Yetkilendirme token\'ı bulunamadı. Lütfen giriş yapın.');
          setLoading(false);
          return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/filters/filter_xml',
        {
          file_id: selectedFileId,
          keywords: activeKeywords
        },
        authHeaders
      );

      if (response.data.success) {
        setFilterResults(response.data.results);
      } else {
        setError(response.data.message || 'Filtreleme işlemi başarısız oldu.');
      }
    } catch (err) {
      setError('Filtreleme sırasında bir sunucu hatası oluştu.');
      console.error("Filtreleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.headers || !authHeaders.headers.Authorization) {
          setError('Yetkilendirme token\'ı bulunamadı. Lütfen giriş yapın.');
          setLoading(false);
          return;
      }
      
      const response = await axios.post(
        'http://localhost:5000/api/filters/export-signal-table',
        { file_id: selectedFileId },
        {
          ...authHeaders,
          responseType: 'blob'
        }
      );
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'signal_table.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      saveAs(response.data, filename);

    } catch (err) {
      setError('Excel dosyası indirilirken bir hata oluştu.');
      console.error("Excel indirme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (!filterResults || filterResults.length === 0) {
      return <p>Eşleşen sonuç bulunamadı.</p>;
    }
    const headers = Object.keys(filterResults[0]);
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filterResults.map((row, index) => (
              <tr key={index}>
                {headers.map(header => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="filtering-page-container">
      <h2>Tablo Oluşturma / Filtreleme</h2>
      
      {loading && <p>Yükleniyor...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="controls-container">
        <div className="form-group">
          <label htmlFor="file-select">Dosya Seç:</label>
          <select
            id="file-select"
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
          >
            {xmlFiles.length > 0 ? (
              xmlFiles.map(file => (
                <option key={file.id} value={file.id}>{file.file_name}</option>
              ))
            ) : (
              <option value="">Dosya bulunamadı</option>
            )}
          </select>
        </div>

        <div className="keywords-section">
          <h3>Sinyal İsimleri</h3>
          {keywords.map((keyword) => (
            <div key={keyword.id} className="keyword-input-group">
              <input
                type="text"
                value={keyword.value}
                onChange={(e) => handleKeywordChange(keyword.id, e.target.value)}
                placeholder="Sinyal ismi girin"
              />
              {keywords.length > 1 && (
                <button 
                  className="remove-btn" 
                  onClick={() => removeKeyword(keyword.id)}
                >
                  -
                </button>
              )}
            </div>
          ))}
          <button className="add-btn" onClick={addKeyword}>+ Filtre Ekle</button>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          onClick={handleFilter} 
          disabled={loading || !selectedFileId || keywords.every(k => k.value.trim() === '')}
        >
          Tablo Oluştur
        </button>
        <button 
          onClick={handleExport} 
          disabled={loading || !selectedFileId}
        >
          Excel Olarak İndir
        </button>
      </div>

      {filterResults && filterResults.length > 0 && renderTable()}
      {filterResults && filterResults.length === 0 && <p>Eşleşen sonuç bulunamadı.</p>}
    </div>
  );
};

export default FilteringPage;