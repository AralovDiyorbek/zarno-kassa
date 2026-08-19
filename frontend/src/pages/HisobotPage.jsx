import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';

const fmt = n => Number(n).toLocaleString('uz-UZ');

const FILTERS = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'all', label: 'Hammasi' },
];

function getDateRange(key) {
  const now = new Date();
  const start = new Date();
  if (key === 'today') {
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (key === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (key === 'week') {
    start.setDate(now.getDate() - 7);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (key === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  return {};
}

export default function HisobotPage() {
  const { showToast } = useApp();
  const [filter, setFilter] = useState('today');
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [slowProducts, setSlowProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = getDateRange(filter);
      const [sRes, tRes, slRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/top-products', { params }),
        api.get('/reports/slow-products', { params }),
      ]);
      setSummary(sRes.data);
      setTopProducts(tRes.data);
      setSlowProducts(slRes.data);
    } catch {
      showToast('Hisobotni yuklashda xato', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="brand-label">ZARNO</div>
          <h1 className="page-title">Hisobot</h1>
          <div className="page-subtitle">Savdo va foyda</div>
        </div>
        <button className="btn-icon btn-icon-ghost" onClick={fetchData} title="Yangilash">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : summary && (
        <>
          {/* Hero Card - Sof Foyda */}
          <div className="hero-card">
            <div className="hero-label">Sof Foyda</div>
            <div className={`hero-value ${summary.netProfit < 0 ? 'text-red' : ''}`}
              style={{ color: summary.netProfit < 0 ? 'var(--red)' : 'var(--green)' }}>
              {fmt(summary.netProfit)} so'm
            </div>
            <div className="hero-sub">Yalpi foyda – xarajatlar</div>
          </div>

          {/* Umumiy / Yalpi */}
          <div className="stat-grid-2">
            <div className="stat-card">
              <div className="stat-label">Umumiy savdo</div>
              <div className="stat-value white">{fmt(summary.totalAmount)} so'm</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Yalpi foyda</div>
              <div className="stat-value green">{fmt(summary.grossProfit)} so'm</div>
            </div>
          </div>

          {/* Tafsilotlar */}
          <div className="card mb-16">
            {[
              ['Tovar tannarxi', summary.totalCost, 'red'],
              ['Yalpi foyda', summary.grossProfit, 'green'],
              ['Jami xarajat', summary.totalExpenses, 'red'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-secondary text-sm">{label}</span>
                <span className={`fw-bold ${cls === 'green' ? 'text-green' : 'text-red'}`}>
                  {fmt(val)} so'm
                </span>
              </div>
            ))}
            <div className="flex-between" style={{ padding: '12px 0 0' }}>
              <span className="fw-800">SOF FOYDA</span>
              <span className={`fw-800 ${summary.netProfit < 0 ? 'text-red' : 'text-green'}`} style={{ fontSize: 16 }}>
                {fmt(summary.netProfit)} so'm
              </span>
            </div>
          </div>

          {/* Savdolar soni */}
          <div className="card mb-20">
            <div className="flex-between">
              <span className="text-secondary text-sm">Savdolar soni:</span>
              <span className="fw-bold">{summary.salesCount} ta</span>
            </div>
          </div>

          {/* Top products */}
          <div className="section-header">
            <div>
              <div className="section-title">Eng yaxshi sotilayotganlar</div>
              <div className="section-count">Eng ko'p dona sotilgan</div>
            </div>
            <span style={{ color: 'var(--green)', fontSize: 18 }}>↗</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="card mb-20" style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13, padding: 24 }}>
              Bu davr uchun sotuv ma'lumoti yo'q
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {topProducts.map((p, i) => (
                <div key={p._id || i} className="top-item">
                  <div className={`rank-badge ${i === 1 ? 'rank2' : i === 2 ? 'rank3' : ''}`}>{i + 1}</div>
                  <div className="top-item-info">
                    <div className="top-item-name">{p.productName}</div>
                    <div className="top-item-sub">{p.totalQty} dona sotildi</div>
                  </div>
                  <div className="top-item-right">
                    <div className="top-item-revenue">{fmt(p.totalRevenue)} so'm</div>
                    <div className="top-item-profit">+{fmt(p.totalProfit)} so'm</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slow products */}
          <div className="section-header">
            <div>
              <div className="section-title">Sotilmayotgan tovarlar</div>
              <div className="section-count">Hali sotilmagan yoki eng kam sotilgan</div>
            </div>
            <span style={{ color: 'var(--red)', fontSize: 18 }}>↘</span>
          </div>

          {slowProducts.filter(p => p.totalQty === 0).length === 0 ? (
            <div className="empty-state">✓ Barcha tovarlar sotilgan</div>
          ) : (
            slowProducts.filter(p => p.totalQty === 0).slice(0, 5).map((p, i) => (
              <div key={p.productId || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 6 }}>
                <div>
                  <div className="fw-bold">{p.productName}</div>
                  <div className="text-secondary text-xs">Sotilgan: {p.totalQty} dona</div>
                </div>
                <span className="fw-800 text-red">{p.stockQty} dona</span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
