
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './XmlFiles.css';

function XmlFiles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dropRef = useRef(null);
  const navigate = useNavigate();

  const getAuth = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/xmlfiles/', getAuth());
      if (res.data.success) {
        setRows(res.data.files);
      } else {
        setError(res.data.message || 'XML dosyaları listelenirken hata.');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { fetchList(); }, [fetchList]);


  // ---------- Sürükle-bırak ----------
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.add('drag-over');
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.remove('drag-over');
  };
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
      alert('Lütfen .xml dosyaları sürükleyin.');
      return;
    }
    await uploadFiles(files);
  };

  const onFileInputChange = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
      alert('Lütfen .xml dosyaları seçin.');
      return;
    }
    await uploadFiles(files);
    e.target.value = '';
  };

  const uploadFiles = async (files) => {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f, f.name));
      await axios.post('http://localhost:5000/api/xmlfiles/upload', fd, {
        ...getAuth(),
        headers: { Authorization: getAuth().headers.Authorization, 'Content-Type': 'multipart/form-data' }
      });
      await fetchList();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Bu XML dosyasını silmek istiyor musunuz? (Disk + DB + bağlı raporlar)')) return;
    setBusy(true);
    setError('');
    try {
      await axios.delete(`http://localhost:5000/api/xmlfiles/${id}`, getAuth());
      await fetchList();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  // Yeni fonksiyon: Detay sayfasına yönlendir
  const goToDetails = (id) => {
    navigate(`/xml-files/${id}`);
  };

  if (loading) return <div className="loading-message">XML dosyaları yükleniyor…</div>;

  return (
    <div className="xmlfiles-container">
      <h2>Proje / Dosya Yönetimi</h2>

      <div
        ref={dropRef}
        className="dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <p><strong>Sürükle‑Bırak:</strong> XML dosyalarını buraya bırakın</p>
        <p>veya</p>
        <label className="btn btn-upload">
          Dosya Seç
          <input type="file" accept=".xml" multiple onChange={onFileInputChange} style={{ display: 'none' }} />
        </label>

      </div>

      {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}

      <table className="xmlfiles-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>ID</th> {/* ID sütununu ekleyelim */}
            <th>Dosya Adı</th>
            <th>Yükleme Tarihi</th>
            <th>Dosya Yolu</th>
            <th style={{ width: 180 }}>Aksiyon</th> {/* Aksiyon sütununu genişletelim */}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center' }}>Kayıt bulunamadı.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.file_name}</td>
              <td>{r.upload_date ? new Date(r.upload_date).toLocaleDateString() : '-'}</td>
              <td>{r.file_path}</td>
              <td>
                <button className="btn btn-details" onClick={() => goToDetails(r.id)} disabled={busy}>Detay</button>
                <button className="btn btn-delete" onClick={() => deleteRow(r.id)} disabled={busy}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default XmlFiles;
