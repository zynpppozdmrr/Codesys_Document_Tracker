import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './NoteSection.css';

function NoteSection({ diffId }) {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [error, setError] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // aktif (login) kullanıcının adı — kendisini listeden gizlemek için
  const [currentUsername, setCurrentUsername] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/notes/${diffId}`,
        getAuthHeaders()
      );
      if (response.data.success) {
        setNotes(response.data.notes);
        // backend bu alanı döndürüyor: { current_username: "..." }
        if (response.data.current_username) {
          setCurrentUsername(response.data.current_username);
        }
      } else {
        setError('Notlar yüklenirken hata oluştu.');
      }
    } catch {
      setError('Notlar alınırken sistem hatası.');
    }
  }, [diffId, getAuthHeaders]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notes/visible-users', getAuthHeaders());
      if (res.data?.success) setAllUsers(res.data.users || []);
    } catch {
      /* sessiz geç */
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (diffId) fetchNotes();
    fetchUsers();
  }, [diffId, fetchNotes, fetchUsers]);

  const handleSaveNote = async () => {
    if (!currentNote.trim()) return;
    try {
      const payload = {
        diff_id: diffId,
        content: currentNote,
        visible_user_ids: selectedUserIds
      };
      const response = await axios.post(
        'http://localhost:5000/api/notes/',
        JSON.stringify(payload),
        getAuthHeaders()
      );
      if (response.data.success) {
        fetchNotes();
        setCurrentNote('');
        setSelectedUserIds([]);
        setShowNoteInput(false);
      } else {
        setError(response.data?.message || 'Not kaydedilirken hata.');
      }
    } catch {
      setError('Not kaydedilirken sistem hatası.');
    }
  };

  const toggleSelected = (uid) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="note-section">
      <h4>Notlar</h4>
      <ul className="note-list">
        {notes.map((note) => (
          <li key={note.id}>
            <div>{note.content}</div>

            {Array.isArray(note.visible_usernames) && note.visible_usernames.length > 0 && (
              <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#334155' }}>
                <strong>Görünen kullanıcılar:</strong> {note.visible_usernames.join(', ')}
              </div>
            )}

            {note.relations && note.relations.length > 0 && (
              <div className="note-relations" style={{ marginTop: 6 }}>
                {note.relations.map(rel => (
                  <span key={rel.id} className="note-relation">
                    <strong>{rel.relation_type}:</strong> {rel.relation_value}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {showNoteInput ? (
        <div className="note-input">
          <textarea
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="Yeni not yazın..."
          ></textarea>

          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Bu not kimlere görünsün?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allUsers
                // aktif kullanıcıyı listeden çıkar
                .filter(u => u.username !== currentUsername)
                .map(u => (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '6px 8px',
                      borderRadius: 8
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => toggleSelected(u.id)}
                    />
                    {u.username}
                  </label>
                ))}
            </div>
            <div style={{ marginTop: 6, fontSize: '12px', color:'#475569' }}>
              (Seçmezsen sadece sen ve admin görebilir.)
            </div>
          </div>

          <div className="note-buttons">
            <button className="save" onClick={handleSaveNote}>Kaydet</button>
            <button className="cancel" onClick={() => setShowNoteInput(false)}>İptal</button>
          </div>
        </div>
      ) : (
        <button className="add-note-button" onClick={() => setShowNoteInput(true)}>Yeni Not Ekle</button>
      )}

      {error && <div className="note-error">{error}</div>}
    </div>
  );
}

export default NoteSection;
