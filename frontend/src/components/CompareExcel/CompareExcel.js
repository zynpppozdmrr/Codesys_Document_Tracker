import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CompareExcel.css';

const API_URL = "http://127.0.0.1:5000/api/excel";

function CompareExcel() {
  const [excelFiles, setExcelFiles] = useState([]);
  const [selectedFile1, setSelectedFile1] = useState('');
  const [selectedFile2, setSelectedFile2] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('jwt_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);
  
  // Dosya listesini çekme işlemini tek bir fonksiyonda topladık
  const fetchExcelFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.headers || !authHeaders.headers.Authorization || authHeaders.headers.Authorization === 'Bearer null') {
        setError('Yetkilendirme token\'ı bulunamadı. Lütfen giriş yapın.');
        setLoading(false);
        toast.error('Yetkilendirme hatası. Lütfen yeniden giriş yapın.');
        return;
      }
      
      const listResponse = await axios.get(API_URL, authHeaders);
      if (listResponse.data.success) {
        setExcelFiles(listResponse.data.files);
        if (listResponse.data.files.length >= 2) {
          setSelectedFile1(listResponse.data.files[0].id);
          setSelectedFile2(listResponse.data.files[1].id);
        } else if (listResponse.data.files.length === 1) {
          setSelectedFile1(listResponse.data.files[0].id);
        }
      } else {
        setError(listResponse.data.message || 'Dosyalar listelenirken bir hata oluştu.');
        toast.error(listResponse.data.message || 'Dosyalar listelenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error("fetchExcelFiles error:", err);
      if (err.response && err.response.status === 422) {
          setError('Yetkilendirme hatası: Lütfen yeniden giriş yapın.');
          toast.error('Yetkilendirme hatası: Lütfen yeniden giriş yapın.');
      } else {
          setError(err.response?.data?.message || 'API çağrısı sırasında hata oluştu.');
          toast.error('API çağrısı sırasında hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);


  useEffect(() => {
    fetchExcelFiles();
  }, [fetchExcelFiles]);

  const handleCompare = async () => {
    if (!selectedFile1 || !selectedFile2 || selectedFile1 === selectedFile2) {
      setError('Lütfen farklı iki dosya seçin.');
      toast.error('Lütfen farklı iki dosya seçin.');
      return;
    }

    setComparing(true);
    setDiffResult(null);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/compare`, {
        file1_id: parseInt(selectedFile1),
        file2_id: parseInt(selectedFile2)
      }, getAuthHeaders());

      if (response.data.success) {
        setDiffResult(response.data.data);
        toast.success(response.data.message);
      } else {
        setError(response.data.message);
        toast.error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Karşılaştırma sırasında bir hata oluştu.');
      toast.error('Karşılaştırma sırasında bir hata oluştu.');
    } finally {
      setComparing(false);
    }
  };

  const handleFileUpload = async (files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      setComparing(true);
      const response = await axios.post(`${API_URL}/upload`, formData, {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      });

      if (response.data.success) {
        toast.success(response.data.data.message);
        fetchExcelFiles(); // Yükleme sonrası listeyi yenilemek için senkronizasyon yap
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('Dosya yükleme sırasında bir hata oluştu.');
    } finally {
      setComparing(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Bu dosyayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        try {
            const authHeaders = getAuthHeaders();
            const response = await axios.delete(`${API_URL}/${fileId}`, authHeaders);
            if (response.data.success) {
                toast.success("Dosya başarıyla silindi.");
                fetchExcelFiles(); // Listeyi güncelleyerek anında yansımasını sağla
            } else {
                toast.error("Dosya silinirken bir hata oluştu.");
            }
        } catch (err) {
            toast.error("Silme işlemi başarısız oldu.");
        }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current.click();
  };

  const renderTable = (data, title) => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);

    return (
      <div className="diff-table-container">
        <h3 className="diff-table-title">{title}</h3>
        <table className="diff-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>{String(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return <div className="loading-message">Yükleniyor...</div>;
  }

  return (
    <div className="compare-excel-container">
      <h2>Excel Dosyası Karşılaştırma</h2>

      <div
        className={`upload-drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p><b>Sürükle Bırak</b> - Excel dosyalarını buraya sürükleyip bırakın.</p>
        <button onClick={handleChooseFileClick} className="choose-file-btn">Dosya Seç</button>
      </div>

      <input
        id="fileInput"
        type="file"
        multiple
        accept=".xlsx,.xls"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      
      <div className="selection-area">
        <div className="form-group">
          <label>Eski Dosya:</label>
          <select value={selectedFile1} onChange={(e) => setSelectedFile1(e.target.value)} disabled={comparing}>
            <option value="">Dosya Seçin</option>
            {excelFiles.map((file) => (
              <option key={file.id} value={file.id}>{file.file_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Yeni Dosya:</label>
          <select value={selectedFile2} onChange={(e) => setSelectedFile2(e.target.value)} disabled={comparing}>
            <option value="">Dosya Seçin</option>
            {excelFiles.map((file) => (
              <option key={file.id} value={file.id}>{file.file_name}</option>
            ))}
          </select>
        </div>
        <button onClick={handleCompare} disabled={comparing}>
          {comparing ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
        </button>
      </div>

      <div className="file-list-management">
        <h3>Yüklenen Excel Dosyaları</h3>
        <ul className="file-list">
          {excelFiles.length > 0 ? (
            excelFiles.map(file => (
              <li key={file.id} className="file-list-item">
                <span>{file.file_name}</span>
                <button onClick={() => handleDeleteFile(file.id)} className="delete-btn">Sil</button>
              </li>
            ))
          ) : (
            <li>Yüklenmiş dosya bulunamadı.</li>
          )}
        </ul>
      </div>

      {error && <div className="error-message">{error}</div>}

      {diffResult && (
        <div className="diff-result-area">
          {diffResult.length > 0 ? (
            diffResult.map((diff, index) => (
              <div key={index}>
                {renderTable(diff.differences, `Sadece "${diff.file}" dosyasında bulunan satırlar:`)}
              </div>
            ))
          ) : (
            <p className="no-diff-message">Dosyalar arasında bir fark bulunamadı.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CompareExcel;