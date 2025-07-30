// src/components/CompareDiffs/CompareDiffs.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CompareDiffs.css'; // Stil dosyası

// Yardımcı fonksiyon: Unified Diff çıktısını ayrıştırır
const parseUnifiedDiff = (diffText) => {
  const lines = diffText.split('\n');
  const parsedDiff = [];
  let currentOldLine = 0;
  let currentNewLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let type = 'context'; // unchanged, added, removed, header

    if (line.startsWith('---') || line.startsWith('+++')) {
      type = 'header';
      parsedDiff.push({ type, oldLine: null, newLine: null, content: line });
      continue;
    }
    if (line.startsWith('@@')) {
      type = 'header';
      // Satır numaralarını @@ -old_start,old_count +new_start,new_count @@ formatından çekebiliriz
      const match = line.match(/@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@/);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        currentNewLine = parseInt(match[3], 10);
      }
      parsedDiff.push({ type, oldLine: null, newLine: null, content: line });
      continue;
    }

    // Gerçek diff satırları
    const content = line.substring(1); // İşareti (-, +, boşluk) kaldır
    if (line.startsWith('-')) {
      type = 'removed';
      parsedDiff.push({ type, oldLine: currentOldLine++, newLine: null, content: content });
    } else if (line.startsWith('+')) {
      type = 'added';
      parsedDiff.push({ type, oldLine: null, newLine: currentNewLine++, content: content });
    } else {
      type = 'unchanged';
      parsedDiff.push({ type, oldLine: currentOldLine++, newLine: currentNewLine++, content: content });
    }
  }
  return parsedDiff;
};


function CompareDiffs() {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [selectedFile1, setSelectedFile1] = useState('');
  const [selectedFile2, setSelectedFile2] = useState('');
  const [diffResult, setDiffResult] = useState(null); // Ayrıştırılmış diff verisi
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  // Not ekleme için state'ler
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [notes, setNotes] = useState({}); // { 'diff_filename': [{ line_number: X, text: 'Not' }] }


  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    const fetchXmlFilesForDropdown = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get('http://localhost:5000/api/xmlfiles/', getAuthHeaders());
        if (response.data.success) {
          setXmlFiles(response.data.files);
          if (response.data.files.length >= 2) {
            setSelectedFile1(response.data.files[0].id);
            setSelectedFile2(response.data.files[1].id);
          } else if (response.data.files.length === 1) {
            setSelectedFile1(response.data.files[0].id);
          }
        } else {
          setError(response.data.message || 'XML dosyaları çekilirken bir hata oluştu.');
        }
      } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response && err.response.status === 401) {
          setError('Yetkisiz erişim. Lütfen tekrar giriş yapın.');
        } else {
          setError('Sunucuya bağlanılamadı veya bilinmeyen bir hata oluştu.');
        }
        console.error('XML Files Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchXmlFilesForDropdown();
  }, []);

  const handleCompare = async () => {
    if (!selectedFile1 || !selectedFile2) {
      setError('Lütfen karşılaştırmak için iki dosya seçin.');
      return;
    }
    if (selectedFile1 === selectedFile2) {
      setError('Lütfen farklı iki dosya seçin.');
      return;
    }

    setComparing(true);
    setDiffResult(null);
    setError('');
    setShowNoteInput(false); // Not girişini gizle
    setCurrentNote(''); // Not alanını temizle

    try {
      const createDiffResponse = await axios.post(
        'http://localhost:5000/api/diffs/compare',
        { file1_id: selectedFile1, file2_id: selectedFile2 },
        getAuthHeaders()
      );

      if (createDiffResponse.data.success) {
        const { diff_filename, summary } = createDiffResponse.data.data;

        const getDiffReportResponse = await axios.get(
          `http://localhost:5000/api/diffs/report/${diff_filename}`,
          { ...getAuthHeaders(), responseType: 'text' }
        );

        // Metin diff'ini ayrıştır ve state'e kaydet
        const parsed = parseUnifiedDiff(getDiffReportResponse.data);
        setDiffResult({
          diff_filename: diff_filename, // Notlar için dosya adını tutalım
          summary: summary,
          parsed_content: parsed // Ayrıştırılmış içerik
        });

      } else {
        setError(createDiffResponse.data.message || 'Fark karşılaştırma sırasında bir hata oluştu.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.status === 401) {
        setError('Yetkisiz erişim. Lütfen tekrar giriş yapın.');
      } else if (err.message === "Network Error") {
        setError('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
      } else {
        setError(`Bir hata oluştu: ${err.message}`);
      }
      console.error('Compare Diffs Error:', err);
    } finally {
      setComparing(false);
    }
  };

  const handleSaveNote = () => {
    if (!currentNote.trim()) {
      alert('Lütfen boş not kaydetmeyin.');
      return;
    }
    if (!diffResult || !diffResult.diff_filename) {
      alert('Diff raporu mevcut değil.');
      return;
    }

    // Şimdilik notları sadece frontend state'inde tutuyoruz.
    // Gelecekte buraya backend API çağrısı eklenecek.
    const newNotes = { ...notes };
    if (!newNotes[diffResult.diff_filename]) {
      newNotes[diffResult.diff_filename] = [];
    }
    // Notu hangi satıra eklediğimizi belirtmek için basit bir yaklaştım.
    // Gerçek bir uygulamada, hangi satırdaki değişikliğe not eklendiği daha spesifik olurdu.
    // Şimdilik sadece tüm diff raporu için bir not olarak kaydedelim.
    newNotes[diffResult.diff_filename].push({
      timestamp: new Date().toISOString(),
      text: currentNote,
      // line_number: /* İsterseniz buraya ilgili satır numarasını ekleyebilirsiniz */
    });
    setNotes(newNotes);
    
    alert('Not başarıyla kaydedildi! (Şimdilik sadece tarayıcınızda)'); // Kullanıcıya bilgi ver
    setShowNoteInput(false);
    setCurrentNote('');
  };

  if (loading) {
    return <div className="loading-message">XML dosyaları yükleniyor...</div>;
  }

  return (
    <div className="compare-diffs-container">
      <h2>Farkları Karşılaştır</h2>
      <div className="selection-area">
        <div className="form-group">
          <label htmlFor="file1">İlk Dosya:</label>
          <select
            id="file1"
            value={selectedFile1}
            onChange={(e) => { setSelectedFile1(e.target.value); setDiffResult(null); setError(''); }}
            disabled={comparing}
          >
            <option value="">Dosya Seçin</option>
            {xmlFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.file_name} (ID: {file.id})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="file2">İkinci Dosya:</label>
          <select
            id="file2"
            value={selectedFile2}
            onChange={(e) => { setSelectedFile2(e.target.value); setDiffResult(null); setError(''); }}
            disabled={comparing}
          >
            <option value="">Dosya Seçin</option>
            {xmlFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.file_name} (ID: {file.id})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleCompare} disabled={comparing}>
          {comparing ? 'Karşılaştırılıyor...' : 'Farkları Karşılaştır'}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {diffResult && (
        <div className="diff-result-area">
          <h3>Karşılaştırma Sonucu:</h3>
          {diffResult.summary && (
            <div className="diff-summary">
                <h4>Özet:</h4>
                <p>{diffResult.summary}</p>
            </div>
          )}
          
          <div className="diff-display">
            <div className="diff-column old-version">
              <h4>Eski Versiyon</h4>
              <pre className="diff-code">
                {diffResult.parsed_content.map((lineData, index) => (
                  <div key={`old-${index}`} className={`diff-line diff-line-${lineData.type}`}>
                    <span className="line-num">{lineData.oldLine !== null ? lineData.oldLine : ''}</span>
                    <span className="line-content">{lineData.type !== 'added' ? lineData.content : ''}</span>
                  </div>
                ))}
              </pre>
            </div>

            <div className="diff-column new-version">
              <h4>Yeni Versiyon</h4>
              <pre className="diff-code">
                {diffResult.parsed_content.map((lineData, index) => (
                  <div key={`new-${index}`} className={`diff-line diff-line-${lineData.type}`}>
                    <span className="line-num">{lineData.newLine !== null ? lineData.newLine : ''}</span>
                    <span className="line-content">{lineData.type !== 'removed' ? lineData.content : ''}</span>
                  </div>
                ))}
              </pre>
              {/* Not ekleme arayüzü */}
              <div className="note-section">
                {!showNoteInput ? (
                  <button onClick={() => setShowNoteInput(true)} className="add-note-btn">Not Yaz</button>
                ) : (
                  <div className="note-input-area">
                    <textarea
                      placeholder="Buraya notunuzu yazın..."
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      rows="4"
                    ></textarea>
                    <div className="note-actions">
                      <button onClick={handleSaveNote} className="save-note-btn">Kaydet</button>
                      <button onClick={() => setShowNoteInput(false)} className="cancel-note-btn">İptal</button>
                    </div>
                  </div>
                )}
                {/* Kaydedilmiş notları göster */}
                {diffResult.diff_filename && notes[diffResult.diff_filename] && (
                    <div className="saved-notes">
                        <h4>Kaydedilen Notlar:</h4>
                        {notes[diffResult.diff_filename].map((note, idx) => (
                            <p key={idx} className="single-note">
                                <strong>{new Date(note.timestamp).toLocaleString()}:</strong> {note.text}
                            </p>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompareDiffs;