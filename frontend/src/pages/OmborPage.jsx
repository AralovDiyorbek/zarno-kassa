import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';
import AddProductModal from '../components/AddProductModal';

const fmt = n => Number(n).toLocaleString('uz-UZ');

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function OmborPage() {
  const { showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined };
      if (filter === 'low') params.low_stock = true;
      if (filter === 'out') params.out_of_stock = true;

      const [pRes, sRes, cRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/products/stats/summary'),
        api.get('/categories'),
      ]);
      setProducts(pRes.data);
      setStats(sRes.data);
      setCategories(cRes.data);
    } catch {
      showToast('Ma\'lumotlarni yuklashda xato', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchAll, 300);
    return () => clearTimeout(timer);
  }, [fetchAll]);

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" tovarini o'chirmoqchimisiz?`)) return;
    try {
      await api.delete(`/products/${id}`);
      showToast(`${name} o'chirildi`, 'info');
      fetchAll();
    } catch {
      showToast('O\'chirishda xato!', 'error');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post('/categories', { name: newCatName.trim() });
      setNewCatName('');
      showToast('Kategoriya qo\'shildi ✓', 'success');
      fetchAll();
    } catch {
      showToast('Xato!', 'error');
    }
  };

  const handleDeleteCat = async (id, name) => {
    if (!confirm(`"${name}" kategoriyasini o'chirmoqchimisiz?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchAll();
    } catch {}
  };

  const lowStockProducts = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minAlertQty);
  const outOfStockProducts = products.filter(p => p.stockQty === 0);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="brand-label">ZARNO</div>
          <h1 className="page-title">Ombor</h1>
          <div className="page-subtitle">Tovarlar va qoldiq</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAddModal(true)}>
          + Yangi tovar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="stat-grid-2">
            <div className="stat-card">
              <div className="stat-label">Ombor tannarxi</div>
              <div className="stat-value gold">{fmt(stats.totalCostValue)} so'm</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Sotuv qiymati</div>
              <div className="stat-value green">{fmt(stats.totalSellValue)} so'm</div>
            </div>
          </div>
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">Kam</div>
              <div className="stat-value red">{stats.lowStock} ta</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Qolmagan</div>
              <div className="stat-value red">{stats.outOfStock} ta</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Mavjud</div>
              <div className="stat-value green">{stats.inStock} ta</div>
            </div>
          </div>
        </>
      )}

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input className="search-input" placeholder="Ombordan qidirish..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {[['all', 'Barchasi'], ['low', 'Kam qolgan'], ['out', 'Tugagan']].map(([val, label]) => (
          <button key={val} className={`filter-chip${filter === val ? ' active' : ''}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {/* Products List */}
      <div className="section-header">
        <div>
          <div className="section-title">Tovarlar</div>
          <div className="section-count">{products.length} ta</div>
        </div>
      </div>

      {loading ? <div className="spinner" /> : products.length === 0 ? (
        <div className="empty-state">✓ Bu bo'limda mahsulot yo'q</div>
      ) : (
        products.map(product => (
          <div key={product._id} className="product-card" style={{ cursor: 'default' }}>
            <div className="product-icon">📦</div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
              <div className="product-category">{product.categoryName || 'Umumiy'}</div>
              <div className="product-category" style={{ color: 'var(--text-muted)' }}>
                Tannarx: {fmt(product.costPrice)} so'm
              </div>
              <div className="product-price">Sotuv: {fmt(product.sellPrice)} so'm</div>
            </div>
            <div className="product-right">
              <div>
                <div className={`stock-badge ${product.stockQty === 0 ? 'text-red' : product.stockQty <= product.minAlertQty ? 'text-gold' : ''}`}>
                  {product.stockQty}
                </div>
                <div className="stock-unit">{product.unit || 'dona'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-icon btn-icon-ghost" style={{ fontSize: 13 }}
                  onClick={() => setEditProduct(product)} title="Tahrirlash">✏️</button>
                <button className="btn-icon btn-icon-ghost"
                  onClick={() => handleDelete(product._id, product.name)} title="O'chirish">
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Low stock warning */}
      <div className="section-header mt-16">
        <div>
          <div className="section-title">Kam qolgan mahsulotlar</div>
          <div className="section-count">≤ {products[0]?.minAlertQty || 2} dona</div>
        </div>
      </div>
      {lowStockProducts.length === 0 ? (
        <div className="empty-state">✓ Kam qolgan mahsulot yo'q</div>
      ) : (
        lowStockProducts.map(p => (
          <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 6 }}>
            <span className="fw-bold">{p.name}</span>
            <span className="fw-800 text-gold">{p.stockQty} dona</span>
          </div>
        ))
      )}

      {/* Out of stock */}
      <div className="section-header mt-16">
        <div>
          <div className="section-title">Qolmagan mahsulotlar</div>
          <div className="section-count">{outOfStockProducts.length} ta</div>
        </div>
      </div>
      {outOfStockProducts.length === 0 ? (
        <div className="empty-state">✓ Qolmagan mahsulot yo'q</div>
      ) : (
        outOfStockProducts.map(p => (
          <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 6 }}>
            <span className="fw-bold">{p.name}</span>
            <span className="fw-800 text-red">0 dona</span>
          </div>
        ))
      )}

      {/* Categories */}
      <div className="section-header mt-16">
        <div className="section-title">Kategoriyalar</div>
        <button className="section-action" onClick={() => setShowCatModal(!showCatModal)}>Boshqarish</button>
      </div>

      {showCatModal && (
        <div className="card mb-16">
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="form-input" placeholder="Kategoriya nomi" value={newCatName}
              onChange={e => setNewCatName(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-gold" style={{ padding: '10px 16px' }}>+</button>
          </form>
          {categories.map(c => (
            <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{c.icon} {c.name}</span>
              <button onClick={() => handleDeleteCat(c._id, c.name)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          {categories.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Kategoriya yo'q</p>}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchAll(); showToast('Tovar qo\'shildi ✓', 'success'); }}
        />
      )}
      {editProduct && (
        <AddProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); fetchAll(); showToast('Tovar yangilandi ✓', 'success'); }}
        />
      )}
    </div>
  );
}
