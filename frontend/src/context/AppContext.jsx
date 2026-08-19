import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ---- Toast ----
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // ---- Cart (Savat) ----
  const [cart, setCart] = useState([]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.cartQty >= product.stockQty) {
          return prev; // Omborda yetarli emas
        }
        return prev.map(item =>
          item._id === product._id
            ? { ...item, cartQty: item.cartQty + 1 }
            : item
        );
      }
      if (product.stockQty === 0) return prev;
      return [...prev, { ...product, cartQty: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((productId, delta) => {
    setCart(prev => prev
      .map(item => item._id === productId ? { ...item, cartQty: item.cartQty + delta } : item)
      .filter(item => item.cartQty > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => sum + item.sellPrice * item.cartQty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.cartQty, 0);

  return (
    <AppContext.Provider value={{
      toasts, showToast,
      cart, addToCart, updateCartQty, removeFromCart, clearCart, cartTotal, cartCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
