import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const API = process.env.EXPO_PUBLIC_API_URL || 'https://zarno-kassa.vercel.app/api';

const COLORS = {
  bg: "#061521",
  bg2: "#091B29",
  card: "#10283A",
  card2: "#143247",
  border: "#27475B",
  gold: "#D9A735",
  goldLight: "#F3C95C",
  white: "#FFFFFF",
  text: "#EAF2F7",
  muted: "#8FA8B9",
  green: "#35CF91",
  red: "#F16A72",
  orange: "#F0A252",
  blue: "#5BA7FF"
};

const { width, height } = Dimensions.get('window');

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const money = (amount) => {
  if (amount === undefined || amount === null) return '0 so\'m';
  return Number(amount).toLocaleString('ru-RU') + ' so\'m';
};

const parseNumber = (val) => {
  if (!val) return 0;
  const num = Number(val.toString().replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
};

const safeText = (text) => {
  return text ? text : '';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ==========================================
// SHARED COMPONENTS
// ==========================================
const Icon = ({ name, size = 24, color = COLORS.text, style }) => (
  <Ionicons name={name} size={size} color={color} style={style} />
);

const SectionTitle = ({ title, rightElement }) => (
  <View style={styles.sectionTitleContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {rightElement}
  </View>
);

const StatCard = ({ title, value, icon, color = COLORS.gold, subtitle }) => (
  <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statCardTitle} numberOfLines={1}>{title}</Text>
    </View>
    <Text style={styles.statCardValue} numberOfLines={1}>{value}</Text>
    {subtitle ? <Text style={styles.statCardSubtitle}>{subtitle}</Text> : null}
  </View>
);

const EmptyState = ({ icon = 'folder-open-outline', title = 'Ma\'lumot topilmadi', message = 'Hozircha bu yerda hech narsa yo\'q' }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyStateIcon}>
      <Icon name={icon} size={48} color={COLORS.muted} />
    </View>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateMessage}>{message}</Text>
  </View>
);

const PrimaryButton = ({ title, onPress, icon, color = COLORS.gold, disabled = false, style, loading = false, textColor }) => {
  const finalTextColor = textColor || (color === COLORS.bg || color === COLORS.bg2 ? COLORS.white : COLORS.bg);
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        { backgroundColor: disabled ? COLORS.muted : color },
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={finalTextColor} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={finalTextColor} style={{ marginRight: 8 }} />}
          <Text style={[styles.primaryBtnText, { color: finalTextColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // --- TABS ---
  // kassa | ombor | kirim | hisobot | xarajat
  const [activeTab, setActiveTab] = useState('kassa');
  const [monitoringTab, setMonitoringTab] = useState('sotuvlar'); // 'kirim' or 'sotuvlar'

  // --- GLOBAL STATE ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [debts, setDebts] = useState([]);
  
  // Reports
  const [todayStats, setTodayStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [slowProducts, setSlowProducts] = useState([]);
  const [needToBuy, setNeedToBuy] = useState([]);
  const [dailyChart, setDailyChart] = useState([]);

  // --- KASSA STATE ---
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  
  // Checkout state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState('naqd'); // naqd | karta | nasiya
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Receipt state
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // --- OMBOR STATE ---
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', categoryId: '', costPrice: '', sellPrice: '', stockQty: '', 
    barcode: '', minAlertQty: '', unit: 'dona', description: ''
  });

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'cube-outline', color: COLORS.gold });

  // --- KIRIM STATE ---
  const [stockEntryModalVisible, setStockEntryModalVisible] = useState(false);
  const [entryForm, setEntryForm] = useState({
    productId: '', quantity: '', costPrice: '', supplierName: '', note: ''
  });

  // --- XARAJAT STATE ---
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: '', note: '' });

  // ==========================================
  // API HELPERS
  // ==========================================
  const fetchApi = async (endpoint, method = 'GET', body = null) => {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${API}${endpoint}`, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Server xatosi');
      }
      return await res.json();
    } catch (e) {
      console.error(`API Error [${method} ${endpoint}]:`, e);
      Alert.alert('Xatolik', e.message);
      return null;
    }
  };

  const loadProducts = async () => {
    const data = await fetchApi('/products');
    if (data) setProducts(data);
  };

  const loadCategories = async () => {
    const data = await fetchApi('/categories');
    if (data) setCategories(data);
  };

  const loadSales = async () => {
    const data = await fetchApi('/sales');
    if (data) setSales(data);
  };

  const loadExpenses = async () => {
    const data = await fetchApi('/expenses');
    if (data && data.expenses) setExpenses(data.expenses);
  };

  const loadStockEntries = async () => {
    const data = await fetchApi('/stock-entries');
    if (data && data.entries) setStockEntries(data.entries);
  };

  const loadDebts = async () => {
    const data = await fetchApi('/sales/debts');
    if (data) setDebts(data);
  };

  const loadReports = async () => {
    const [today, top, slow, need, chart] = await Promise.all([
      fetchApi('/reports/today'),
      fetchApi('/reports/top-products?limit=5'),
      fetchApi('/reports/slow-products'),
      fetchApi('/reports/need-to-buy'),
      fetchApi('/reports/daily-chart')
    ]);
    if (today) setTodayStats(today);
    if (top) setTopProducts(top);
    if (slow) setSlowProducts(slow);
    if (need) setNeedToBuy(need);
    if (chart) setDailyChart(chart);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadProducts(),
      loadCategories(),
      loadSales(),
      loadExpenses(),
      loadStockEntries(),
      loadDebts(),
      loadReports()
    ]);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProducts(),
      loadCategories(),
      loadSales(),
      loadExpenses(),
      loadStockEntries(),
      loadDebts(),
      loadReports()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const payDebt = async (id) => {
    const res = await fetchApi(`/sales/${id}/pay-debt`, 'PUT');
    if (res) {
      loadDebts();
      loadReports();
      loadSales();
    }
  };

  // ==========================================
  // KASSA LOGIC
  // ==========================================
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.barcode && p.barcode.includes(searchQuery));
      const matchesCat = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategoryId]);

  const addToCart = (product) => {
    if (product.stockQty <= 0) {
      Alert.alert('Ogohlantirish', 'Omborda mahsulot qolmagan!');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQty) {
          Alert.alert('Ogohlantirish', 'Ombordagi miqdordan ortiq qo\'shib bo\'lmaydi!');
          return prev;
        }
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartItemQty = (id, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item._id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stockQty) {
            Alert.alert('Ogohlantirish', 'Ombordagi miqdordan ortiq qo\'shib bo\'lmaydi!');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  const discountValue = parseNumber(discount);
  const finalTotal = Math.max(0, cartTotal - discountValue);
  const receivedVal = parseNumber(receivedAmount);
  const changeAmount = receivedVal - finalTotal;

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    if (paymentType === 'nasiya' && !customerName.trim()) {
      Alert.alert('Xato', 'Nasiya uchun mijoz ismini kiritish shart!');
      return;
    }

    setCheckoutLoading(true);
    const payload = {
      items: cart.map(c => ({ productId: c._id, quantity: c.quantity })),
      paymentType,
      discount: discountValue,
      customerName,
      customerPhone,
      receivedAmount: paymentType === 'naqd' ? receivedVal : undefined,
      changeAmount: paymentType === 'naqd' ? Math.max(0, changeAmount) : undefined,
      note: saleNote
    };

    const res = await fetchApi('/sales', 'POST', payload);
    setCheckoutLoading(false);

    if (res) {
      setLastReceipt(res.sale || res); 
      setCart([]);
      setCheckoutModalVisible(false);
      setPaymentType('naqd');
      setDiscount('0');
      setCustomerName('');
      setCustomerPhone('');
      setReceivedAmount('');
      setSaleNote('');
      setReceiptModalVisible(true);
      
      // Refresh data in background
      loadProducts();
      loadSales();
      loadReports();
      if (paymentType === 'nasiya') {
        loadDebts();
      }
    }
  };

  // ==========================================
  // OMBOR LOGIC (Products & Categories)
  // ==========================================
  const openProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      const catId = typeof prod.categoryId === 'object' ? prod.categoryId?._id : (prod.categoryId || '');
      setProductForm({
        name: prod.name || '',
        categoryId: catId || (categories.length > 0 ? categories[0]._id : ''),
        costPrice: (prod.costPrice ?? '').toString(),
        sellPrice: (prod.sellPrice ?? '').toString(),
        stockQty: (prod.stockQty ?? '').toString(),
        barcode: prod.barcode || '',
        minAlertQty: (prod.minAlertQty ?? 2).toString(),
        unit: prod.unit || 'dona',
        description: prod.description || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '', 
        categoryId: categories.length > 0 ? categories[0]._id : '', 
        costPrice: '', 
        sellPrice: '', 
        stockQty: '0', 
        barcode: '', 
        minAlertQty: '2', 
        unit: 'dona', 
        description: ''
      });
    }
    setProductModalVisible(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.name.trim()) {
      Alert.alert('Xato', 'Mahsulot nomini kiriting');
      return;
    }
    if (productForm.costPrice === undefined || productForm.costPrice === '') {
      Alert.alert('Xato', 'Kirim (tannarx) narxini kiriting');
      return;
    }
    if (productForm.sellPrice === undefined || productForm.sellPrice === '') {
      Alert.alert('Xato', 'Sotish narxini kiriting');
      return;
    }

    const payload = {
      ...productForm,
      name: productForm.name.trim(),
      categoryId: productForm.categoryId || (categories.length > 0 ? categories[0]._id : null),
      costPrice: parseNumber(productForm.costPrice),
      sellPrice: parseNumber(productForm.sellPrice),
      stockQty: parseNumber(productForm.stockQty),
      minAlertQty: parseNumber(productForm.minAlertQty)
    };

    let res;
    if (editingProduct) {
      res = await fetchApi(`/products/${editingProduct._id}`, 'PUT', payload);
    } else {
      res = await fetchApi('/products', 'POST', payload);
    }

    if (res) {
      setProductModalVisible(false);
      loadProducts();
      loadReports();
    }
  };

  const deleteProduct = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Rostdan ham bu mahsulotni o\'chirmoqchimisiz?')) {
        fetchApi(`/products/${id}`, 'DELETE').then(res => {
          if (res) {
            loadProducts();
            loadReports();
          }
        });
      }
    } else {
      Alert.alert('O\'chirish', 'Rostdan ham bu mahsulotni o\'chirmoqchimisiz?', [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'O\'chirish', style: 'destructive', onPress: async () => {
            const res = await fetchApi(`/products/${id}`, 'DELETE');
            if (res) {
              loadProducts();
              loadReports();
            }
        }}
      ]);
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name) {
      Alert.alert('Xato', 'Kategoriya nomini kiriting');
      return;
    }
    const res = await fetchApi('/categories', 'POST', categoryForm);
    if (res) {
      setCategoryModalVisible(false);
      setCategoryForm({ name: '', icon: 'cube-outline', color: COLORS.gold });
      loadCategories();
    }
  };

  // ==========================================
  // KIRIM LOGIC (Stock Entries)
  // ==========================================
  const openKirimModal = () => {
    setEntryForm({ productId: '', quantity: '', costPrice: '', supplierName: '', note: '' });
    setStockEntryModalVisible(true);
  };

  const saveKirim = async () => {
    if (!entryForm.productId || !entryForm.quantity || !entryForm.costPrice) {
      Alert.alert('Xato', 'Mahsulot, miqdor va kelish narxini kiriting');
      return;
    }

    const payload = {
      ...entryForm,
      quantity: parseNumber(entryForm.quantity),
      costPrice: parseNumber(entryForm.costPrice)
    };

    const res = await fetchApi('/stock-entries', 'POST', payload);
    if (res) {
      setStockEntryModalVisible(false);
      loadStockEntries();
      loadProducts();
      loadReports();
    }
  };

  // ==========================================
  // XARAJAT LOGIC (Expenses)
  // ==========================================
  const saveExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount) {
      Alert.alert('Xato', 'Sarlavha va summani kiriting');
      return;
    }

    const payload = {
      ...expenseForm,
      amount: parseNumber(expenseForm.amount)
    };

    const res = await fetchApi('/expenses', 'POST', payload);
    if (res) {
      setExpenseModalVisible(false);
      setExpenseForm({ title: '', amount: '', category: '', note: '' });
      loadExpenses();
      loadReports();
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderKassa = () => (
    <View style={styles.pageContainer}>
      <View style={styles.kassaHeader}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Mahsulot yoki shtrix kod qidirish..."
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.kassaCategories}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[styles.catPill, !selectedCategoryId && styles.catPillActive]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text style={[styles.catPillText, !selectedCategoryId && styles.catPillTextActive]}>Barchasi</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat._id}
              style={[styles.catPill, selectedCategoryId === cat._id && styles.catPillActive, { borderColor: cat.color }]}
              onPress={() => setSelectedCategoryId(cat._id)}
            >
              <Icon name={cat.icon} size={16} color={selectedCategoryId === cat._id ? COLORS.bg : cat.color} style={{ marginRight: 6 }} />
              <Text style={[styles.catPillText, selectedCategoryId === cat._id && styles.catPillTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FAST ACCESS / TEZKOR OMMABOP */}
      <View style={styles.fastAccessContainer}>
        <Text style={styles.fastAccessTitle}>⚡ Tezkor / Ommabop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {(topProducts.length > 0 ? topProducts : products.slice(0, 10)).map(p => (
            <TouchableOpacity key={p._id} style={styles.fastAccessCard} onPress={() => addToCart(p)}>
              <Text style={styles.fastAccessName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.fastAccessPrice}>{money(p.sellPrice)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Products Grid */}
        <View style={{ flex: 2 }}>
          {filteredProducts.length === 0 ? (
            <EmptyState icon="basket-outline" title="Mahsulot topilmadi" />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item._id}
              numColumns={2}
              contentContainerStyle={styles.productsGrid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.productCard, item.stockQty <= 0 && { opacity: 0.5 }]} 
                  onPress={() => addToCart(item)}
                >
                  <View style={styles.productCardHeader}>
                    <Text style={styles.productCardTitle} numberOfLines={2}>{item.name}</Text>
                    {item.stockQty <= 0 && <View style={styles.badgeRed}><Text style={styles.badgeText}>Tugagan</Text></View>}
                  </View>
                  <View style={{ marginTop: 'auto' }}>
                    <Text style={styles.productCardPrice}>{money(item.sellPrice)}</Text>
                    <Text style={styles.productCardStock}>Qoldiq: {item.stockQty} {item.unit}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Cart Sidebar */}
        <View style={styles.cartSidebar}>
          <Text style={styles.cartTitle}>Savatcha</Text>
          {cart.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="cart-outline" size={48} color={COLORS.muted} />
              <Text style={{ color: COLORS.muted, marginTop: 12 }}>Savatcha bo'sh</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={item => item._id}
                style={{ flex: 1 }}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>{money(item.sellPrice)}</Text>
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartItemQty(item._id, -1)}>
                        <Icon name="remove" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartItemQty(item._id, 1)}>
                        <Icon name="add" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <View style={styles.cartFooter}>
                <View style={styles.cartRow}>
                  <Text style={styles.cartLabel}>Jami:</Text>
                  <Text style={styles.cartValue}>{money(cartTotal)}</Text>
                </View>
                <PrimaryButton 
                  title="To'lov qilish" 
                  icon="wallet-outline" 
                  onPress={() => setCheckoutModalVisible(true)}
                  style={{ marginTop: 12 }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const renderOmbor = () => (
    <View style={styles.pageContainer}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Ombor</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PrimaryButton title="Kategoriya" icon="folder-open-outline" color={COLORS.blue} onPress={() => setCategoryModalVisible(true)} />
          <PrimaryButton title="Mahsulot qo'shish" icon="add" onPress={() => openProductModal()} />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listIconBox}>
              <Icon name="cube-outline" size={24} color={COLORS.gold} />
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{item.name}</Text>
              <Text style={styles.listSubtitle}>Kategoriya: {item.categoryName || 'Noma\'lum'} | Shtrix: {item.barcode || 'Yo\'q'}</Text>
            </View>
            <View style={styles.listPrices}>
              <Text style={styles.listPriceSell}>{money(item.sellPrice)}</Text>
              <Text style={styles.listPriceCost}>Kirim: {money(item.costPrice)}</Text>
            </View>
            <View style={[styles.listStockBox, item.stockQty <= (item.minAlertQty || 0) && { backgroundColor: COLORS.red + '20', borderColor: COLORS.red }]}>
              <Text style={[styles.listStock, item.stockQty <= (item.minAlertQty || 0) && { color: COLORS.red }]}>{item.stockQty} {item.unit}</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openProductModal(item)}>
              <Icon name="create-outline" size={20} color={COLORS.blue} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => deleteProduct(item._id)}>
              <Icon name="trash-outline" size={20} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderMonitoring = () => (
    <View style={styles.pageContainer}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Monitoring</Text>
        <PrimaryButton title="Yangi kirim" icon="download-outline" color={COLORS.green} onPress={openKirimModal} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: COLORS.bg2, padding: 10 }}>
        <TouchableOpacity 
          style={[styles.unitBtn, { flex: 1, marginRight: 5 }, monitoringTab === 'sotuvlar' && styles.unitBtnActive]} 
          onPress={() => setMonitoringTab('sotuvlar')}
        >
          <Text style={[styles.unitText, monitoringTab === 'sotuvlar' && styles.unitTextActive]}>Sotuvlar (Chiqim)</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.unitBtn, { flex: 1, marginLeft: 5 }, monitoringTab === 'kirim' && styles.unitBtnActive]} 
          onPress={() => setMonitoringTab('kirim')}
        >
          <Text style={[styles.unitText, monitoringTab === 'kirim' && styles.unitTextActive]}>Ombor (Kirim)</Text>
        </TouchableOpacity>
      </View>

      {monitoringTab === 'kirim' ? (
        <>
          <View style={[styles.statsRow, { marginTop: 16, paddingHorizontal: 16 }]}>
            <View style={styles.statsCol}>
              <StatCard title="Jami kirimlar" value={stockEntries.length.toString()} icon="layers-outline" color={COLORS.green} />
            </View>
            <View style={styles.statsCol}>
              <StatCard 
                title="Umumiy summa" 
                value={money(stockEntries.reduce((sum, e) => sum + (e.quantity * e.costPrice), 0))} 
                icon="cash-outline" 
                color={COLORS.gold} 
              />
            </View>
          </View>

          <FlatList
            data={stockEntries}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<EmptyState icon="download-outline" title="Kirim yo'q" message="Hali omborga mahsulot kiritilmagan" />}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={[styles.listIconBox, { backgroundColor: COLORS.green + '20' }]}>
                  <Icon name="arrow-down" size={24} color={COLORS.green} />
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{item.productName}</Text>
                  <Text style={styles.listSubtitle}>{formatDate(item.createdAt)} | Ta'minotchi: {item.supplierName || 'Noma\'lum'}</Text>
                </View>
                <View style={styles.listPrices}>
                  <Text style={styles.listPriceSell}>{money(item.costPrice)} x {item.quantity}</Text>
                  <Text style={styles.listPriceCost}>Jami: {money(item.quantity * item.costPrice)}</Text>
                </View>
              </View>
            )}
          />
        </>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="Savdo yo'q" message="Hali hech narsa sotilmagan" />}
          renderItem={({ item: sale }) => (
            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => {
                setLastReceipt(sale);
                setReceiptModalVisible(true);
              }}
            >
              <View style={[styles.listIconBox, { backgroundColor: COLORS.blue + '20' }]}>
                <Icon name="receipt-outline" size={24} color={COLORS.blue} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{sale.receiptNumber || `CHK-${sale._id.substring(sale._id.length - 5)}`}</Text>
                <Text style={styles.listSubtitle}>{formatDate(sale.createdAt)} {formatTime(sale.createdAt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.listPriceSell, { color: COLORS.white }]}>{money(sale.totalAmount)}</Text>
                <View style={[styles.badge, sale.paymentType === 'nasiya' ? styles.badgeOrange : styles.badgeGreen]}>
                  <Text style={[styles.badgeTextMini, sale.paymentType === 'nasiya' ? { color: COLORS.orange } : { color: COLORS.green }]}>
                    {sale.paymentType.toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderReport = () => {
    if (!todayStats) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.gold} />;

    // Simple Bar Chart Logic
    const chartMax = dailyChart.length > 0 
      ? Math.max(...dailyChart.map(d => d.totalAmount))
      : 1;

    return (
      <ScrollView style={styles.pageContainer} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.pageTitle}>Bugungi hisobot</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statsCol}>
            <StatCard title="Savdo" value={money(todayStats.sales.totalAmount)} subtitle={`${todayStats.sales.count} ta chek`} icon="cart-outline" color={COLORS.blue} />
          </View>
          <View style={styles.statsCol}>
            <StatCard title="Sof foyda" value={money(todayStats.sales.totalProfit)} icon="trending-up-outline" color={COLORS.green} />
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statsCol}>
            <StatCard title="Xarajatlar" value={money(todayStats.expenses.total)} subtitle={`${todayStats.expenses.count} ta xarajat`} icon="wallet-outline" color={COLORS.red} />
          </View>
          <View style={styles.statsCol}>
            <StatCard title="Kirimlar" value={money(todayStats.stockEntries.totalCost)} subtitle={`${todayStats.stockEntries.totalQty} ta tovar`} icon="download-outline" color={COLORS.orange} />
          </View>
        </View>

        <SectionTitle title="So'nggi 30 kunlik savdo" />
        <View style={styles.chartCard}>
          {dailyChart.length === 0 ? (
            <Text style={{ color: COLORS.muted, textAlign: 'center', padding: 20 }}>Ma'lumot yo'q</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
              {dailyChart.map((day, idx) => {
                const heightPercent = (day.totalAmount / chartMax) * 100;
                return (
                  <View key={idx} style={styles.barContainer}>
                    <View style={styles.barTooltip}>
                      <Text style={styles.barTooltipText}>{money(day.totalAmount)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{formatDate(day._id || day.date).substring(0,5)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* QARZ DAFTARI */}
        <SectionTitle title="Nasiyalar (Qarz daftari)" />
        {debts.length === 0 ? (
          <View style={styles.card}><Text style={{ color: COLORS.muted }}>Nasiyalar yo'q</Text></View>
        ) : (
          debts.map((item) => (
            <View key={item._id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Text style={styles.listTitle}>{item.customerName}</Text>
                  {item.customerPhone ? <Text style={styles.listSubtitle}>{item.customerPhone}</Text> : null}
                  <Text style={styles.listSubtitle}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: COLORS.red, fontWeight: 'bold', fontSize: 16 }}>{money(item.totalAmount - (item.paidAmount || 0))}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>Jami: {money(item.totalAmount)}</Text>
                </View>
              </View>
              <PrimaryButton 
                title="Qarz yopildi (To'landi)" 
                icon="checkmark-done" 
                color={COLORS.green} 
                style={{ marginTop: 8 }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm("Qarzni to'liq yopmoqchimisiz?")) {
                      payDebt(item._id);
                    }
                  } else {
                    Alert.alert("Tasdiqlash", "Qarzni to'liq yopmoqchimisiz?", [
                      { text: "Yo'q", style: 'cancel' },
                      { text: "Ha", onPress: () => payDebt(item._id) }
                    ]);
                  }
                }} 
              />
            </View>
          ))
        )}


        <SectionTitle title="Kam qolgan mahsulotlar (Sotib olish kerak)" />
        {needToBuy.length === 0 ? (
          <View style={styles.card}><Text style={{ color: COLORS.muted }}>Hammasi joyida</Text></View>
        ) : (
          needToBuy.map(item => (
            <View key={item._id} style={styles.listItem}>
              <View style={[styles.listIconBox, { backgroundColor: COLORS.red + '20' }]}>
                <Icon name="alert-circle-outline" size={24} color={COLORS.red} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>Minimal: {item.minAlertQty} {item.unit}</Text>
              </View>
              <Text style={[styles.listStock, { color: COLORS.red, fontWeight: 'bold' }]}>{item.stockQty} qolgan</Text>
            </View>
          ))
        )}

        <SectionTitle title="Eng ko'p sotilganlar (Top 5)" />
        {topProducts.length === 0 ? (
          <View style={styles.card}><Text style={{ color: COLORS.muted }}>Ma'lumot yo'q</Text></View>
        ) : (
          topProducts.map((item, idx) => (
            <View key={item._id} style={styles.listItem}>
              <Text style={styles.rankText}>{idx + 1}</Text>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{item.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{item.totalQuantitySold} {item.unit}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>{money(item.totalRevenue)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderExpenses = () => (
    <View style={styles.pageContainer}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Xarajatlar</Text>
        <PrimaryButton title="Xarajat qo'shish" icon="add" color={COLORS.red} onPress={() => setExpenseModalVisible(true)} />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="Xarajat yo'q" />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: COLORS.red + '20' }]}>
              <Icon name="arrow-up" size={24} color={COLORS.red} />
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listSubtitle}>{formatDate(item.createdAt)} {formatTime(item.createdAt)} | {item.category}</Text>
            </View>
            <Text style={[styles.listPriceSell, { color: COLORS.red }]}>- {money(item.amount)}</Text>
          </View>
        )}
      />
    </View>
  );

  // ==========================================
  // MODALS
  // ==========================================
  
  // Checkout Modal
  const renderCheckoutModal = () => (
    <Modal visible={checkoutModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: width * 0.85, maxWidth: 500, maxHeight: height * 0.9 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>To'lovni tasdiqlash</Text>
            <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Umumiy summa:</Text>
              <Text style={styles.summaryValue}>{money(cartTotal)}</Text>
            </View>

            <Text style={styles.inputLabel}>Chegirma (so'm)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              value={discount}
              onChangeText={setDiscount}
            />

            <View style={[styles.summaryBox, { backgroundColor: COLORS.gold + '20', marginTop: 10 }]}>
              <Text style={[styles.summaryLabel, { color: COLORS.gold }]}>To'lanadigan summa:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.gold, fontSize: 24 }]}>{money(finalTotal)}</Text>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 20 }]}>To'lov turi</Text>
            <View style={styles.paymentTypeRow}>
              {[
                { id: 'naqd', label: 'Naqd pul', icon: 'cash-outline' },
                { id: 'karta', label: 'Plastik karta', icon: 'card-outline' },
                { id: 'nasiya', label: 'Nasiya (Qarz)', icon: 'time-outline' }
              ].map(pt => (
                <TouchableOpacity
                  key={pt.id}
                  style={[styles.paymentTypeBtn, paymentType === pt.id && styles.paymentTypeBtnActive]}
                  onPress={() => setPaymentType(pt.id)}
                >
                  <Icon name={pt.icon} size={20} color={paymentType === pt.id ? COLORS.bg : COLORS.text} />
                  <Text style={[styles.paymentTypeText, paymentType === pt.id && styles.paymentTypeTextActive]}>{pt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* QAYTIM HISOBLAGICH */}
            {paymentType === 'naqd' && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.inputLabel}>Mijoz bergan summa (naqd pul)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  value={receivedAmount}
                  onChangeText={setReceivedAmount}
                />
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setReceivedAmount(finalTotal.toString())}><Text style={styles.presetText}>Aniq summa</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setReceivedAmount('50000')}><Text style={styles.presetText}>50 000</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setReceivedAmount('100000')}><Text style={styles.presetText}>100 000</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setReceivedAmount('200000')}><Text style={styles.presetText}>200 000</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setReceivedAmount('500000')}><Text style={styles.presetText}>500 000</Text></TouchableOpacity>
                </View>
                
                {receivedVal >= finalTotal && finalTotal > 0 ? (
                  <View style={styles.changeBoxGreen}>
                    <Text style={styles.changeBoxText}>Qaytim: {money(changeAmount)}</Text>
                  </View>
                ) : (receivedVal > 0 && receivedVal < finalTotal ? (
                  <View style={styles.changeBoxRed}>
                    <Text style={styles.changeBoxText}>Kam: {money(finalTotal - receivedVal)}</Text>
                  </View>
                ) : null)}
              </View>
            )}

            {paymentType === 'nasiya' && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.inputLabel}>Mijoz ismi * (Majburiy)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mijoz ismini kiriting"
                  placeholderTextColor={COLORS.muted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
                <Text style={styles.inputLabel}>Telefon raqami</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                />
              </View>
            )}

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Izoh (ixtiyoriy)</Text>
            <TextInput
              style={styles.input}
              placeholder="Qo'shimcha ma'lumot..."
              placeholderTextColor={COLORS.muted}
              value={saleNote}
              onChangeText={setSaleNote}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <PrimaryButton 
              title="Tasdiqlash va Sotish" 
              icon="checkmark-circle-outline" 
              onPress={handleCheckoutSubmit}
              loading={checkoutLoading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Receipt Modal
  const renderReceiptModal = () => (
    <Modal visible={receiptModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.receiptPaper}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={styles.receiptLogo}>
              <Icon name="cube" size={32} color={COLORS.bg} />
            </View>
            <Text style={styles.receiptTitle}>ZARNO KASSA</Text>
            <Text style={styles.receiptSubtitle}>Xarid uchun rahmat!</Text>
            {lastReceipt && (
              <Text style={styles.receiptDate}>{formatDate(lastReceipt.createdAt)} {formatTime(lastReceipt.createdAt)}</Text>
            )}
          </View>

          <View style={styles.receiptDivider} />

          {lastReceipt && lastReceipt.items && lastReceipt.items.map((item, i) => (
            <View key={i} style={styles.receiptItem}>
              <Text style={styles.receiptItemName}>{item.productName}</Text>
              <View style={styles.receiptItemRow}>
                <Text style={styles.receiptItemQty}>{item.quantity} x {money(item.sellPrice)}</Text>
                <Text style={styles.receiptItemTotal}>{money(item.subtotal)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.receiptDivider} />

          {lastReceipt && (
            <>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Jami:</Text>
                <Text style={styles.receiptTotalLabel}>{money(lastReceipt.totalAmount + lastReceipt.discount)}</Text>
              </View>
              {lastReceipt.discount > 0 && (
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Chegirma:</Text>
                  <Text style={styles.receiptTotalLabel}>- {money(lastReceipt.discount)}</Text>
                </View>
              )}
              <View style={[styles.receiptTotalRow, { marginTop: 10 }]}>
                <Text style={styles.receiptFinalLabel}>To'landi:</Text>
                <Text style={styles.receiptFinalValue}>{money(lastReceipt.totalAmount)}</Text>
              </View>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>To'lov turi:</Text>
                <Text style={styles.receiptTotalLabel}>{lastReceipt.paymentType.toUpperCase()}</Text>
              </View>
              {lastReceipt.customerName ? (
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Mijoz:</Text>
                  <Text style={styles.receiptTotalLabel}>{lastReceipt.customerName}</Text>
                </View>
              ) : null}
            </>
          )}

          <View style={{ marginTop: 30 }}>
            <PrimaryButton 
              title="Yopish" 
              color={COLORS.bg} 
              style={{ paddingVertical: 12 }} 
              onPress={() => setReceiptModalVisible(false)} 
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Product Modal
  const renderProductModal = () => (
    <Modal visible={productModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { width: width * 0.9, maxWidth: 600, maxHeight: height * 0.9 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</Text>
            <TouchableOpacity onPress={() => setProductModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nomi *</Text>
            <TextInput style={styles.input} placeholder="Nomi" placeholderTextColor={COLORS.muted} value={productForm.name} onChangeText={(t) => setProductForm({...productForm, name: t})} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.inputLabel}>Kategoriya</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
                <Text style={{ color: COLORS.goldLight, fontSize: 12, fontWeight: '700' }}>+ Kategoriya qo'shish</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {categories.map(c => (
                <TouchableOpacity 
                  key={c._id} 
                  style={[styles.modalCatBtn, productForm.categoryId === c._id && { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '20' }]}
                  onPress={() => setProductForm({...productForm, categoryId: c._id})}
                >
                  <Text style={[styles.modalCatText, productForm.categoryId === c._id && { color: COLORS.gold }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Kirim narxi *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.costPrice} onChangeText={(t) => setProductForm({...productForm, costPrice: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Sotish narxi *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.sellPrice} onChangeText={(t) => setProductForm({...productForm, sellPrice: t})} />
              </View>
            </View>

            {/* MARGIN CALCULATOR */}
            {(() => {
              const c = parseNumber(productForm.costPrice);
              const s = parseNumber(productForm.sellPrice);
              if (c > 0 && s > 0) {
                const m = s - c;
                const p = ((m / c) * 100).toFixed(0);
                const isProfitable = m >= 0;
                return (
                  <View style={[styles.marginBadge, isProfitable ? styles.marginGreen : styles.marginOrange]}>
                    <Icon name={isProfitable ? "trending-up-outline" : "trending-down-outline"} size={16} color={isProfitable ? COLORS.green : COLORS.orange} />
                    <Text style={[styles.marginText, { color: isProfitable ? COLORS.green : COLORS.orange }]}>
                      Foyda: {isProfitable ? '+' : ''}{money(m)} ({isProfitable ? '+' : ''}{p}% ustama)
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Shtrix kod</Text>
                <TextInput style={styles.input} placeholder="Shtrix kod" placeholderTextColor={COLORS.muted} value={productForm.barcode} onChangeText={(t) => setProductForm({...productForm, barcode: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>O'lchov birligi</Text>
                <View style={styles.pickerRow}>
                  {['dona', 'kg', 'litr', 'metr'].map(u => (
                    <TouchableOpacity key={u} style={[styles.unitBtn, productForm.unit === u && styles.unitBtnActive]} onPress={() => setProductForm({...productForm, unit: u})}>
                      <Text style={[styles.unitText, productForm.unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{editingProduct ? 'Qoldiq' : 'Boshlang\'ich qoldiq'}</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.stockQty} onChangeText={(t) => setProductForm({...productForm, stockQty: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Minimal qoldiq (Ogohlantirish)</Text>
                <TextInput style={styles.input} placeholder="5" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.minAlertQty} onChangeText={(t) => setProductForm({...productForm, minAlertQty: t})} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Ta'rif (ixtiyoriy)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Ta'rif..." placeholderTextColor={COLORS.muted} multiline value={productForm.description} onChangeText={(t) => setProductForm({...productForm, description: t})} />

          </ScrollView>
          <View style={styles.modalFooter}>
            <PrimaryButton title="Saqlash" icon="save-outline" onPress={saveProduct} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  // Category Modal
  const renderCategoryModal = () => (
    <Modal visible={categoryModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: width * 0.85, maxWidth: 400 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yangi Kategoriya</Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Icon name="close" size={24} color={COLORS.muted} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nomi</Text>
            <TextInput style={styles.input} placeholder="Masalan: Ichimliklar" placeholderTextColor={COLORS.muted} value={categoryForm.name} onChangeText={(t) => setCategoryForm({...categoryForm, name: t})} />
            
            <Text style={styles.inputLabel}>Rang</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[COLORS.gold, COLORS.green, COLORS.blue, COLORS.red, COLORS.orange, '#9B51E0'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[{ width: 30, height: 30, borderRadius: 15, backgroundColor: c }, categoryForm.color === c && { borderWidth: 3, borderColor: COLORS.white }]} 
                  onPress={() => setCategoryForm({...categoryForm, color: c})}
                />
              ))}
            </View>
          </View>
          <View style={styles.modalFooter}>
            <PrimaryButton title="Saqlash" onPress={saveCategory} />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Expense Modal
  const renderExpenseModal = () => (
    <Modal visible={expenseModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: width * 0.85, maxWidth: 400 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Xarajat qo'shish</Text>
            <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><Icon name="close" size={24} color={COLORS.muted} /></TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Sarlavha *</Text>
            <TextInput style={styles.input} placeholder="Masalan: Tushlik" placeholderTextColor={COLORS.muted} value={expenseForm.title} onChangeText={(t) => setExpenseForm({...expenseForm, title: t})} />
            
            <Text style={styles.inputLabel}>Summa *</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={expenseForm.amount} onChangeText={(t) => setExpenseForm({...expenseForm, amount: t})} />

            <Text style={styles.inputLabel}>Kategoriya</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {['Oziq-ovqat', 'Soliq', 'Ijara', 'Oylik', 'Boshqa'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.modalCatBtn, expenseForm.category === c && { borderColor: COLORS.red, backgroundColor: COLORS.red + '20' }]}
                  onPress={() => setExpenseForm({...expenseForm, category: c})}
                >
                  <Text style={[styles.modalCatText, expenseForm.category === c && { color: COLORS.red }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.modalFooter}>
            <PrimaryButton title="Saqlash" color={COLORS.red} onPress={saveExpense} />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Stock Entry Modal
  const renderStockEntryModal = () => (
    <Modal visible={stockEntryModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: width * 0.9, maxWidth: 500 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Omborga kirim qilish</Text>
            <TouchableOpacity onPress={() => setStockEntryModalVisible(false)}><Icon name="close" size={24} color={COLORS.muted} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Mahsulotni tanlang *</Text>
            <View style={[styles.pickerRow, { flexWrap: 'wrap', gap: 8, marginBottom: 16 }]}>
              {products.map(p => (
                <TouchableOpacity 
                  key={p._id} 
                  style={[styles.modalCatBtn, entryForm.productId === p._id && { borderColor: COLORS.green, backgroundColor: COLORS.green + '20' }]}
                  onPress={() => {
                    setEntryForm({...entryForm, productId: p._id, costPrice: p.costPrice.toString()})
                  }}
                >
                  <Text style={[styles.modalCatText, entryForm.productId === p._id && { color: COLORS.green }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Miqdor *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={entryForm.quantity} onChangeText={(t) => setEntryForm({...entryForm, quantity: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Kirim narxi *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={entryForm.costPrice} onChangeText={(t) => setEntryForm({...entryForm, costPrice: t})} />
              </View>
            </View>

            <Text style={styles.inputLabel}>Ta'minotchi (ixtiyoriy)</Text>
            <TextInput style={styles.input} placeholder="Masalan: Abu Saxiy" placeholderTextColor={COLORS.muted} value={entryForm.supplierName} onChangeText={(t) => setEntryForm({...entryForm, supplierName: t})} />
            
            <Text style={styles.inputLabel}>Izoh (ixtiyoriy)</Text>
            <TextInput style={styles.input} placeholder="Qo'shimcha izoh..." placeholderTextColor={COLORS.muted} value={entryForm.note} onChangeText={(t) => setEntryForm({...entryForm, note: t})} />
          </ScrollView>
          <View style={styles.modalFooter}>
            <PrimaryButton title="Kirim qilish" color={COLORS.green} icon="download-outline" onPress={saveKirim} />
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // BOTTOM NAVIGATION
  // ==========================================
  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      {[
        { id: 'kassa', icon: 'cart-outline', label: 'Kassa' },
        { id: 'ombor', icon: 'cube-outline', label: 'Ombor' },
        { id: 'monitoring', icon: 'pulse-outline', label: 'Monitoring' },
        { id: 'hisobot', icon: 'pie-chart-outline', label: 'Hisobot' },
        { id: 'xarajat', icon: 'wallet-outline', label: 'Xarajat' }
      ].map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => setActiveTab(tab.id)}>
            <Icon name={tab.icon} size={24} color={isActive ? COLORS.gold : COLORS.muted} />
            <Text style={[styles.navText, isActive && styles.navTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={{ color: COLORS.gold, marginTop: 16 }}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      {/* GLOBAL HEADER */}
      <View style={styles.globalHeader}>
        <View style={styles.logoBox}>
          <Icon name="cube" size={24} color={COLORS.bg} />
        </View>
        <View>
          <Text style={styles.logoText}>ZARNO <Text style={{ color: COLORS.goldLight }}>TECH</Text></Text>
          <Text style={styles.logoSubtitle}>Kassa Tizimi</Text>
        </View>
      </View>
      
      <View style={styles.mainContent}>
        {activeTab === 'kassa' && renderKassa()}
        {activeTab === 'ombor' && renderOmbor()}
        {activeTab === 'monitoring' && renderMonitoring()}
        {activeTab === 'hisobot' && renderReport()}
        {activeTab === 'xarajat' && renderExpenses()}
      </View>

      {renderBottomNav()}

      {renderCheckoutModal()}
      {renderReceiptModal()}
      {renderProductModal()}
      {renderCategoryModal()}
      {renderExpenseModal()}
      {renderStockEntryModal()}

    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  mainContent: { flex: 1 },
  pageContainer: { flex: 1 },
  
  // Global Header
  globalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: COLORS.bg2, borderBottomWidth: 1, borderBottomColor: COLORS.border, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3, zIndex: 10 },
  logoBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 5, shadowColor: COLORS.gold, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.5, shadowRadius: 4 },
  logoText: { color: COLORS.white, fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  logoSubtitle: { color: COLORS.muted, fontSize: 10, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 4 },
  
  // Header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.bg2, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  
  // Kassa Header & Search
  kassaHeader: { padding: 16, backgroundColor: COLORS.bg2, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16 },
  kassaCategories: { paddingVertical: 12, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  catPillActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  catPillText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  catPillTextActive: { color: COLORS.bg, fontWeight: 'bold' },

  // Fast Access
  fastAccessContainer: { backgroundColor: COLORS.bg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fastAccessTitle: { color: COLORS.gold, fontSize: 14, fontWeight: 'bold', marginLeft: 16, marginBottom: 8 },
  fastAccessCard: { backgroundColor: COLORS.card, padding: 10, borderRadius: 8, marginRight: 10, width: 120, borderWidth: 1, borderColor: COLORS.border },
  fastAccessName: { color: COLORS.white, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  fastAccessPrice: { color: COLORS.green, fontSize: 12, fontWeight: 'bold' },

  // Products Grid (Kassa)
  productsGrid: { padding: 10 },
  productCard: { flex: 1, margin: 6, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, minHeight: 120 },
  productCardHeader: { flex: 1, marginBottom: 8 },
  productCardTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  productCardPrice: { color: COLORS.gold, fontSize: 16, fontWeight: 'bold' },
  productCardStock: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  badgeRed: { backgroundColor: COLORS.red + '20', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: COLORS.red },
  badgeText: { color: COLORS.red, fontSize: 10, fontWeight: 'bold' },

  // Cart Sidebar
  cartSidebar: { flex: 1.2, backgroundColor: COLORS.bg2, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  cartTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItemName: { color: COLORS.white, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  cartItemPrice: { color: COLORS.muted, fontSize: 13 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  qtyBtn: { padding: 8 },
  qtyText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  cartFooter: { padding: 16, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cartLabel: { color: COLORS.muted, fontSize: 16 },
  cartValue: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },

  // List Items (Ombor, Kirim, Xarajat)
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.2, shadowRadius: 3 },
  listIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.card2, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  listInfo: { flex: 1 },
  listTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  listSubtitle: { color: COLORS.muted, fontSize: 13 },
  listPrices: { alignItems: 'flex-end', marginRight: 16 },
  listPriceSell: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  listPriceCost: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  listStockBox: { backgroundColor: COLORS.card2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, marginRight: 12, minWidth: 70, alignItems: 'center' },
  listStock: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  actionBtn: { padding: 8, marginLeft: 4, backgroundColor: COLORS.bg2, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },

  // Badges
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 4, alignSelf: 'flex-end' },
  badgeGreen: { backgroundColor: COLORS.green + '20', borderColor: COLORS.green },
  badgeOrange: { backgroundColor: COLORS.orange + '20', borderColor: COLORS.orange },
  badgeTextMini: { fontSize: 10, fontWeight: 'bold' },

  // Stats & Cards
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statsCol: { flex: 1 },
  statCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statCardTitle: { color: COLORS.muted, fontSize: 14, flex: 1 },
  statCardValue: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  statCardSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  sectionTitleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  rankText: { fontSize: 20, fontWeight: 'bold', color: COLORS.gold, marginRight: 16, width: 24, textAlign: 'center' },

  // Chart
  chartCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 24, height: 220 },
  chartScroll: { alignItems: 'flex-end', paddingBottom: 10 },
  barContainer: { alignItems: 'center', width: 40, marginRight: 12 },
  barTrack: { height: 120, width: 24, backgroundColor: COLORS.bg2, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', backgroundColor: COLORS.blue, borderRadius: 4 },
  barLabel: { color: COLORS.muted, fontSize: 10 },
  barTooltip: { position: 'absolute', top: -20, width: 60, alignItems: 'center' },
  barTooltipText: { color: COLORS.white, fontSize: 9, opacity: 0.7 },

  // Bottom Nav
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.bg2, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  navText: { fontSize: 11, color: COLORS.muted, marginTop: 4, fontWeight: '500' },
  navTextActive: { color: COLORS.gold, fontWeight: 'bold' },

  // Modals Shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: COLORS.bg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg2 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  modalBody: { padding: 16, maxHeight: height * 0.7 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg2 },
  
  // Forms & Inputs
  inputLabel: { color: COLORS.muted, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.white, fontSize: 15, marginBottom: 16 },
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  unitBtnActive: { backgroundColor: COLORS.blue + '20', borderColor: COLORS.blue },
  unitText: { color: COLORS.text, fontSize: 14 },
  unitTextActive: { color: COLORS.blue, fontWeight: 'bold' },
  modalCatBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  modalCatText: { color: COLORS.text, fontSize: 14 },

  // Checkout specific
  summaryBox: { backgroundColor: COLORS.card, padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryLabel: { color: COLORS.muted, fontSize: 16 },
  summaryValue: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  paymentTypeRow: { flexDirection: 'row', gap: 10 },
  paymentTypeBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  paymentTypeBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  paymentTypeText: { color: COLORS.text, fontSize: 13, marginTop: 6, textAlign: 'center' },
  paymentTypeTextActive: { color: COLORS.bg, fontWeight: 'bold' },
  
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetBtn: { backgroundColor: COLORS.card2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  presetText: { color: COLORS.text, fontSize: 12 },
  changeBoxGreen: { backgroundColor: COLORS.green + '20', borderColor: COLORS.green, borderWidth: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  changeBoxRed: { backgroundColor: COLORS.red + '20', borderColor: COLORS.red, borderWidth: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  changeBoxText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  // Margins (Ombor)
  marginBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  marginGreen: { backgroundColor: COLORS.green + '15', borderColor: COLORS.green },
  marginOrange: { backgroundColor: COLORS.orange + '15', borderColor: COLORS.orange },
  marginText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  // Receipt
  receiptPaper: { backgroundColor: '#F8F9FA', padding: 24, borderRadius: 12, width: width * 0.85, maxWidth: 400 },
  receiptLogo: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  receiptTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  receiptSubtitle: { fontSize: 16, color: '#4B5563', marginBottom: 8 },
  receiptDate: { fontSize: 14, color: '#6B7280' },
  receiptDivider: { height: 1, backgroundColor: '#E5E7EB', borderStyle: 'dashed', marginVertical: 16 },
  receiptItem: { marginBottom: 12 },
  receiptItemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptItemQty: { fontSize: 14, color: '#4B5563' },
  receiptItemTotal: { fontSize: 15, fontWeight: '600', color: '#111827' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptTotalLabel: { fontSize: 16, color: '#4B5563', fontWeight: '500' },
  receiptFinalLabel: { fontSize: 18, color: '#111827', fontWeight: 'bold' },
  receiptFinalValue: { fontSize: 24, color: '#111827', fontWeight: 'bold' },

  // Shared Components
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyStateIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyStateTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyStateMessage: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, minWidth: 120, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.25, shadowRadius: 3 },
  primaryBtnText: { fontSize: 15, fontWeight: 'bold' }
});