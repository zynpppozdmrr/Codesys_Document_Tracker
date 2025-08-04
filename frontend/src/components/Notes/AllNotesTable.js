import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './AllNotesTable.css';

const AllNotesTable = () => {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [noteRelationInputs, setNoteRelationInputs] = useState({});
  const [editingRelations, setEditingRelations] = useState({}); // <--- YENİ

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/notes/', getAuthHeaders());
      if (response.data.success) {
        setNotes(response.data.notes);
        const initialInputs = {};
        response.data.notes.forEach(note => {
          initialInputs[note.id] = { type: '', value: '', showForm: false };
        });
        setNoteRelationInputs(initialInputs);
      } else {
        setError('Notlar alınamadı.');
      }
    } catch (err) {
      setError('Sistem hatası: Notlar getirilemedi.');
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/notes/${noteId}`, getAuthHeaders());
        if (response.data.success) fetchNotes();
        else setError('Not silinirken hata oluştu.');
      } catch {
        setError('Sistem hatası: Not silinemedi.');
      }
    }
  };

  const handleEditClick = (note) => {
    setEditingNoteId(note.id);
    setEditedContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedContent('');
  };

  const handleSaveEdit = async (noteId) => {
    if (!editedContent.trim()) return setError('Not içeriği boş olamaz.');
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
      } else setError('Not güncellenirken hata oluştu.');
    } catch {
      setError('Sistem hatası: Not güncellenemedi.');
    }
  };

  const handleRelationInputChange = (noteId, field, value) => {
    setNoteRelationInputs(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        [field]: value
      }
    }));
  };

  const toggleAddRelationForm = (noteId) => {
    setNoteRelationInputs(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        showForm: !prev[noteId].showForm
      }
    }));
  };

  const handleAddRelation = async (noteId) => {
    const data = noteRelationInputs[noteId];
    if (!data || !data.type.trim() || !data.value.trim()) return alert('İlişki tipi ve değeri boş olamaz.');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/relations/',
        { note_id: noteId, relation_type: data.type, relation_value: data.value },
        getAuthHeaders()
      );
      if (response.data.success) {
        setNoteRelationInputs(prev => ({
          ...prev,
          [noteId]: { type: '', value: '', showForm: false }
        }));
        fetchNotes();
      } else {
        setError(response.data.message || 'İlişki eklenirken hata.');
      }
    } catch {
      setError('İlişki eklenirken sistem hatası.');
    }
  };

  const handleDeleteRelation = async (relationId) => {
    if (window.confirm('Bu ilişkiyi silmek istediğinizden emin misiniz?')) {
      try {
        const response = await axios.delete(
          `http://localhost:5000/api/relations/${relationId}`,
          getAuthHeaders()
        );
        if (response.data.success) fetchNotes();
        else setError('İlişki silinirken hata oluştu.');
      } catch {
        setError('İlişki silinirken sistem hatası.');
      }
    }
  };

  const handleEditRelation = (relId, type, value) => {
    setEditingRelations(prev => ({
      ...prev,
      [relId]: { type, value }
    }));
  };

  const handleRelationChange = (relId, field, value) => {
    setEditingRelations(prev => ({
      ...prev,
      [relId]: { ...prev[relId], [field]: value }
    }));
  };

  const handleSaveRelation = async (relId) => {
    const relationData = editingRelations[relId];
    if (!relationData || !relationData.type.trim() || !relationData.value.trim()) {
      alert('İlişki tipi ve değeri boş olamaz.');
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:5000/api/relations/${relId}`,
        {
          relation_type: relationData.type,
          relation_value: relationData.value
        },
        getAuthHeaders()
      );
      if (response.data.success) {
        const updated = { ...editingRelations };
        delete updated[relId];
        setEditingRelations(updated);
        fetchNotes();
      } else {
        setError('İlişki güncellenirken hata oluştu.');
      }
    } catch {
      setError('İlişki güncellenemedi.');
    }
  };

  const handleCancelRelationEdit = (relId) => {
    const updated = { ...editingRelations };
    delete updated[relId];
    setEditingRelations(updated);
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
            <th>İlişkiler</th>
            <th>Kullanıcı</th>
            <th>Tarih</th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {notes.map(note => {
            const currentNoteInputs = noteRelationInputs[note.id] || { type: '', value: '', showForm: false };
            return (
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
                  ) : note.content}
                </td>
                <td>
                  {note.relations && note.relations.map(rel => (
                    <div key={rel.id} className="relation-item">
                      {editingRelations[rel.id] ? (
                        <>
                          <input
                            type="text"
                            value={editingRelations[rel.id].type}
                            onChange={(e) => handleRelationChange(rel.id, 'type', e.target.value)}
                          />
                          <input
                            type="text"
                            value={editingRelations[rel.id].value}
                            onChange={(e) => handleRelationChange(rel.id, 'value', e.target.value)}
                          />
                          <button onClick={() => handleSaveRelation(rel.id)} className="save-button">Kaydet</button>
                          <button onClick={() => handleCancelRelationEdit(rel.id)} className="cancel-button">İptal</button>
                        </>
                      ) : (
                        <>
                          <strong>{rel.relation_type}:</strong> {rel.relation_value}
                          <button onClick={() => handleEditRelation(rel.id, rel.relation_type, rel.relation_value)} className="edit-button">Düzenle</button>
                          <button onClick={() => handleDeleteRelation(rel.id)} className="delete-relation-button">X</button>
                        </>
                      )}
                    </div>
                  ))}

                  {currentNoteInputs.showForm ? (
                    <div className="add-relation-form">
                      <input
                        type="text"
                        placeholder="İlişki Tipi"
                        value={currentNoteInputs.type}
                        onChange={(e) => handleRelationInputChange(note.id, 'type', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="İlişki Değeri"
                        value={currentNoteInputs.value}
                        onChange={(e) => handleRelationInputChange(note.id, 'value', e.target.value)}
                      />
                      <button onClick={() => handleAddRelation(note.id)}>Kaydet</button>
                      <button onClick={() => toggleAddRelationForm(note.id)} className="cancel-button">İptal</button>
                    </div>
                  ) : (
                    <button onClick={() => toggleAddRelationForm(note.id)} className="add-relation-toggle-button">İlişki Ekle</button>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AllNotesTable;
