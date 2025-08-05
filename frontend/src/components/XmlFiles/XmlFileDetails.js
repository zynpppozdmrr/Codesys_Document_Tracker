import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './XmlFileDetails.css';

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
    try {
      const response = await axios.get(`http://localhost:5000/api/xmlfiles/${fileId}`, getAuthHeaders());
      if (response.data.success) {
        setFileData(response.data.file);
      } else {
        setError(response.data.message || 'Dosya detayları alınırken bir hata oluştu.');
      }
    } catch (err) {
      setError('Sistem hatası: Dosya detayları getirilemedi.');
      console.error('Dosya detayları çekerken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [fileId, getAuthHeaders]);

  useEffect(() => {
    if (fileId) {
      fetchFileDetails();
    }
  }, [fileId, fetchFileDetails]);

  if (loading) {
    return <div className="xml-file-details-container">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="xml-file-details-container"><p className="error">{error}</p></div>;
  }

  if (!fileData) {
    return <div className="xml-file-details-container"><p>Dosya bulunamadı.</p></div>;
  }

  return (
    <div className="xml-file-details-container">
      <h2>Dosya Detayları: {fileData.file_name}</h2>
      <div className="file-info">
        <p><strong>ID:</strong> {fileData.id}</p>
        <p><strong>Yükleme Tarihi:</strong> {new Date(fileData.upload_date).toLocaleString()}</p>
      </div>

      <div className="related-diffs">
        <h3>İlişkili Farklar (Diffs)</h3>
        {fileData.diffs.length === 0 ? (
          <p>Bu dosyayla ilişkili fark bulunmuyor.</p>
        ) : (
          fileData.diffs.map(diff => (
            <div key={diff.id} className="diff-item">
              <h4>Fark ID: {diff.id}</h4>
              <p><strong>Eski Dosya:</strong> {diff.file_old_name || 'Bilinmiyor'}</p>
              <p><strong>Yeni Dosya:</strong> {diff.file_new_name || 'Bilinmiyor'}</p>
              <p><strong>Karşılaştırma Tarihi:</strong> {new Date(diff.timestamp).toLocaleString()}</p>
              <p><strong>Fark İçeriği:</strong> <pre>{diff.diff_content}</pre></p>

              {/* Diff'e bağlı notları göster */}
              <div className="diff-notes">
                <h5>Notlar</h5>
                {diff.notes.length === 0 ? (
                  <p>Bu fark için not bulunmuyor.</p>
                ) : (
                  <ul>
                    {diff.notes.map(note => (
                      <li key={note.id}>
                        <p>{note.content}</p>
                        <p className="note-meta">
                          - {note.username} ({new Date(note.timestamp).toLocaleString()})
                        </p>
                        {/* Nota bağlı ilişkileri göster */}
                        {note.relations && note.relations.length > 0 && (
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
          ))
        )}
      </div>
    </div>
  );
};

export default XmlFileDetails;
