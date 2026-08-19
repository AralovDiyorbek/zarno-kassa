import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';
import AddProductModal from '../components/AddProductModal';
import CartModal from '../components/CartModal';

const fmt = n => Number(n).toLocaleString('uz-UZ');

const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export default function KassaPage() {
  const { addToCart, cart, cartCount, showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { search: search || undefined } });
      setProducts(res.data);
    } catch {
      showToast('Tovarlarni yuklashda xato', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleAddToCart = (product) => {
    if (product.stockQty === 0) {
      showToast(`${product.name} omborda yo'q!`, 'error');
      return;
    }
    const inCart = cart.find(c => c._id === product._id);
    if (inCart && inCart.cartQty >= product.stockQty) {
      showToast('Omborda yetarli emas!', 'error');
      return;
    }
    addToCart(product);
    showToast(`${product.name} savatga qo'shildi ✓`, 'success');
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="brand-label">ZARNO</div>
          <h1 className="page-title">Kassa</h1>
          <div className="page-subtitle">Savdo qilish</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowAddModal(true)}>
          + Yangi tovar
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input className="search-input" placeholder="Tovar qidirish..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Products List */}
      <div className="section-header">
        <div>
          <div className="section-title">Tovarlar</div>
          <div className="section-count">{products.length} ta</div>
        </div>
        <span className="badge badge-green">Omborda bor</span>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📦</div>
          <p>Tovar topilmadi</p>
        </div>
      ) : (
        products.map(product => (
          <div key={product._id} className="product-card" onClick={() => handleAddToCart(product)}
            style={{ opacity: product.stockQty === 0 ? 0.5 : 1 }}>
            <div className="product-icon">📦</div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
              <div className="product-category">{product.categoryName || 'Umumiy'}</div>
              <div className="product-price">{fmt(product.sellPrice)} so'm</div>
            </div>
            <div className="product-right">
              <div>
                <div className="stock-badge">{product.stockQty}</div>
                <div className="stock-unit">{product.unit || 'dona'}</div>
              </div>
              <button className="btn-icon btn-icon-gold" onClick={e => { e.stopPropagation(); handleAddToCart(product); }}
                disabled={product.stockQty === 0} style={{ fontSize: 20, fontWeight: 800 }}>+</button>
            </div>
          </div>
        ))
      )}

      {/* Cart hint */}
      {cart.length === 0 && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>Tovalni bosib savatga qo'shing</span>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 99 }}>
          <button className="btn btn-gold w-full" style={{ justifyContent: 'space-between', padding: '14px 20px', fontSize: 15 }}
            onClick={() => setShowCart(true)}>
            <span>🛒 Savatni ko'rish ({cartCount} ta)</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchProducts(); showToast('Tovar qo\'shildi ✓', 'success'); }}
        />
      )}
      {showCart && (
        <CartModal
          onClose={() => setShowCart(false)}
          onSaleComplete={() => { fetchProducts(); }}
        />
      )}
    </div>
  );
}
