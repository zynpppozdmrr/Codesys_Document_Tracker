import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './NoteSection.css';

function NoteSection({ diffId }) {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [error, setError] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/notes/${diffId}`,
        getAuthHeaders()
      );
      if (response.data.success) {
        setNotes(response.data.notes);
      } else {
        setError('Notlar yüklenirken hata oluştu.');
      }
    } catch (err) {
      setError('Notlar alınırken sistem hatası.');
    }
  }, [diffId, getAuthHeaders]);

  useEffect(() => {
    if (diffId) fetchNotes();
  }, [diffId, fetchNotes]);

  const handleSaveNote = async () => {
    if (!currentNote.trim()) return;
    try {
      const response = await axios.post(
        'http://localhost:5000/api/notes/',
        { diff_id: diffId, content: currentNote },
        getAuthHeaders()
      );
      if (response.data.success) {
        fetchNotes();
        setCurrentNote('');
        setShowNoteInput(false);
      } else {
        setError('Not kaydedilirken hata.');
      }
    } catch {
      setError('Not kaydedilirken sistem hatası.');
    }
  };

  return (
    <div className="note-section">
      <h4>Notlar</h4>
      <ul className="note-list">
        {notes.map((note) => (
          <li key={note.id}>{note.content}</li>
        ))}
      </ul>

      {showNoteInput ? (
        <div className="note-input">
          <textarea
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="Yeni not yazın..."
          ></textarea>
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
