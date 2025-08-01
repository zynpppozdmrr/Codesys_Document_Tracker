import React, { useEffect, useState, useCallback } from 'react'; // Import useCallback
import axios from 'axios';
import './AllNotesTable.css';
// import './NoteSection.js'; // This line is likely unnecessary and can be removed.

const AllNotesTable = () => {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  const getAuthHeaders = useCallback(() => { // Wrap getAuthHeaders in useCallback as well
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []); // No dependencies for getAuthHeaders, so an empty array

  // Notları getirme fonksiyonu
  const fetchNotes = useCallback(async () => { // Wrap fetchNotes in useCallback
    try {
      const response = await axios.get('http://localhost:5000/api/notes/', getAuthHeaders());
      if (response.data.success) {
        setNotes(response.data.notes);
      } else {
        setError('Notlar alınamadı.');
      }
    } catch (err) {
      setError('Sistem hatası: Notlar getirilemedi.');
      console.error('Notları çekerken hata:', err);
    }
  }, [getAuthHeaders]); // Add getAuthHeaders as a dependency for fetchNotes

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]); // Add fetchNotes to the dependency array

  // Not silme işlemi
  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/notes/${noteId}`, getAuthHeaders());
        if (response.data.success) {
          fetchNotes();
        } else {
          setError('Not silinirken hata oluştu.');
        }
      } catch (err) {
        setError('Sistem hatası: Not silinemedi.');
        console.error('Notu silerken hata:', err);
      }
    }
  };

  // Not düzenlemeyi başlatma
  const handleEditClick = (note) => {
    setEditingNoteId(note.id);
    setEditedContent(note.content);
  };

  // Düzenlemeyi iptal etme
  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedContent('');
  };

  // Not düzenlemeyi kaydetme
  const handleSaveEdit = async (noteId) => {
    if (!editedContent.trim()) {
      setError('Not içeriği boş olamaz.');
      return;
    }
    try {
      const response = await axios.put(
        `http://localhost:5000/api/notes/${noteId}`,
        { content: editedContent },
        getAuthHeaders()
      );
      if (response.data.success) {
        setEditingNoteId(null);
        setEditedContent('');
        fetchNotes();
      } else {
        setError('Not güncellenirken hata oluştu.');
      }
    } catch (err) {
      setError('Sistem hatası: Not güncellenemedi.');
      console.error('Notu güncellerken hata:', err);
    }
  };

  return (
    <div className="notes-table-container">
      <h2>Tüm Notlar</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Dosya Adı</th>
            <th>Not İçeriği</th>
            <th>Kullanıcı</th>
            <th>Tarih</th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {notes.map(note => (
            <tr key={note.id}>
              <td>{note.xmlfile_name || 'Bilinmiyor'}</td>
              <td>
                {editingNoteId === note.id ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows="3"
                    style={{ width: '100%' }}
                  />
                ) : (
                  note.content
                )}
              </td>
              <td>{note.username}</td>
              <td>{new Date(note.timestamp).toLocaleString()}</td>
              <td>
                {editingNoteId === note.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(note.id)} className="save-button">Kaydet</button>
                    <button onClick={handleCancelEdit} className="cancel-button">İptal</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditClick(note)} className="edit-button">Düzenle</button>
                    <button onClick={() => handleDeleteNote(note.id)} className="delete-button">Sil</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllNotesTable;