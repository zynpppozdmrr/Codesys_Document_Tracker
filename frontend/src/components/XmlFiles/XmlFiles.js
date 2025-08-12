import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './XmlFiles.css';

// Ortak hata mesajı yardımcı fonksiyonu
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

// Mikrosaniye içeren ISO tarihleri JS için normalize et
const normalizeDate = (s) => {
  if (!s) return null;
  const str = String(s);
  const withZ = str.endsWith('Z') || str.includes('+') ? str : `${str}Z`;
  return new Date(withZ.replace(/\.(\d{3})(\d{0,3})Z$/, '.$1Z'));
};
const formatLocalDate = (s) => {
  const d = normalizeDate(s);
  return d && !isNaN(d.getTime()) ? d.toLocaleString('tr-TR') : '-';
};

function XmlFiles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isAuthed, setIsAuthed] = useState(true); // <-- oturum durumu
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
      const auth = getAuth();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setRows([]);
        setError(msg);
        toast.error(msg);
        return;
      }

      const res = await axios.get('http://localhost:5000/api/xmlfiles/', auth);
      if (res.data?.success) {
        setIsAuthed(true);
        setRows(res.data.files || []);
      } else {
        const msg = res.data?.message || 'XML dosyaları listelenirken hata.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e) {
      if (isUnauthorized(e)) {
        setIsAuthed(false);
      }
      const msg = getApiErrorMessage(e, 'XML dosyaları listelenirken hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ---------- Sürükle-bırak ----------
  const onDragOver = (e) => {
    if (!isAuthed) return;
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.add('drag-over');
  };
  const onDragLeave = (e) => {
    if (!isAuthed) return;
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.remove('drag-over');
  };
  const onDrop = async (e) => {
    if (!isAuthed) return;
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
      toast.error('Lütfen .xml dosyaları sürükleyin.');
      return;
    }
    await uploadFiles(files);
  };

  const onFileInputChange = async (e) => {
    if (!isAuthed) return;
    const files = Array.from(e.target.files || []).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
      toast.error('Lütfen .xml dosyaları seçin.');
      return;
    }
    await uploadFiles(files);
    e.target.value = '';
  };

  const uploadFiles = async (files) => {
    if (!isAuthed) {
      const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const auth = getAuth();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setError(msg);
        toast.error(msg);
        return;
      }

      const fd = new FormData();
      files.forEach((f) => fd.append('files', f, f.name));

      await axios.post('http://localhost:5000/api/xmlfiles/upload', fd, {
        ...auth,
        headers: { ...auth.headers, 'Content-Type': 'multipart/form-data' }
      });

      toast.success('XML dosyaları başarıyla yüklendi.');
      await fetchList();
    } catch (e) {
      if (isUnauthorized(e)) setIsAuthed(false);
      const msg = getApiErrorMessage(e, 'Dosya yükleme sırasında bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (id) => {
    if (!isAuthed) {
      const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!window.confirm('Bu XML dosyasını silmek istiyor musunuz? (Disk + DB + bağlı raporlar)')) return;
    setBusy(true);
    setError('');
    try {
      const auth = getAuth();
      if (!auth.headers?.Authorization || auth.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setIsAuthed(false);
        setError(msg);
        toast.error(msg);
        return;
      }

      const res = await axios.delete(`http://localhost:5000/api/xmlfiles/${id}`, auth);
      if (res.data?.success) {
        toast.success('XML dosyası başarıyla silindi.');
        await fetchList();
      } else {
        const msg = res.data?.message || 'Dosya silinirken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e) {
      if (isUnauthorized(e)) setIsAuthed(false);
      const msg = getApiErrorMessage(e, 'Silme işlemi sırasında bir hata oluştu.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Detay sayfasına yönlendir
  const goToDetails = (id) => {
    navigate(`/xml-files/${id}`);
  };

  if (loading) return <div className="loading-message">XML dosyaları yükleniyor…</div>;

  return (
    <div className="xmlfiles-container">
      <h2>Proje / Dosya Yönetimi</h2>

      {/* Oturum düşmüşse yükleme alanını hiç gösterme */}
      {isAuthed && (
        <div
          ref={dropRef}
          className="dropzone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <p><strong>Sürükle-Bırak:</strong> XML dosyalarını buraya bırakın</p>
          <p>veya</p>
          <label className="btn btn-upload">
            Dosya Seç
            <input type="file" accept=".xml" multiple onChange={onFileInputChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {error && <div className="error-message" style={{ marginTop: 12 }}>{error}</div>}

      <table className="xmlfiles-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Dosya Adı</th>
            <th>Yükleme Tarihi</th>
            <th>Dosya Yolu</th>
            <th style={{ width: 180 }}>Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center' }}>Kayıt bulunamadı.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.file_name}</td>
              <td>{formatLocalDate(r.upload_date)}</td>
              <td>{r.file_path}</td>
              <td>
                <button className="btn btn-details" onClick={() => goToDetails(r.id)} disabled={busy}>Detay</button>
                <button className="btn btn-delete" onClick={() => deleteRow(r.id)} disabled={busy || !isAuthed}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default XmlFiles;
