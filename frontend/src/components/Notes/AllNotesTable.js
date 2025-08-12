import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './AllNotesTable.css';

const AllNotesTable = () => {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Not içeriği düzenleme
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  // İlişki ekleme/düzenleme UI state'i (noteId bazlı)
  const [relationUI, setRelationUI] = useState({});

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  }, []);

  const fetchNotes = useCallback(async (filterUsername = '') => {
    setLoading(true);
    setError('');
    try {
      const url = filterUsername
        ? `http://localhost:5000/api/notes/?username=${encodeURIComponent(filterUsername)}`
        : `http://localhost:5000/api/notes/`;

      const response = await axios.get(url, getAuthHeaders());
      if (response.data && response.data.success) {
        const list = response.data.notes || [];
        setNotes(list);
        setIsAdmin(!!response.data.is_admin);
        setCurrentUser(response.data.current_username || '');

        // Her not için relationUI başlangıç durumu
        const init = {};
        list.forEach((n) => {
          init[n.id] = { visible: false, type: '', value: '', relationId: null };
        });
        setRelationUI(init);
      } else {
        setError('Notlar alınamadı.');
      }
    } catch (err) {
      setError('Oturum süreniz dolmuştur lütfen giriş yapın.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchNotes('');
  }, [fetchNotes]);

  const formatDate = (isoOrStr) => {
    try {
      return new Date(isoOrStr).toLocaleString('tr-TR');
    } catch {
      return isoOrStr || '';
    }
  };

  /* ---------- Admin filtre ---------- */
  const handleFilter = () => {
    fetchNotes(usernameFilter.trim());
  };

  const handleClearFilter = () => {
    setUsernameFilter('');
    fetchNotes('');
  };

  /* ---------- Not düzenleme ---------- */
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/notes/${noteId}`, getAuthHeaders());
      if (res.data && res.data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        setError(res.data?.message || 'Not silinemedi.');
      }
    } catch (err) {
      setError('Not silme işleminde hata oluştu.');
    }
  };

  const handleEditClick = (note) => {
    setEditingNoteId(note.id);
    setEditedContent(note.content || '');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedContent('');
  };

  const handleSaveEdit = async (noteId) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/notes/${noteId}`,
        JSON.stringify({ content: editedContent }),
        getAuthHeaders()
      );
      if (res.data && res.data.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, content: editedContent } : n))
        );
        setEditingNoteId(null);
        setEditedContent('');
      } else {
        setError(res.data?.message || 'Not güncellenemedi.');
      }
    } catch (err) {
      setError('Not güncellenirken hata oluştu.');
    }
  };

  /* ---------- İlişki ekle/düzenle/sil ---------- */
  const openAddRelation = (noteId) => {
    setRelationUI((prev) => ({
      ...prev,
      [noteId]: { visible: true, type: '', value: '', relationId: null }
    }));
  };

  const openEditRelation = (noteId, relation) => {
    setRelationUI((prev) => ({
      ...prev,
      [noteId]: {
        visible: true,
        type: relation.relation_type || '',
        value: relation.relation_value || '',
        relationId: relation.id
      }
    }));
  };

  const cancelRelationForm = (noteId) => {
    setRelationUI((prev) => ({
      ...prev,
      [noteId]: { visible: false, type: '', value: '', relationId: null }
    }));
  };

  const saveRelation = async (noteId) => {
    const ui = relationUI[noteId] || {};
    const type = (ui.type || '').trim();
    const value = (ui.value || '').trim();
    const relationId = ui.relationId;

    if (!type || !value) {
      alert('relation_type ve relation_value zorunludur.');
      return;
    }

    try {
      if (relationId) {
        // PUT /api/relations/<relation_id>
        const res = await axios.put(
          `http://localhost:5000/api/relations/${relationId}`,
          JSON.stringify({ relation_type: type, relation_value: value }),
          getAuthHeaders()
        );

        if (res.data && res.data.success) {
          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== noteId) return n;
              const updated = (n.relations || []).map((r) =>
                r.id === relationId ? { ...r, relation_type: type, relation_value: value } : r
              );
              return { ...n, relations: updated };
            })
          );
          cancelRelationForm(noteId);
        } else {
          setError(res.data?.message || 'İlişki güncellenemedi.');
        }
      } else {
        // POST /api/relations/
        const res = await axios.post(
          'http://localhost:5000/api/relations/',
          JSON.stringify({ note_id: noteId, relation_type: type, relation_value: value }),
          getAuthHeaders()
        );

        if (res.data && res.data.success) {
          const newRel = res.data?.data || null;
          if (newRel) {
            setNotes((prev) =>
              prev.map((n) => {
                if (n.id !== noteId) return n;
                const list = Array.isArray(n.relations) ? n.relations.slice() : [];
                list.push(newRel);
                return { ...n, relations: list };
              })
            );
            cancelRelationForm(noteId);
          } else {
            await fetchNotes('');
            cancelRelationForm(noteId);
          }
        } else {
          setError(res.data?.message || 'İlişki eklenemedi.');
        }
      }
    } catch (err) {
      setError('İlişki kaydedilirken hata oluştu.');
    }
  };

  const deleteRelation = async (noteId, relationId) => {
    if (!window.confirm('Bu ilişkiyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await axios.delete(
        `http://localhost:5000/api/relations/${relationId}`,
        getAuthHeaders()
      );
      if (res.data && res.data.success) {
        setNotes((prev) =>
          prev.map((n) => {
            if (n.id !== noteId) return n;
            const filtered = (n.relations || []).filter((r) => r.id !== relationId);
            return { ...n, relations: filtered };
          })
        );
      } else {
        setError(res.data?.message || 'İlişki silinemedi.');
      }
    } catch (err) {
      setError('İlişki silinirken hata oluştu.');
    }
  };

  const onRelationFieldChange = (noteId, field, value) => {
    setRelationUI((prev) => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        [field]: value
      }
    }));
  };

  const canEditOrDelete = (note) => {
    return isAdmin || (currentUser && note.username && note.username === currentUser);
  };

  return (
    <div className="all-notes-table">
      {/* Admin'e özel filtre alanı */}
      {isAdmin && (
        <div className="admin-filter-row">
          <input
            type="text"
            placeholder="Kullanıcı adına göre filtrele"
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
          />
          <button className="edit-button" onClick={handleFilter}>Filtrele</button>
          <button className="cancel-button" onClick={handleClearFilter}>Temizle</button>
        </div>
      )}

      {loading && <div className="info-banner">Yükleniyor...</div>}
      {error && <div className="error-banner">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Dosya Adı</th>
            <th>Not İçeriği</th>
            <th>İlişkiler</th>
            <th>Kullanıcı</th>
            <th>Tarih</th>
            <th>Aksiyonlar</th>
          </tr>
        </thead>
        <tbody>
          {notes.length === 0 && !loading && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>Kayıt bulunamadı</td>
            </tr>
          )}

          {notes.map((note) => {
            const relations = Array.isArray(note.relations) ? note.relations : [];
            const fileName = note.xmlfile_name || note.file_name || '-';
            const userName = note.username || '-';
            const createdAt = formatDate(note.timestamp || note.created_at);
            const ui = relationUI[note.id] || { visible: false, type: '', value: '', relationId: null };

            return (
              <tr key={note.id}>
                <td>{fileName}</td>

                <td>
                  {editingNoteId === note.id ? (
                    <div className="inline-editor">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={3}
                      />
                      <div className="inline-editor-actions">
                        <button className="edit-button" onClick={() => handleSaveEdit(note.id)}>Kaydet</button>
                        <button className="cancel-button" onClick={handleCancelEdit}>Vazgeç</button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-content">{note.content}</div>
                  )}
                </td>

                <td>
                  {relations.length === 0 ? (
                    <span className="muted">-</span>
                  ) : (
                    <ul className="relation-list">
                      {relations.map((r) => (
                        <li key={r.id}>
                          <strong>{r.relation_type}:</strong> {r.relation_value}
                          {canEditOrDelete(note) && (
                            <div style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
                              <button
                                className="edit-button"
                                onClick={() => openEditRelation(note.id, r)}
                                title="İlişkiyi düzenle"
                              >
                                Düzenle
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => deleteRelation(note.id, r.id)}
                                title="İlişkiyi sil"
                              >
                                Sil
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* İlişki ekleme/düzenleme formu */}
                  {canEditOrDelete(note) && (
                    ui.visible ? (
                      <div className="inline-editor" style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            placeholder="relation_type"
                            value={ui.type}
                            onChange={(e) => onRelationFieldChange(note.id, 'type', e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="text"
                            placeholder="relation_value"
                            value={ui.value}
                            onChange={(e) => onRelationFieldChange(note.id, 'value', e.target.value)}
                            style={{ flex: 2 }}
                          />
                        </div>
                        <div className="inline-editor-actions">
                          <button className="edit-button" onClick={() => saveRelation(note.id)}>
                            {ui.relationId ? 'Güncelle' : 'Ekle'}
                          </button>
                          <button className="cancel-button" onClick={() => cancelRelationForm(note.id)}>
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <button className="view-button" onClick={() => openAddRelation(note.id)}>
                          İlişki Ekle
                        </button>
                      </div>
                    )
                  )}
                </td>

                <td>{userName}</td>
                <td>{createdAt}</td>

                <td className="actions-cell">
                  {canEditOrDelete(note) ? (
                    editingNoteId === note.id ? (
                      <>
                        <button className="edit-button" onClick={() => handleSaveEdit(note.id)}>Kaydet</button>
                        <button className="cancel-button" onClick={handleCancelEdit}>Vazgeç</button>
                      </>
                    ) : (
                      <>
                        <button className="edit-button" onClick={() => handleEditClick(note)}>Düzenle</button>
                        <button className="delete-button" onClick={() => handleDeleteNote(note.id)}>Sil</button>
                      </>
                    )
                  ) : (
                    <span className="muted">—</span>
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
