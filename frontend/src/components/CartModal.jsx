import React, { useState } from 'react';
import api from '../api';
import { useApp } from '../context/AppContext';

const fmt = n => Number(n).toLocaleString('uz-UZ');

export default function CartModal({ onClose, onSaleComplete }) {
  const { cart, updateCartQty, removeFromCart, clearCart, cartTotal, showToast } = useApp();
  const [paymentType, setPaymentType] = useState('naqd');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const finalTotal = cartTotal - (Number(discount) || 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const items = cart.map(item => ({ productId: item._id, quantity: item.cartQty }));
      const res = await api.post('/sales', {
        items, paymentType, discount: Number(discount) || 0, customerName
      });
      setReceipt(res.data);
      clearCart();
      showToast('Sotuv muvaffaqiyatli amalga oshirildi! ✓', 'success');
      if (onSaleComplete) onSaleComplete();
    } catch (err) {
      showToast(err.response?.data?.message || 'Xato yuz berdi!', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (receipt) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ textAlign: 'center' }}>
          <div className="modal-handle" />
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h2 className="modal-title" style={{ textAlign: 'center' }}>Sotuv amalga oshirildi!</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20, textAlign: 'left' }}>
            <div className="flex-between mb-8">
              <span className="text-secondary text-sm">Chek raqami:</span>
              <span className="fw-bold text-gold">{receipt.receiptNo}</span>
            </div>
            <div className="flex-between mb-8">
              <span className="text-secondary text-sm">Jami summa:</span>
              <span className="fw-800" style={{ fontSize: 18 }}>{fmt(receipt.totalAmount)} so'm</span>
            </div>
            <div className="flex-between mb-8">
              <span className="text-secondary text-sm">To'lov turi:</span>
              <span className="fw-bold" style={{ textTransform: 'capitalize' }}>
                {receipt.paymentType === 'naqd' ? '💵 Naqd' : receipt.paymentType === 'karta' ? '💳 Karta' : '📋 Nasiya'}
              </span>
            </div>
            <div className="flex-between">
              <span className="text-secondary text-sm">Sof foyda:</span>
              <span className="fw-bold text-green">+{fmt(receipt.totalProfit)} so'm</span>
            </div>
          </div>
          <button className="btn btn-gold w-full" style={{ justifyContent: 'center' }} onClick={onClose}>
            ✓ Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="flex-between mb-16">
          <h2 className="modal-title" style={{ marginBottom: 0 }}>🛒 Savat ({cart.length} tovar)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <p>Savat bo'sh</p>
          </div>
        ) : (
          <>
            <div>
              {cart.map(item => (
                <div key={item._id} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">{fmt(item.sellPrice)} so'm / dona</div>
                  </div>
                  <div className="cart-qty-controls">
                    <button className="qty-btn" onClick={() => updateCartQty(item._id, -1)}>−</button>
                    <span className="qty-display">{item.cartQty}</span>
                    <button className="qty-btn"
                      onClick={() => item.cartQty < item.stockQty && updateCartQty(item._id, 1)}
                      style={{ opacity: item.cartQty >= item.stockQty ? 0.4 : 1 }}>+</button>
                  </div>
                  <div className="cart-item-total">{fmt(item.sellPrice * item.cartQty)} so'm</div>
                  <button onClick={() => removeFromCart(item._id)}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* To'lov turi */}
            <div className="form-group">
              <label className="form-label">To'lov turi</label>
              <div className="payment-tabs">
                {[['naqd', '💵 Naqd'], ['karta', '💳 Karta'], ['nasiya', '📋 Nasiya']].map(([val, label]) => (
                  <button key={val} className={`pay-tab${paymentType === val ? ' active' : ''}`}
                    onClick={() => setPaymentType(val)}>{label}</button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Chegirma (so'm)</label>
                <input className="form-input" type="number" placeholder="0" min="0"
                  value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mijoz ismi</label>
                <input className="form-input" placeholder="Ixtiyoriy"
                  value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 16 }}>
              <div className="flex-between mb-8">
                <span className="text-secondary text-sm">Jami:</span>
                <span className="fw-bold">{fmt(cartTotal)} so'm</span>
              </div>
              {Number(discount) > 0 && (
                <div className="flex-between mb-8">
                  <span className="text-secondary text-sm">Chegirma:</span>
                  <span className="fw-bold text-red">−{fmt(Number(discount))} so'm</span>
                </div>
              )}
              <div className="flex-between">
                <span className="fw-800">To'lash kerak:</span>
                <span className="fw-800" style={{ fontSize: 20, color: 'var(--gold)' }}>{fmt(finalTotal)} so'm</span>
              </div>
            </div>

            <button className="btn btn-gold w-full" style={{ justifyContent: 'center', padding: '14px', fontSize: 16 }}
              onClick={handleCheckout} disabled={loading}>
              {loading ? 'Amalga oshirilmoqda...' : `✓ To'lash — ${fmt(finalTotal)} so'm`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
