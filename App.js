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
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const API = process.env.EXPO_PUBLIC_API_URL || 'https://zarno-kassa.vercel.app/api';

const COLORS = {
  bg: "#06101e",
  bg2: "#0d1f35",
  card: "#112240",
  card2: "#163054",
  border: "rgba(255, 255, 255, 0.08)",
  gold: "#f59e0b",
  goldLight: "#fcd34d",
  white: "#FFFFFF",
  text: "#e2e8f0",
  muted: "#94a3b8",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f59e0b",
  blue: "#3b82f6"
};

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isDesktop = () => {
  const w = Dimensions.get('window').width;
  return Platform.OS === 'web' && w >= 1024;
};
const isTablet = () => {
  const w = Dimensions.get('window').width;
  return Platform.OS === 'web' && w >= 768 && w < 1024;
};
const isMobile = () => {
  const w = Dimensions.get('window').width;
  return Platform.OS !== 'web' || w < 768;
};


// ==========================================
// HELPER FUNCTIONS
// ==========================================
const money = (amount) => {
  if (amount === undefined || amount === null) return '0 so\'m';
  return Number(amount).toLocaleString('ru-RU') + ' so\'m';
};

const isValidNumber = (val) => {
  if (val === undefined || val === null || val === '') return false;
  const str = val.toString().trim();
  return /^\d+(\.\d+)?$/.test(str);
};

const cleanNumberInput = (val) => {
  if (!val) return '';
  return val.toString().replace(/[^0-9.]/g, '');
};

const parseNumber = (val) => {
  if (!val) return 0;
  const clean = cleanNumberInput(val);
  const num = Number(clean);
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
  // --- RESPONSIVE ---
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => sub?.remove();
  }, []);
  const desktop = Platform.OS === 'web' && windowWidth >= 1024;
  const tablet  = Platform.OS === 'web' && windowWidth >= 768 && windowWidth < 1024;

  // --- TABS ---
  const [activeTab, setActiveTab] = useState('kassa');
  const [monitoringTab, setMonitoringTab] = useState('sotuvlar');

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
      if (method !== 'GET') {
        Alert.alert('Xatolik', e.message || 'Tarmoq xatosi');
      }
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
    if (data && Array.isArray(data.debts)) {
      setDebts(data.debts);
    } else if (Array.isArray(data)) {
      setDebts(data);
    } else {
      setDebts([]);
    }
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
  // ==========================================
  // KASSA & CATEGORY LOGIC
  // ==========================================
  // 1. Deduplicated & Sorted Categories ("Boshqa aksessuarlar" is always at the end)
  const sortedCategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return [];

    const map = new Map();
    categories.forEach(cat => {
      if (!cat || !cat.name) return;
      const normalized = cat.name.trim().toLowerCase();
      if (!map.has(normalized)) {
        map.set(normalized, {
          ...cat,
          name: cat.name.trim(),
          allIds: [cat._id]
        });
      } else {
        const existing = map.get(normalized);
        if (cat._id && !existing.allIds.includes(cat._id)) {
          existing.allIds.push(cat._id);
        }
      }
    });

    const list = Array.from(map.values());

    const isBoshqa = (name) => {
      const n = (name || '').toLowerCase();
      return n.includes('boshqa') || n.includes('other');
    };

    return list.sort((a, b) => {
      const aIsB = isBoshqa(a.name);
      const bIsB = isBoshqa(b.name);
      if (aIsB && !bIsB) return 1;
      if (!aIsB && bIsB) return -1;
      return a.name.localeCompare(b.name, 'uz', { sensitivity: 'base' });
    });
  }, [categories]);

  // Selected Category Object
  const selectedCatObj = useMemo(() => {
    if (!selectedCategoryId) return null;
    return sortedCategories.find(c => c._id === selectedCategoryId || (c.allIds && c.allIds.includes(selectedCategoryId))) || null;
  }, [selectedCategoryId, sortedCategories]);

  // Filtered Products for Kassa (Robust Search & Category Filter)
  const filteredProducts = useMemo(() => {
    const q = searchQuery ? searchQuery.trim().toLowerCase() : '';

    return products.filter(p => {
      if (!p) return false;

      // 1. Search Query Filter
      let matchesSearch = true;
      if (q) {
        const pName = safeText(p.name).toLowerCase();
        const pBarcode = safeText(p.barcode).toLowerCase();
        const pCatName = safeText(p.categoryName).toLowerCase();
        const pDesc = safeText(p.description).toLowerCase();

        matchesSearch = pName.includes(q) || pBarcode.includes(q) || pCatName.includes(q) || pDesc.includes(q);
      }

      // 2. Category Filter
      let matchesCat = true;
      if (selectedCatObj) {
        const prodCatId = typeof p.categoryId === 'object' ? p.categoryId?._id : p.categoryId;
        const prodCatName = (typeof p.categoryId === 'object' ? p.categoryId?.name : (p.categoryName || '')).trim().toLowerCase();
        const selCatName = selectedCatObj.name.trim().toLowerCase();

        const matchById = prodCatId ? selectedCatObj.allIds.includes(prodCatId) : false;
        const matchByName = prodCatName ? prodCatName === selCatName : false;

        matchesCat = matchById || matchByName;
      }

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCatObj]);

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
    // 1. Name validation
    if (!productForm.name || !productForm.name.trim()) {
      Alert.alert('Xatolik', 'Mahsulot nomini kiriting!');
      return;
    }
    const trimmedName = productForm.name.trim();
    const isDuplicate = products.some(p => 
      p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
      (!editingProduct || p._id !== editingProduct._id)
    );
    if (isDuplicate) {
      Alert.alert('Xatolik', 'Bunday nomli tovar allaqachon mavjud! Iltimos, boshqa nom kiriting.');
      return;
    }

    // 2. Kirim narxi (costPrice) validation
    if (!isValidNumber(productForm.costPrice)) {
      Alert.alert('Xatolik', 'Kirim (tannarx) narxiga faqat to\'g\'ri musbat son kiriting (masalan: 15000)');
      return;
    }
    const costNum = Number(cleanNumberInput(productForm.costPrice));

    // 3. Sotish narxi (sellPrice) validation
    if (!isValidNumber(productForm.sellPrice)) {
      Alert.alert('Xatolik', 'Sotish narxiga faqat to\'g\'ri musbat son kiriting (masalan: 25000)');
      return;
    }
    const sellNum = Number(cleanNumberInput(productForm.sellPrice));
    if (sellNum < costNum) {
      Alert.alert('Ogohlantirish', 'Sotish narxi kirim narxidan kam bo\'lmasligi kerak!');
      return;
    }

    // 4. Stock Qty validation
    if (productForm.stockQty !== '' && productForm.stockQty !== undefined && !isValidNumber(productForm.stockQty)) {
      Alert.alert('Xatolik', 'Qoldiq miqdoriga faqat raqam kiriting (masalan: 10)');
      return;
    }

    // 5. Min Alert Qty validation
    if (productForm.minAlertQty !== '' && productForm.minAlertQty !== undefined && !isValidNumber(productForm.minAlertQty)) {
      Alert.alert('Xatolik', 'Minimal qoldiq miqdoriga faqat raqam kiriting (masalan: 2)');
      return;
    }

    // 6. Barcode unique validation
    if (productForm.barcode && productForm.barcode.trim()) {
      const cleanBarcode = productForm.barcode.trim();
      const duplicateBarcode = products.find(p => 
        p.barcode && p.barcode.trim() === cleanBarcode && 
        (!editingProduct || p._id !== editingProduct._id)
      );
      if (duplicateBarcode) {
        Alert.alert('Xatolik', `Ushbu shtrix-kod (${cleanBarcode}) allaqachon "${duplicateBarcode.name}" mahsulotiga biriktirilgan!`);
        return;
      }
    }

    const payload = {
      ...productForm,
      name: trimmedName,
      barcode: productForm.barcode ? productForm.barcode.trim() : '',
      categoryId: productForm.categoryId || (categories.length > 0 ? categories[0]._id : null),
      costPrice: costNum,
      sellPrice: sellNum,
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
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
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
            style={[styles.catPill, !selectedCatObj && styles.catPillActive]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text style={[styles.catPillText, !selectedCatObj && styles.catPillTextActive]}>Barchasi</Text>
          </TouchableOpacity>
          {sortedCategories.map(cat => {
            const isActive = selectedCatObj && selectedCatObj.name.toLowerCase() === cat.name.toLowerCase();
            return (
              <TouchableOpacity
                key={cat._id}
                style={[styles.catPill, isActive && styles.catPillActive, { borderColor: cat.color || COLORS.gold }]}
                onPress={() => setSelectedCategoryId(isActive ? null : cat._id)}
              >
                <Icon name={cat.icon || 'cube-outline'} size={16} color={isActive ? COLORS.bg : (cat.color || COLORS.gold)} style={{ marginRight: 6 }} />
                <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
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
              numColumns={desktop ? 4 : tablet ? 3 : 2}
              key={desktop ? 'desktop' : tablet ? 'tablet' : 'mobile'}
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

        {/* Cart Sidebar - New Design */}
        <View style={styles.cartSidebar}>
          {/* Cart Header */}
          <View style={styles.cartHeader}>
            <View style={styles.cartHeaderLeft}>
              <View style={styles.cartIconBadge}>
                <Icon name="cart" size={16} color={COLORS.bg} />
              </View>
              <Text style={styles.cartTitle}>Savatcha</Text>
            </View>
            {cart.length > 0 && (
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text>
              </View>
            )}
          </View>

          {cart.length === 0 ? (
            /* Empty state */
            <View style={styles.cartEmpty}>
              <View style={styles.cartEmptyIconWrap}>
                <Icon name="cart-outline" size={40} color={COLORS.gold} />
              </View>
              <Text style={styles.cartEmptyTitle}>Savatcha bo'sh</Text>
              <Text style={styles.cartEmptySubtitle}>Mahsulot tanlang</Text>
            </View>
          ) : (
            <>
              {/* Cart Items */}
              <FlatList
                data={cart}
                keyExtractor={item => item._id}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item, index }) => (
                  <View style={styles.cartItemCard}>
                    {/* Item number badge */}
                    <View style={styles.cartItemNum}>
                      <Text style={styles.cartItemNumText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>{money(item.sellPrice)} × {item.quantity}</Text>
                    </View>
                    {/* Total for item */}
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={styles.cartItemTotal}>{money(item.sellPrice * item.quantity)}</Text>
                    </View>
                    {/* Qty controls */}
                    <View style={styles.qtyControls}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartItemQty(item._id, -1)}>
                        <Icon name="remove" size={14} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartItemQty(item._id, 1)}>
                        <Icon name="add" size={14} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              {/* Cart Footer */}
              <View style={styles.cartFooter}>
                {/* Divider line */}
                <View style={styles.cartDivider} />
                {/* Summary rows */}
                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Tovarlar</Text>
                  <Text style={styles.cartSummaryValue}>{cart.reduce((s, i) => s + i.quantity, 0)} ta</Text>
                </View>
                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Jami summa</Text>
                  <Text style={styles.cartTotalValue}>{money(cartTotal)}</Text>
                </View>
                {/* Clear cart */}
                <TouchableOpacity
                  style={styles.cartClearBtn}
                  onPress={() => setCart([])}
                >
                  <Icon name="trash-outline" size={14} color={COLORS.red} />
                  <Text style={styles.cartClearText}>Tozalash</Text>
                </TouchableOpacity>
                {/* Checkout button */}
                <TouchableOpacity
                  style={styles.cartCheckoutBtn}
                  onPress={() => setCheckoutModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Icon name="wallet-outline" size={18} color={COLORS.bg} />
                  <Text style={styles.cartCheckoutText}>To'lov qilish</Text>
                  <Text style={styles.cartCheckoutAmount}>{money(cartTotal)}</Text>
                </TouchableOpacity>
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
        {!debts || debts.length === 0 ? (
          <View style={styles.card}><Text style={{ color: COLORS.muted }}>Faol nasiyalar yo'q</Text></View>
        ) : (
          debts.map((item) => (
            <View key={item._id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Text style={styles.listTitle}>👤 {item.customerName || 'Noma\'lum mijoz'}</Text>
                  {item.customerPhone ? <Text style={styles.listSubtitle}>📞 {item.customerPhone}</Text> : null}
                  <Text style={styles.listSubtitle}>📅 {formatDate(item.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: COLORS.red, fontWeight: 'bold', fontSize: 16 }}>{money(item.totalAmount - (item.paidAmount || 0))}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>Qarz summasi</Text>
                </View>
              </View>

              {/* NASIYAGA BERILGAN TOVARLAR RO'YXATI */}
              {item.items && item.items.length > 0 ? (
                <View style={{ backgroundColor: COLORS.bg2, borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4 }}>Berilgan tovarlar:</Text>
                  {item.items.map((prod, idx) => (
                    <Text key={idx} style={{ color: COLORS.text, fontSize: 12 }}>
                      • {prod.productName || prod.name} — {prod.quantity} dona x {money(prod.sellPrice)} = <Text style={{ color: COLORS.goldLight }}>{money(prod.subtotal || (prod.quantity * prod.sellPrice))}</Text>
                    </Text>
                  ))}
                </View>
              ) : null}

              <PrimaryButton 
                title="Qarz yopildi (To'landi)" 
                icon="checkmark-done" 
                color={COLORS.green} 
                style={{ marginTop: 4 }}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
                    if (window.confirm(`${item.customerName}ning ${money(item.totalAmount)} qarzini to'liq yopmoqchimisiz?`)) {
                      payDebt(item._id);
                    }
                  } else {
                    Alert.alert("Tasdiqlash", `${item.customerName}ning ${money(item.totalAmount)} qarzini to'liq yopmoqchimisiz?`, [
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
            <Text style={styles.inputLabel}>Mahsulot nomi *</Text>
            <TextInput style={styles.input} placeholder="Mahsulot nomini kiriting" placeholderTextColor={COLORS.muted} value={productForm.name} onChangeText={(t) => setProductForm({...productForm, name: t})} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.inputLabel}>Kategoriya</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
                <Text style={{ color: COLORS.goldLight, fontSize: 12, fontWeight: '700' }}>+ Kategoriya qo'shish</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {sortedCategories.map(c => (
                <TouchableOpacity 
                  key={c._id} 
                  style={[styles.modalCatBtn, (productForm.categoryId === c._id || (c.allIds && c.allIds.includes(productForm.categoryId))) && { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '20' }]}
                  onPress={() => setProductForm({...productForm, categoryId: c._id})}
                >
                  <Text style={[styles.modalCatText, (productForm.categoryId === c._id || (c.allIds && c.allIds.includes(productForm.categoryId))) && { color: COLORS.gold }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Kirim narxi *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.costPrice} onChangeText={(t) => setProductForm({...productForm, costPrice: cleanNumberInput(t)})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Sotish narxi *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.sellPrice} onChangeText={(t) => setProductForm({...productForm, sellPrice: cleanNumberInput(t)})} />
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
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.stockQty} onChangeText={(t) => setProductForm({...productForm, stockQty: cleanNumberInput(t)})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Minimal qoldiq (Ogohlantirish)</Text>
                <TextInput style={styles.input} placeholder="5" keyboardType="numeric" placeholderTextColor={COLORS.muted} value={productForm.minAlertQty} onChangeText={(t) => setProductForm({...productForm, minAlertQty: cleanNumberInput(t)})} />
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
  // QARZ DAFTARI PAGE
  // ==========================================
  const renderQarz = () => {
    const totalUnpaid = (Array.isArray(debts) ? debts : []).reduce((sum, d) => sum + (d.totalAmount - (d.paidAmount || 0)), 0);
    return (
      <View style={styles.pageContainer}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Qarz daftari (Nasiyalar)</Text>
          <View style={{ backgroundColor: COLORS.red + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.red }}>
            <Text style={{ color: COLORS.red, fontWeight: 'bold', fontSize: 13 }}>Jami qarz: {money(totalUnpaid)}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {!debts || debts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Icon name="journal-outline" size={48} color={COLORS.muted} />
              </View>
              <Text style={styles.emptyStateTitle}>Hozircha faol qarzlar yo'q</Text>
              <Text style={styles.emptyStateSubtitle}>
                Kassa bo'limida sotuv to'lov turini 'Nasiya' qilib amalga oshirsangiz, mijoz qarzi va berilgan tovarlar ro'yxati bu yerda avtomatik saqlanadi.
              </Text>
            </View>
          ) : (
            debts.map((item) => (
              <View key={item._id} style={[styles.card, { marginBottom: 12, borderWidth: 1, borderColor: COLORS.red + '40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 }}>
                  <View>
                    <Text style={{ color: COLORS.gold, fontSize: 16, fontWeight: '700' }}>👤 {item.customerName || 'Noma\'lum mijoz'}</Text>
                    {item.customerPhone ? <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>📞 {item.customerPhone}</Text> : null}
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>📅 {formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: COLORS.red, fontWeight: '800', fontSize: 18 }}>{money(item.totalAmount - (item.paidAmount || 0))}</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>Qarz summasi</Text>
                  </View>
                </View>

                {/* NASIYAGA BERILGAN TOVARLAR RO'YXATI */}
                <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>📦 Nasiyaga berilgan tovarlar:</Text>
                <View style={{ backgroundColor: COLORS.bg2, borderRadius: 8, padding: 8, marginBottom: 12 }}>
                  {item.items && item.items.length > 0 ? (
                    item.items.map((prod, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: idx < item.items.length - 1 ? 1 : 0, borderBottomColor: COLORS.border + '40' }}>
                        <Text style={{ color: COLORS.text, fontSize: 13, flex: 1 }}>
                          • {prod.productName || prod.name}
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12, marginRight: 8 }}>
                          {prod.quantity} dona x {money(prod.sellPrice)}
                        </Text>
                        <Text style={{ color: COLORS.goldLight, fontWeight: '600', fontSize: 13 }}>
                          {money(prod.subtotal || (prod.quantity * prod.sellPrice))}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>Mahsulotlar ko'rsatilmagan</Text>
                  )}
                </View>

                {item.note ? (
                  <Text style={{ color: COLORS.orange, fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>📝 Izoh: {item.note}</Text>
                ) : null}

                <PrimaryButton 
                  title="Qarz yopildi (To'landi)" 
                  icon="checkmark-done" 
                  color={COLORS.green} 
                  style={{ paddingVertical: 10 }}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
                      if (window.confirm(`${item.customerName}ning ${money(item.totalAmount)} qarzini to'liq yopmoqchimisiz?`)) {
                        payDebt(item._id);
                      }
                    } else {
                      Alert.alert("Tasdiqlash", `${item.customerName}ning ${money(item.totalAmount)} qarzini to'liq yopmoqchimisiz?`, [
                        { text: "Yo'q", style: 'cancel' },
                        { text: "Ha", onPress: () => payDebt(item._id) }
                      ]);
                    }
                  }} 
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // BOTTOM NAVIGATION
  // ==========================================
  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      {[
        { id: 'kassa', icon: 'cart-outline', label: 'Kassa' },
        { id: 'ombor', icon: 'cube-outline', label: 'Ombor' },
        { id: 'qarz', icon: 'journal-outline', label: 'Qarz' },
        { id: 'monitoring', icon: 'pulse-outline', label: 'Monitoring' },
        { id: 'hisobot', icon: 'pie-chart-outline', label: 'Hisobot' },
        { id: 'xarajat', icon: 'wallet-outline', label: 'Xarajat' }
      ].map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={[styles.navItem, isActive && styles.navItemActive]} onPress={() => setActiveTab(tab.id)}>
            <Icon name={tab.icon} size={22} color={isActive ? COLORS.gold : COLORS.muted} />
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
    <SafeAreaView style={[styles.container, desktop && styles.containerDesktop]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* DESKTOP / TABLET: Sidebar layout */}
      {(desktop || tablet) ? (
        <View style={styles.desktopLayout}>
          {/* Sidebar */}
          <View style={[styles.sidebar, tablet && styles.sidebarTablet]}>
            {/* Logo */}
            <View style={styles.sidebarLogo}>
              <View style={styles.logoBox}>
                <Icon name="cube" size={22} color={COLORS.bg} />
              </View>
              {desktop && (
                <View>
                  <Text style={styles.logoText}>ZARNO <Text style={{ color: COLORS.goldLight }}>TECH</Text></Text>
                  <Text style={styles.logoSubtitle}>Kassa Tizimi</Text>
                </View>
              )}
            </View>
            {/* Sidebar nav items */}
            {[
              { id: 'kassa',      icon: 'cart-outline',      label: 'Kassa' },
              { id: 'ombor',      icon: 'cube-outline',      label: 'Ombor' },
              { id: 'qarz',       icon: 'journal-outline',   label: 'Qarz' },
              { id: 'monitoring', icon: 'pulse-outline',     label: 'Monitoring' },
              { id: 'hisobot',    icon: 'pie-chart-outline', label: 'Hisobot' },
              { id: 'xarajat',   icon: 'wallet-outline',    label: 'Xarajat' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Icon name={tab.icon} size={20} color={isActive ? COLORS.gold : COLORS.muted} />
                  {desktop && (
                    <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                      {tab.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Main content */}
          <ScrollView style={styles.desktopContent} contentContainerStyle={{ flexGrow: 1 }}>
            {activeTab === 'kassa'      && renderKassa()}
            {activeTab === 'ombor'      && renderOmbor()}
            {activeTab === 'qarz'       && renderQarz()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'hisobot'    && renderReport()}
            {activeTab === 'xarajat'   && renderExpenses()}
          </ScrollView>
        </View>
      ) : (
        /* MOBILE: Top header + bottom nav layout */
        <>
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
            {activeTab === 'kassa'      && renderKassa()}
            {activeTab === 'ombor'      && renderOmbor()}
            {activeTab === 'qarz'       && renderQarz()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'hisobot'    && renderReport()}
            {activeTab === 'xarajat'   && renderExpenses()}
          </View>

          {renderBottomNav()}
        </>
      )}

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
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg,
    width: '100%',
    alignSelf: 'stretch',
  },
  containerDesktop: {
    maxWidth: '100%',
  },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  mainContent: { flex: 1 },
  pageContainer: { flex: 1, paddingBottom: 16 },

  // ---- RESPONSIVE DESKTOP LAYOUT ----
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
  },

  // Sidebar (Desktop: 220px wide, Tablet: 64px icon-only)
  sidebar: {
    width: 220,
    backgroundColor: COLORS.bg2,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 20,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  sidebarTablet: {
    width: 64,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
    gap: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  sidebarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  sidebarLabelActive: {
    color: COLORS.gold,
    fontWeight: '800',
  },

  // Main desktop content area
  desktopContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },


  // Global Header
  globalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 14, 
    paddingBottom: 14, 
    backgroundColor: COLORS.bg2, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  logoBox: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    backgroundColor: COLORS.gold, 
    justify: 'center', 
    alignItems: 'center', 
    marginRight: 14,
    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
  },
  logoText: { color: COLORS.white, fontSize: 20, fontWeight: '900', letterSpacing: 1.2 },
  logoSubtitle: { color: COLORS.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 },
  
  card: { 
    backgroundColor: COLORS.card, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginBottom: 12 
  },
  
  // Page Header (Matches localhost:3000)
  pageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg
  },
  brandLabel: { 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 1.5, 
    color: COLORS.gold, 
    textTransform: 'uppercase',
    marginBottom: 2
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  
  // Kassa Header & Search (Matches localhost:3000)
  kassaHeader: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.bg },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: 16, 
    paddingHorizontal: 14, 
    height: 46, 
    borderWidth: 1.5, 
    borderColor: COLORS.border 
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  kassaCategories: { paddingVertical: 10, backgroundColor: COLORS.bg },
  catPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 999, 
    backgroundColor: COLORS.card, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginRight: 8, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  catPillActive: { 
    backgroundColor: COLORS.gold, 
    borderColor: COLORS.gold,
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)'
  },
  catPillText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  catPillTextActive: { color: '#06101e', fontWeight: '800' },

  // Fast Access
  fastAccessContainer: { backgroundColor: COLORS.bg, paddingVertical: 8 },
  fastAccessTitle: { color: COLORS.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginLeft: 20, marginBottom: 8, textTransform: 'uppercase' },
  fastAccessCard: { 
    backgroundColor: COLORS.card, 
    paddingHorizontal: 12,
    paddingVertical: 10, 
    borderRadius: 12, 
    marginRight: 8, 
    width: 125, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  fastAccessName: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  fastAccessPrice: { color: COLORS.gold, fontSize: 13, fontWeight: '800' },

  // Products Grid (Kassa) - Matching localhost:3000 Card Style
  productsGrid: { paddingHorizontal: 14, paddingBottom: 16 },
  productCard: { 
    flex: 1, 
    margin: 6, 
    backgroundColor: COLORS.card, 
    borderRadius: 16, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    minHeight: 125,
    justifyContent: 'space-between'
  },
  productCardHeader: { marginBottom: 6 },
  productCardTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  productCardPrice: { color: COLORS.gold, fontSize: 15, fontWeight: '800' },
  productCardStock: { color: COLORS.muted, fontSize: 11, marginTop: 4, fontWeight: '600' },
  badgeRed: { backgroundColor: COLORS.red + '20', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: COLORS.red },
  badgeText: { color: COLORS.red, fontSize: 10, fontWeight: '700' },

  // Product Row Card (Horizontal variant)
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  productIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  productInfo: { flex: 1 },
  productCategory: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  productRight: { alignItems: 'flex-end', flexShrink: 0 },
  stockBadge: { fontSize: 18, fontWeight: '800', color: COLORS.green },
  stockUnit: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },

  // ---- CART SIDEBAR (New Design) ----
  cartSidebar: {
    flex: 1.2,
    backgroundColor: COLORS.bg2,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    flexDirection: 'column',
  },

  // Cart Header
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg2,
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  cartCountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cartCountText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
  },

  // Cart Empty State
  cartEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 40,
  },
  cartEmptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartEmptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cartEmptySubtitle: {
    color: COLORS.muted,
    fontSize: 12,
  },

  // Cart Item Card
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  cartItemNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cartItemNumText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  cartItemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cartItemPrice: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  cartItemTotal: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
  },

  // Qty Controls
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },

  // Cart Footer
  cartFooter: {
    padding: 12,
    backgroundColor: COLORS.bg2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  cartDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartSummaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  cartSummaryValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  cartTotalValue: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cartClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  cartClearText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '700',
  },
  cartCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  cartCheckoutText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginLeft: 4,
  },
  cartCheckoutAmount: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cartLabel: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  cartValue: { color: COLORS.gold, fontSize: 20, fontWeight: '900' },


  // List Items (Ombor, Kirim, Xarajat, Qarz)
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    padding: 14, 
    marginBottom: 10, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  listIconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: COLORS.card2, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  listInfo: { flex: 1 },
  listTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  listSubtitle: { color: COLORS.muted, fontSize: 12 },
  listPrices: { alignItems: 'flex-end', marginRight: 14 },
  listPriceSell: { color: COLORS.gold, fontSize: 15, fontWeight: '800' },
  listPriceCost: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  listStockBox: { backgroundColor: COLORS.card2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, minWidth: 65, alignItems: 'center' },
  listStock: { color: COLORS.green, fontSize: 14, fontWeight: '800' },
  actionBtn: { padding: 8, marginLeft: 4, backgroundColor: COLORS.bg2, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, marginTop: 4, alignSelf: 'flex-end' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgeOrange: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  badgeTextMini: { fontSize: 10, fontWeight: '700' },

  // Stats & Cards (Matches localhost:3000 Stat Grid)
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statsCol: { flex: 1 },
  statCard: { backgroundColor: COLORS.card, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statIconContainer: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  statCardTitle: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', flex: 1 },
  statCardValue: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  statCardSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  sectionTitleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  rankText: { fontSize: 18, fontWeight: '800', color: COLORS.gold, marginRight: 14, width: 24, textAlign: 'center' },

  // Chart
  chartCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 20, height: 220 },
  chartScroll: { alignItems: 'flex-end', paddingBottom: 10 },
  barContainer: { alignItems: 'center', width: 40, marginRight: 12 },
  barTrack: { height: 120, width: 24, backgroundColor: COLORS.bg2, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', backgroundColor: COLORS.blue, borderRadius: 6 },
  barLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  barTooltip: { position: 'absolute', top: -20, width: 60, alignItems: 'center' },
  barTooltipText: { color: COLORS.text, fontSize: 9, opacity: 0.7 },

  // Bottom Navbar (Matches localhost:3000 Navbar Style)
  bottomNav: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.bg2, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border, 
    height: 72,
    alignItems: 'center',
    justify: 'space-around',
    paddingHorizontal: 6,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0
  },
  navItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12
  },
  navItemActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)'
  },
  navText: { fontSize: 10, color: COLORS.muted, marginTop: 3, fontWeight: '600' },
  navTextActive: { color: COLORS.gold, fontWeight: '800' },

  // Modals Shared (Matches localhost:3000 Modal Overlay)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: COLORS.bg2, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', width: '100%', maxWidth: 440 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg2 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalBody: { padding: 18, maxHeight: height * 0.7 },
  modalFooter: { padding: 18, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg2 },
  
  // Forms & Inputs
  inputLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 14 },
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  unitBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: COLORS.blue },
  unitText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  unitTextActive: { color: COLORS.blue, fontWeight: '800' },
  modalCatBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  modalCatText: { color: COLORS.text, fontSize: 13 },

  // Checkout specific
  summaryBox: { backgroundColor: COLORS.card, padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryLabel: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  summaryValue: { color: COLORS.gold, fontSize: 22, fontWeight: '900' },
  paymentTypeRow: { flexDirection: 'row', gap: 8 },
  paymentTypeBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  paymentTypeBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  paymentTypeText: { color: COLORS.text, fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  paymentTypeTextActive: { color: '#06101e', fontWeight: '800' },
  
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetBtn: { backgroundColor: COLORS.card2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  presetText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  changeBoxGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: COLORS.green, borderWidth: 1, padding: 14, borderRadius: 12, alignItems: 'center', marginVertical: 10 },
  changeBoxRed: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: COLORS.red, borderWidth: 1, padding: 14, borderRadius: 12, alignItems: 'center', marginVertical: 10 },
  changeBoxText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },

  // Margins (Ombor)
  marginBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  marginGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: COLORS.green },
  marginOrange: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: COLORS.gold },
  marginText: { fontSize: 13, fontWeight: '800', marginLeft: 8 },

  // Receipt
  receiptPaper: { backgroundColor: '#F8F9FA', padding: 24, borderRadius: 16, width: width * 0.85, maxWidth: 400 },
  receiptLogo: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  receiptTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  receiptSubtitle: { fontSize: 15, color: '#4B5563', marginBottom: 8 },
  receiptDate: { fontSize: 13, color: '#6B7280' },
  receiptDivider: { height: 1, backgroundColor: '#E5E7EB', borderStyle: 'dashed', marginVertical: 14 },
  receiptItem: { marginBottom: 10 },
  receiptItemName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptItemQty: { fontSize: 13, color: '#4B5563' },
  receiptItemTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptTotalLabel: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  receiptFinalLabel: { fontSize: 17, color: '#111827', fontWeight: '800' },
  receiptFinalValue: { fontSize: 22, color: '#111827', fontWeight: '900' },

  // Shared Components
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 36 },
  emptyStateIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyStateTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyStateMessage: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, minWidth: 120, boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)' },
  primaryBtnText: { fontSize: 14, fontWeight: '800' }
});