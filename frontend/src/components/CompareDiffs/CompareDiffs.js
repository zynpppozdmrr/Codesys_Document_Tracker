import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './CompareDiffs.css';
import NoteSection from '../Notes/NoteSection'; // NOT: yeni klasörde oluşturulacak

const parseUnifiedDiff = (diffText) => {
  const lines = diffText.split('\n');
  const parsedDiff = [];
  let currentOldLine = 0;
  let currentNewLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let type = 'context';

    if (line.startsWith('---') || line.startsWith('+++')) continue;
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@/);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        currentNewLine = parseInt(match[3], 10);
      }
      continue;
    }

    if (line.trim() === '') {
      parsedDiff.push({ type: 'empty', oldLine: null, newLine: null, content: '' });
      continue;
    }

    const firstChar = line.charAt(0);
    const content = line.substring(1);

    if (firstChar === '-') {
      type = 'removed';
      parsedDiff.push({ type, oldLine: currentOldLine++, newLine: null, content });
    } else if (firstChar === '+') {
      type = 'added';
      parsedDiff.push({ type, oldLine: null, newLine: currentNewLine++, content });
    } else {
      type = 'unchanged';
      parsedDiff.push({ type, oldLine: currentOldLine++, newLine: currentNewLine++, content });
    }
  }

  return parsedDiff;
};

function CompareDiffs() {
  const [xmlFiles, setXmlFiles] = useState([]);
  const [selectedFile1, setSelectedFile1] = useState('');
  const [selectedFile2, setSelectedFile2] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchXmlFilesForDropdown = useCallback(async () => {
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
        setError('XML dosyaları çekilirken hata.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'XML dosyaları çekilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchXmlFilesForDropdown();
  }, [fetchXmlFilesForDropdown]);

  const handleCompare = async () => {
    if (!selectedFile1 || !selectedFile2 || selectedFile1 === selectedFile2) {
      setError('Lütfen farklı iki dosya seçin.');
      return;
    }

    setComparing(true);
    setDiffResult(null);
    setError('');

    try {
      const createDiffResponse = await axios.post(
        'http://localhost:5000/api/diffs/compare',
        { file1_id: selectedFile1, file2_id: selectedFile2 },
        getAuthHeaders()
      );

      if (createDiffResponse.data.success) {
        const { diff_id, diff_filename, summary, old_file, new_file } = createDiffResponse.data.data;
        const getDiffReportResponse = await axios.get(
          `http://localhost:5000/api/diffs/report/${diff_filename}`,
          { ...getAuthHeaders(), responseType: 'text' }
        );

        const parsed = parseUnifiedDiff(getDiffReportResponse.data);
        setDiffResult({
          diff_id,
          diff_filename,
          summary,
          parsed_content: parsed,
          old_file_name: old_file,
          new_file_name: new_file
        });
      } else {
        setError('Fark karşılaştırma sırasında hata oluştu.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Fark karşılaştırma hatası.');
    } finally {
      setComparing(false);
    }
  };

  if (loading) return <div className="loading-message">Yükleniyor...</div>;

  return (
    <div className="compare-diffs-container">
      <h2>Farkları Karşılaştır</h2>
      <div className="selection-area">
        <div className="form-group">
          <label>İlk Dosya:</label>
          <select value={selectedFile1} onChange={(e) => setSelectedFile1(e.target.value)} disabled={comparing}>
            <option value="">Dosya Seçin</option>
            {xmlFiles.map((file) => (
              <option key={file.id} value={file.id}>{file.file_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>İkinci Dosya:</label>
          <select value={selectedFile2} onChange={(e) => setSelectedFile2(e.target.value)} disabled={comparing}>
            <option value="">Dosya Seçin</option>
            {xmlFiles.map((file) => (
              <option key={file.id} value={file.id}>{file.file_name}</option>
            ))}
          </select>
        </div>
        <button onClick={handleCompare} disabled={comparing}>
          {comparing ? 'Karşılaştırılıyor...' : 'Farkları Karşılaştır'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {diffResult && (
        <div className="diff-result-area">
          <h3>Karşılaştırma Sonucu</h3>
          <div className="diff-summary"><p>{diffResult.summary}</p></div>
          <div className="diff-display">
            <div className="diff-column old-version">
              <h4>Eski Versiyon: {diffResult.old_file_name}</h4>
              <pre className="diff-code">
                {diffResult.parsed_content.map((lineData, index) => (
                  <div key={`old-${index}`} className={`diff-line diff-line-${lineData.type}`}>
                    <span className="line-num">
                      {lineData.oldLine !== null ? lineData.oldLine : ''}
                    </span>
                    <span className="line-content">
                      {lineData.type !== 'added' ? lineData.content : ''}
                    </span>
                  </div>
                ))}
              </pre>
            </div>

            <div className="diff-column new-version">
              <h4>Yeni Versiyon: {diffResult.new_file_name}</h4>
              <pre className="diff-code">
                {diffResult.parsed_content.map((lineData, index) => (
                  <div key={`new-${index}`} className={`diff-line diff-line-${lineData.type}`}>
                    <span className="line-num">
                      {lineData.newLine !== null ? lineData.newLine : ''}
                    </span>
                    <span className="line-content">
                      {lineData.type !== 'removed' ? lineData.content : ''}
                    </span>
                  </div>
                ))}
              </pre>

              {/* ✨ Yeni: Notlar ayrı bir bileşene aktarıldı */}
              <NoteSection diffId={diffResult.diff_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompareDiffs;
