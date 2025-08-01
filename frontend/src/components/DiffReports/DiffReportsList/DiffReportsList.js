// src/components/DiffReports/DiffReportsList.js
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './DiffReportsList.css';

function DiffReportsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState({ open: false, fileName: '', content: '' });

  const getAuth = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/diffs/', getAuth());
      if (res.data.success) {
        setRows(res.data.data);
      } else {
        setError(res.data.message || 'Raporlar listelenirken hata.');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleResync = async () => {
    setBusy(true);
    setError('');
    try {
      await axios.post('http://localhost:5000/api/diffs/resync', {}, getAuth());
      await fetchList();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu raporu silmek istediğine emin misin? (DB + Disk)')) return;
    setBusy(true);
    setError('');
    try {
      await axios.delete(`http://localhost:5000/api/diffs/${id}`, getAuth());
      await fetchList();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async (fileName) => {
    // Görüntülemeden önce senkronize et
    setBusy(true);
    setError('');
    try {
      await axios.post('http://localhost:5000/api/diffs/resync', {}, getAuth());
      const res = await axios.get(
        `http://localhost:5000/api/diffs/report/${encodeURIComponent(fileName)}`,
        { ...getAuth(), responseType: 'text' }
      );
      setPreview({ open: true, fileName, content: res.data });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setPreview({ open: false, fileName: '', content: '' });
    } finally {
      setBusy(false);
    }
  };

  const closePreview = () => setPreview({ open: false, fileName: '', content: '' });

  if (loading) return <div className="loading-message">Raporlar yükleniyor…</div>;

  return (
    <div className="diffreports-container">
      <h2>Karşılaştırma Raporları</h2>

      <div className="toolbar">
        <button className="btn btn-sync" disabled={busy} onClick={handleResync}>Resync</button>
        {/* Yenile butonu kaldırıldı */}
      </div>

      {error && <div className="error-message">{error}</div>}

      <table className="diffreports-table">
        <thead>
          <tr>
            <th>Dosya Adı</th>
            <th>Oluşturulma</th>
            <th style={{ width: '200px' }}>Aksiyonlar</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: 'center' }}>Kayıt bulunamadı.</td></tr>
          ) : rows.map(r => (
            <tr key={r.id}>
              <td title={r.file_path}>{r.file_name}</td>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
              <td className="actions">
                <button
                  className="btn btn-view"
                  onClick={() => handlePreview(r.file_name)}
                  disabled={busy}
                >
                  Görüntüle
                </button>
                <button
                  className="btn btn-delete"
                  onClick={() => handleDelete(r.id)}
                  disabled={busy}
                >
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {preview.open && (
        <div className="modal-backdrop" onClick={closePreview}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{preview.fileName}</h4>
              <button className="btn btn-delete" onClick={closePreview}>Kapat</button>
            </div>
            <pre className="modal-content">{preview.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiffReportsList;
