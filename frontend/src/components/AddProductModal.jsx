import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AddProductModal({ onClose, onSaved, product }) {
  const isEdit = !!product;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    categoryId: product?.categoryId?._id || product?.categoryId || '',
    costPrice: product?.costPrice || '',
    sellPrice: product?.sellPrice || '',
    stockQty: product?.stockQty ?? '',
    minAlertQty: product?.minAlertQty || 2,
    barcode: product?.barcode || '',
    unit: product?.unit || 'dona',
  });

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.costPrice || !form.sellPrice) return;
    setLoading(true);
    try {
      const data = {
        ...form,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty) || 0,
        minAlertQty: Number(form.minAlertQty) || 2,
        categoryId: form.categoryId || undefined,
      };
      if (isEdit) {
        await api.put(`/products/${product._id}`, data);
      } else {
        await api.post('/products', data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h2 className="modal-title">
          {isEdit ? '✏️ Tovarni tahrirlash' : '➕ Yangi tovar qo\'shish'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tovar nomi *</label>
            <input className="form-input" placeholder="Masalan: Coca Cola 0.5L" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Kategoriya</label>
            <select className="form-select" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">Umumiy</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tannarx (so'm) *</label>
              <input className="form-input" type="number" placeholder="0" value={form.costPrice}
                onChange={e => set('costPrice', e.target.value)} required min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Sotuv narxi (so'm) *</label>
              <input className="form-input" type="number" placeholder="0" value={form.sellPrice}
                onChange={e => set('sellPrice', e.target.value)} required min="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Qoldiq (dona)</label>
              <input className="form-input" type="number" placeholder="0" value={form.stockQty}
                onChange={e => set('stockQty', e.target.value)} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Kam qolish chegarasi</label>
              <input className="form-input" type="number" placeholder="2" value={form.minAlertQty}
                onChange={e => set('minAlertQty', e.target.value)} min="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">O'lchov birligi</label>
              <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {['dona', 'kg', 'litr', 'metr', 'paket', 'quti'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Shtrix-kod</label>
              <input className="form-input" placeholder="Ixtiyoriy" value={form.barcode}
                onChange={e => set('barcode', e.target.value)} />
            </div>
          </div>
          {form.costPrice && form.sellPrice && Number(form.sellPrice) > 0 && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Foyda: </span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                {(Number(form.sellPrice) - Number(form.costPrice)).toLocaleString('uz-UZ')} so'm
                ({Number(form.costPrice) > 0 ? (((Number(form.sellPrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
