import React, { useMemo, useState } from 'react';
import './ProjectGlossaryPage.css';

/**
 * Tablo (fotoğraftan okunarak girildi)
 * Kolonlar: Proje Kısa Adı, Açıklama, Tip Kodu, Proje Sıra No, Kod/No
 */
const PROJECT_ITEMS = [
  { code: 'IPAx3',            desc: '',                                  type: '1', order:  2, no: '1002' },
  { code: 'URFAx12',          desc: '',                                  type: '1', order:  3, no: '1003' },
  { code: 'YYAx1',            desc: '',                                  type: '1', order:  4, no: '1004' },
  { code: 'YYTx1',            desc: '',                                  type: '1', order:  5, no: '1005' },
  { code: 'TIMTROx33',        desc: 'Timisoara Troleybüs 18m',            type: '1', order:  6, no: '1006' },
  { code: 'ALIBUSx2',         desc: 'İzmir Aliağa Ebus',                  type: '1', order:  7, no: '1007' },
  { code: 'HOMTRO',           desc: 'Homologasyon 18m Troleybüs',         type: '1', order:  8, no: '1008' },
  { code: 'PRGTROx7',         desc: 'Prag Troleybüs',                     type: '1', order:  9, no: '1009' },
  { code: 'TIMTROx33',        desc: 'Timisoara Troleybüs 12m',            type: '1', order: 10, no: '1010' },
  { code: 'YYAx1',            desc: 'YYA Ebus 18m - CS için eklendi',     type: '1', order: 11, no: '1011' },

  { code: 'TIM&IASIx56',      desc: '',                                  type: '2', order:  1, no: '2001' },
  { code: 'GEBx7',            desc: '',                                  type: '2', order:  2, no: '2002' },
  { code: 'IST100x25',        desc: '',                                  type: '2', order:  3, no: '2003' },

  { code: 'Charger V2x1',     desc: '',                                  type: '3', order:  3, no: '3003' },

  { code: 'VEMSx1',           desc: '',                                  type: '4', order: null, no: '400X' },
  { code: 'VEMS_LRVx1',       desc: '',                                  type: '4', order: null, no: '400X' },

  { code: 'PAPIS_KAYBUS',     desc: '',                                  type: '4', order:  1, no: '4001' },
  { code: 'IST100PAPISx25',   desc: '',                                  type: '4', order:  2, no: '4002' },
  { code: 'SAMLRVPAPISx10',   desc: '',                                  type: '4', order:  3, no: '4003' },
  { code: 'ALIBUSPAPISx2',    desc: '',                                  type: '4', order:  5, no: '4005' },
];

export default function ProjectGlossaryPage() {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const typeOptions = useMemo(() => {
    const set = new Set(PROJECT_ITEMS.map(r => r.type));
    return ['all', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PROJECT_ITEMS.filter((r) => {
      const matchesSearch = !s || [r.code, r.desc, r.type, String(r.order ?? ''), r.no]
        .join(' ')
        .toLowerCase()
        .includes(s);
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [q, typeFilter]);

  return (
    <div className="glossary-container">
      <div className="glossary-head">
        <div>
          <h2>Bilgilendirme / Proje Kodları</h2>
         
        </div>
        <div className="glossary-actions">
          <input
            type="text"
            placeholder="Ara: kod, açıklama, numara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {typeOptions.map(op => <option key={op} value={op}>{op === 'all' ? 'Tüm Tipler' : `Tip ${op}`}</option>)}
          </select>
          <span className="count-badge">{filtered.length}</span>
        </div>
      </div>

      <div className="glossary-table-wrap">
        <table className="glossary-table">
          <thead>
            <tr>
              <th style={{width:140}}>Proje Kısa Adı</th>
              <th>Açıklama</th>
              <th style={{width:90}}>Tip Kodu</th>
              <th style={{width:140}}>Proje Sıra No</th>
              <th style={{width:100}}>Kod/No</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">Kayıt bulunamadı.</td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={`${r.code}-${r.no}`}>
                <td><span className="code-chip">{r.code}</span></td>
                <td className="desc">{r.desc || '-'}</td>
                <td><span className="cat-pill">{r.type}</span></td>
                <td>{r.order ?? '-'}</td>
                <td className="no-cell">{r.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    
    </div>
  );
}
