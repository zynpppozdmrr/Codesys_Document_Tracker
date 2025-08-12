import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './XmlFileDetails.css';

const getApiErrorMessage = (err, fallback = 'Bir hata oluştu.') => {
  const status = err?.response?.status;
  const raw = err?.response?.data?.message || err?.message || fallback;

  if (status === 401) return 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'Kayıt bulunamadı.';
  if (status === 409) return 'Bu kayıt ilişkili veriler içerdiği için işlem gerçekleştirilemedi.';
  return typeof raw === 'string' ? raw : fallback;
};

// Mikro-saniye içeren ISO tarihleri JS için normalize et
const normalizeDate = (s) => {
  if (!s) return null;
  const str = String(s);
  // Z yoksa ekle, mikro-saniyeyi milisaniyeye indir (6 → 3 hane)
  const withZ = str.endsWith('Z') || str.includes('+') ? str : `${str}Z`;
  return new Date(withZ.replace(/\.(\d{3})(\d{0,3})Z$/, '.$1Z'));
};

const formatLocalDate = (s) => {
  const d = normalizeDate(s);
  return d && !isNaN(d.getTime()) ? d.toLocaleString('tr-TR') : '-';
};

const XmlFileDetails = () => {
  const { fileId } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchFileDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.headers?.Authorization || authHeaders.headers.Authorization === 'Bearer null') {
        const msg = 'Oturum süreniz dolmuştur, lütfen giriş yapın.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/xmlfiles/${fileId}`, authHeaders);
      if (response.data?.success) {
        setFileData(response.data.file);
        toast.success('Dosya detayları yüklendi.');
      } else {
        const msg = response.data?.message || 'Dosya detayları alınırken bir hata oluştu.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Sistem hatası: Dosya detayları getirilemedi.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [fileId, getAuthHeaders]);

  useEffect(() => {
    if (fileId) fetchFileDetails();
  }, [fileId, fetchFileDetails]);

  if (loading) {
    return <div className="xml-file-details-container">Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="xml-file-details-container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="xml-file-details-container">
        <p>Dosya bulunamadı.</p>
      </div>
    );
  }

  const diffs = Array.isArray(fileData.diffs) ? fileData.diffs : [];

  return (
    <div className="xml-file-details-container">
      <h2>Dosya Detayları: {fileData.file_name}</h2>

      <div className="file-info">
        <p><strong>ID:</strong> {fileData.id}</p>
        <p><strong>Yükleme Tarihi:</strong> {formatLocalDate(fileData.upload_date)}</p>
      </div>

      <div className="related-diffs">
        <h3>İlişkili Farklar (Diffs)</h3>
        {diffs.length === 0 ? (
          <p>Bu dosyayla ilişkili fark bulunmuyor.</p>
        ) : (
          diffs.map(diff => {
            const notes = Array.isArray(diff.notes) ? diff.notes : [];
            return (
              <div key={diff.id} className="diff-item">
                <h4>Fark ID: {diff.id}</h4>
                <p><strong>Eski Dosya:</strong> {diff.file_old_name || 'Bilinmiyor'}</p>
                <p><strong>Yeni Dosya:</strong> {diff.file_new_name || 'Bilinmiyor'}</p>
                <p><strong>Karşılaştırma Tarihi:</strong> {formatLocalDate(diff.timestamp || diff.created_at)}</p>
                <p><strong>Fark İçeriği:</strong></p>
                <pre>{diff.diff_content}</pre>

                <div className="diff-notes">
                  <h5>Notlar</h5>
                  {notes.length === 0 ? (
                    <p>Bu fark için not bulunmuyor.</p>
                  ) : (
                    <ul>
                      {notes.map(note => (
                        <li key={note.id}>
                          <p>{note.content}</p>
                          <p className="note-meta">
                            - {note.username} ({formatLocalDate(note.timestamp || note.created_at)})
                          </p>

                          {Array.isArray(note.relations) && note.relations.length > 0 && (
                            <div className="note-relations">
                              <h6>İlişkiler:</h6>
                              <ul>
                                {note.relations.map(rel => (
                                  <li key={rel.id} className="relation-item-details">
                                    <strong>{rel.relation_type}:</strong> {rel.relation_value}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default XmlFileDetails;
