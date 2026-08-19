import React, { useState } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';

export default function AddExpenseModal({ onClose, onSaved }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Boshqa', note: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const cats = ['Ijara', 'Maosh', 'Kommunal', 'Transport', 'Reklama', 'Boshqa'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setLoading(true);
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
      showToast('Xarajat qo\'shildi ✓', 'success');
      onSaved();
    } catch {
      showToast('Xato yuz berdi!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h2 className="modal-title">➕ Yangi xarajat</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Xarajat nomi *</label>
            <input className="form-input" placeholder="Masalan: Ijara to'lovi" value={form.title}
              onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Summa (so'm) *</label>
            <input className="form-input" type="number" placeholder="0" value={form.amount}
              onChange={e => set('amount', e.target.value)} required min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Kategoriya</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Izoh</label>
            <textarea className="form-textarea" placeholder="Ixtiyoriy izoh..." value={form.note}
              onChange={e => set('note', e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Saqlanmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
