import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';
import AddExpenseModal from '../components/AddExpenseModal';

const fmt = n => Number(n).toLocaleString('uz-UZ');

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
  </svg>
);

export default function XarajatPage() {
  const { showToast } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data.expenses);
      setTotal(res.data.total);
    } catch {
      showToast('Xarajatlarni yuklashda xato', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id, title) => {
    if (!confirm(`"${title}" xarajatini o'chirmoqchimisiz?`)) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast('Xarajat o\'chirildi', 'info');
      fetchExpenses();
    } catch {
      showToast('O\'chirishda xato!', 'error');
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="brand-label">ZARNO</div>
          <h1 className="page-title">Xarajat</h1>
          <div className="page-subtitle">Savdo pulidan chiqqan xarajatlar</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAddModal(true)}>
          + Xarajat
        </button>
      </div>

      {/* Total card */}
      <div className="hero-card" style={{ background: 'linear-gradient(135deg, #1a0d1a 0%, #2a1520 100%)', borderColor: 'rgba(239,68,68,0.2)', marginBottom: 20 }}>
        <div className="hero-label">Jami Xarajat</div>
        <div className="hero-value" style={{ color: 'var(--red)' }}>{fmt(total)} so'm</div>
        <div className="hero-sub">Barcha vaqt davomida</div>
      </div>

      {/* Expenses list */}
      {loading ? <div className="spinner" /> : expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💸</div>
          <p>Xarajatlar yo'q</p>
        </div>
      ) : (
        expenses.map(exp => (
          <div key={exp._id} className="expense-card">
            <div className="expense-icon"><WalletIcon /></div>
            <div className="expense-info">
              <div className="expense-name">{exp.title}</div>
              <div className="expense-date">{formatDate(exp.createdAt)}</div>
              {exp.category && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{exp.category}</div>}
            </div>
            <div>
              <div className="expense-amount">−{fmt(exp.amount)} so'm</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-icon btn-icon-ghost" onClick={() => handleDelete(exp._id, exp.title)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Logout */}
      <div style={{ marginTop: 32 }}>
        <button className="btn btn-ghost w-full" style={{ justifyContent: 'center', padding: '13px', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
          onClick={() => {
            if (confirm('Akkauntdan chiqmoqchimisiz?')) {
              showToast('Tizimdan chiqildi', 'info');
            }
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 8 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Akkauntdan chiqish
        </button>
      </div>

      {showAddModal && (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchExpenses(); }}
        />
      )}
    </div>
  );
}
