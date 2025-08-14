import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import './ProjectGlossaryPage.css';

/**
 * Dinamik Proje Kodları (Glossary) Sayfası
 * Kolonlar: Proje Kısa Adı (code), Açıklama (desc), Tip Kodu (type), Proje Sıra No (order), Kod/No (no)
 */

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const ENDPOINT = `${API_BASE}/api/glossary`;

const emptyForm = { id: null, code: '', desc: '', type: '', order: '', no: '' };

/**
 * Auth header yardımcı:
 * - Token'ı localStorage'dan 'jwt_token' ile okur
 * - Authorization'ı yalnızca token varsa ekler
 * - Content-Type: application/json yalnızca gövdeli isteklerde (POST/PUT) eklenir (preflight azaltır)
 */
const useAuthHeaders = () =>
  useCallback((opts = { json: false }) => {
    const token = localStorage.getItem('jwt_token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.json) headers['Content-Type'] = 'application/json';
    return { headers };
  }, []);

export default function ProjectGlossaryPage() {
  const getAuthHeaders = useAuthHeaders();

  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ---- Listele ----
  const fetchItems = useCallback(async (opts = { toastOnSuccess: false }) => {
    setLoading(true);
    setErr('');
    try {
      const res = await axios.get(`${ENDPOINT}/`, getAuthHeaders());
      if (res.data?.success) {
        setItems(res.data.items || []);
        if (opts.toastOnSuccess) {
          toast.success('Liste yenilendi');
        }
      } else {
        const msg = res.data?.message || 'Kayıtlar alınamadı.';
        setErr(msg);
        toast.error(msg);
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        const msg = 'Oturum süreniz dolmuştur lütfen giriş yapın.';
        setErr(msg);
        toast.error(msg);
      } else {
        const msg = 'Sistem hatası: Kayıtlar getirilemedi.';
        setErr(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const t = localStorage.getItem('jwt_token');
    if (!t) {
      setLoading(false);
      const msg = 'Oturum süreniz dolmuştur lütfen giriş yapın.';
      setErr(msg);
      toast.warn(msg);
      return;
    }
    fetchItems();
  }, [fetchItems]);

  // ---- Filtreler (client-side) ----
  const typeOptions = useMemo(() => {
    const set = new Set(items.map(r => r.type).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    const t = (s) => (s ?? '').toString().toLowerCase();
    return items.filter(r => {
      const matchType = typeFilter === 'all' || t(r.type) === t(typeFilter);
      const hay = `${t(r.code)} ${t(r.desc)} ${t(r.type)} ${t(r.order)} ${t(r.no)}`;
      const matchQ = !q || hay.includes(t(q));
      return matchType && matchQ;
    });
  }, [items, q, typeFilter]);

  // ---- Modal helpers ----
  const openCreate = () => { setForm(emptyForm); setShowModal(true); setErr(''); };
  const openEdit = (row) => { setForm({ ...row, order: row.order ?? '' }); setShowModal(true); setErr(''); };
  const closeModal = () => { if (!saving) { setShowModal(false); setForm(emptyForm); } };

  // ---- CRUD ----
  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'order' ? value.replace(/[^\d]/g, '') : value }));
  };

  const validateForm = () => {
    if (!form.code?.trim() || !form.type?.trim() || !form.no?.trim()) {
      const msg = 'code, type ve no alanları zorunludur.';
      setErr(msg);
      toast.warn(msg);
      return false;
    }
    return true;
  };

  const payload = () => JSON.stringify({
    code: form.code.trim(),
    desc: (form.desc || '').trim(),
    type: form.type.trim(),
    order: form.order === '' ? null : Number(form.order),
    no: form.no.trim(),
  });

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setErr('');
    try {
      if (form.id) {
        const res = await axios.put(`${ENDPOINT}/${form.id}`, payload(), getAuthHeaders({ json: true }));
        if (res.data?.success) {
          setItems(prev => prev.map(x => (x.id === form.id ? res.data.item : x)));
          toast.success('Kayıt güncellendi');
          closeModal();
        } else {
          const msg = res.data?.message || 'Güncelleme başarısız.';
          setErr(msg);
          toast.error(msg);
        }
      } else {
        const res = await axios.post(`${ENDPOINT}/`, payload(), getAuthHeaders({ json: true }));
        if (res.data?.success) {
          setItems(prev => [res.data.item, ...prev]);
          toast.success('Kayıt eklendi');
          closeModal();
        } else {
          const msg = res.data?.message || 'Kayıt oluşturulamadı.';
          setErr(msg);
          toast.error(msg);
        }
      }
    } catch (e) {
      if (e?.response?.status === 409) {
        const msg = 'Aynı (code, no) kombinasyonu zaten mevcut.';
        setErr(msg);
        toast.error(msg);
      } else if (e?.response?.status === 401) {
        const msg = 'Oturum süreniz dolmuştur lütfen giriş yapın.';
        setErr(msg);
        toast.error(msg);
      } else {
        const msg = 'İşlem sırasında bir hata oluştu.';
        setErr(msg);
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Silinsin mi? (${row.code} #${row.no})`)) return;
    try {
      const res = await axios.delete(`${ENDPOINT}/${row.id}`, getAuthHeaders());
      if (res.data?.success) {
        setItems(prev => prev.filter(x => x.id !== row.id));
        toast.success('Kayıt silindi');
      } else {
        const msg = res.data?.message || 'Silme başarısız.';
        setErr(msg);
        toast.error(msg);
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        const msg = 'Oturum süreniz dolmuştur lütfen giriş yapın.';
        setErr(msg);
        toast.error(msg);
      } else {
        const msg = 'Silme işlemi sırasında bir hata oluştu.';
        setErr(msg);
        toast.error(msg);
      }
    }
  };

  // ---- UI ----
  return (
    <div className="glossary-container">
      <div className="glossary-head">
        <div>
          <h2 className="glossary-title">Bilgilendirme / Proje Kodları</h2>
          
        </div>
        <div className="controls">
          <input
            className="search"
            placeholder="Ara: kısa ad, açıklama, tip, no..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typeOptions.map(op => (
              <option key={op} value={op}>
                {op === 'all' ? 'Tüm Tipler' : `Tip ${op}`}
              </option>
            ))}
          </select>
          <span className="count-badge">{filtered.length}</span>
          <button className="btn btn-green" onClick={openCreate}>+ Yeni Kayıt</button>
          <button className="btn btn-outline" onClick={() => fetchItems({ toastOnSuccess: true })}>Yenile</button>
        </div>
      </div>

      {err && <div className="alert">{err}</div>}

      <div className="glossary-table-wrap">
        <table className="glossary-table">
          <thead>
            <tr>
              <th style={{width:140}}>Proje Kısa Adı</th>
              <th>Açıklama</th>
              <th style={{width:90}}>Tip Kodu</th>
              <th style={{width:140}}>Proje Sıra No</th>
              <th style={{width:100}}>Kod/No</th>
              <th style={{width:160}}>Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-cell">Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="empty-cell">Kayıt bulunamadı.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id ?? `${r.code}-${r.no}`}>
                <td><span className="code-chip">{r.code}</span></td>
                <td className="desc">{r.desc || '-'}</td>
                <td><span className="cat-pill">{r.type}</span></td>
                <td>{r.order ?? '-'}</td>
                <td className="no-cell">{r.no}</td>
                <td className="actions">
                  <button className="btn btn-blue" onClick={() => openEdit(r)}>Düzenle</button>
                  <button className="btn btn-red" onClick={() => handleDelete(r)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{form.id ? 'Kayıt Düzenle' : 'Yeni Kayıt'}</div>
            <div className="modal-body">
              <div className="form-row">
                <label>Proje Kısa Adı*</label>
                <input name="code" value={form.code} onChange={onFormChange} placeholder="Örn: TIMTROx33" />
              </div>
              <div className="form-row">
                <label>Açıklama</label>
                <input name="desc" value={form.desc} onChange={onFormChange} placeholder="Örn: Timisoara Troleybüs 18m" />
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Tip Kodu*</label>
                  <input name="type" value={form.type} onChange={onFormChange} placeholder="Örn: 1" />
                </div>
                <div className="form-row">
                  <label>Proje Sıra No</label>
                  <input name="order" value={form.order} onChange={onFormChange} placeholder="Örn: 10" />
                </div>
                <div className="form-row">
                  <label>Kod/No*</label>
                  <input name="no" value={form.no} onChange={onFormChange} placeholder="Örn: 1010" />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeModal} disabled={saving}>İptal</button>
              <button className="btn btn-green" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

     
      {/* Toastify container */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
