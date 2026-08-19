    const loadAll = async () => {
      
      setLoading(true);
      try {
        const [productsResult, categoriesResult, salesResult, saleItemsResult, expensesResult] = await Promise.all([supabase.from("products").select("*").order("created_at", {
          ascending: false
        }), supabase.from("categories").select("*").order("name", {
          ascending: true
        }), supabase.from("sales").select("*").order("created_at", {
          ascending: false
        }), supabase.from("sale_items").select("*").order("created_at", {
          ascending: false
        }), supabase.from("expenses").select("*").order("created_at", {
          ascending: false
        })]);
        const errors = [productsResult.error, categoriesResult.error, salesResult.error, saleItemsResult.error, expensesResult.error].filter(Boolean);
        if (errors.length) {
          throw new Error(errors.map(item => item.message).join("\n"));
        }
        setProducts((productsResult.data || []).map(normalizeProduct));
        setCategories(categoriesResult.data || []);
        setSales(salesResult.data || []);
        setSaleItems((saleItemsResult.data || []).map(normalizeSaleItem));
        setExpenses(expensesResult.data || []);
      } catch (error) {
        Alert.alert("Ma'lumotlarni yuklashda xato", error?.message || "Supabase bilan aloqa amalga oshmadi.");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      if (true) {
        loadAll();
      } else {
        setProducts([]);
        setCategories([]);
        setSales([]);
        setSaleItems([]);
        setExpenses([]);
        setCart([]);
      }
    }, [session?.user?.id]);

    /* =========================================================
       CALCULATIONS
       ========================================================= */

    const filteredProducts = useMemo(() => {
      const query = search.trim().toLowerCase();
      if (!query) return products;
      return products.filter(item => String(item.name || "").toLowerCase().includes(query));
    }, [products, search]);
    const filteredWarehouseProducts = useMemo(() => {
      const query = warehouseSearch.trim().toLowerCase();
      if (!query) return products;
      return products.filter(item => String(item.name || "").toLowerCase().includes(query));
    }, [products, warehouseSearch]);
    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.salePrice || 0) * Number(item.quantity || 0), 0), [cart]);
    const cartCost = useMemo(() => cart.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0), [cart]);
    const cartProfit = cartTotal - cartCost;
    const warehouseCostTotal = useMemo(() => products.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0), [products]);
    const warehouseRetailTotal = useMemo(() => products.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [products]);
    const lowProducts = useMemo(() => products.filter(item => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= LOW_LIMIT), [products]);
    const outProducts = useMemo(() => products.filter(item => Number(item.quantity || 0) <= 0), [products]);
    const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0), [sales]);
    const totalCost = useMemo(() => sales.reduce((sum, sale) => sum + Number(sale.cost_total || 0), 0), [sales]);
    const grossProfit = useMemo(() => sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0), [sales]);
    const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenses]);
    const netProfit = grossProfit - totalExpenses;

    /* =========================================================
       TOP / WORST SELLERS
       ========================================================= */

    const sellingStats = useMemo(() => {
      const map = {};
      saleItems.forEach(item => {
        const id = item.product_id || `name:${item.product_name}`;
        if (!map[id]) {
          map[id] = {
            productId: item.product_id || null,
            name: item.product_name || "Noma'lum",
            quantity: 0,
            revenue: 0,
            profit: 0
          };
        }
        map[id].quantity += Number(item.quantity || 0);
        map[id].revenue += Number(item.total || 0);
        map[id].profit += (Number(item.sale_price || 0) - Number(item.cost || 0)) * Number(item.quantity || 0);
      });
      return Object.values(map);
    }, [saleItems]);
    const bestSelling = useMemo(() => [...sellingStats].sort((a, b) => b.quantity - a.quantity).slice(0, 5), [sellingStats]);
    const sellingMap = useMemo(() => {
      const map = {};
      sellingStats.forEach(item => {
        if (item.productId) {
          map[item.productId] = item.quantity;
        }
      });
      return map;
    }, [sellingStats]);
    const notSelling = useMemo(() => products.map(product => ({
      product,
      sold: sellingMap[product.id] || 0
    })).sort((a, b) => a.sold - b.sold).slice(0, 5), [products, sellingMap]);

    /* =========================================================
       PRODUCT MODAL
       ========================================================= */

    const openAddProduct = () => {
      setEditingProduct(null);
      setProductName("");
      setProductCost("");
      setProductPrice("");
      setProductQuantity("");
      setProductAddStock("");
      setProductCategoryId(categories[0]?.id || "");
      setProductModal(true);
    };
    const openEditProduct = product => {
      setEditingProduct(product);
      setProductName(product.name || "");
      setProductCost(String(product.cost || ""));
      setProductPrice(String(product.price || ""));
      setProductQuantity(String(product.quantity || 0));
      setProductAddStock("");
      setProductCategoryId(product.category_id || "");
      setProductModal(true);
    };
    const saveProduct = async () => {
      
      const name = safeText(productName);
      const cost = parseNumber(productCost);
      const price = parseNumber(productPrice);
      const initialQuantity = Math.max(0, parseNumber(productQuantity));
      const addStock = Math.max(0, parseNumber(productAddStock));
      if (!name) {
        Alert.alert("Tovar nomi", "Tovar nomini kiriting.");
        return;
      }
      if (cost < 0 || price < 0) {
        Alert.alert("Narx", "Narxlar manfiy bo'lmasligi kerak.");
        return;
      }
      setBusyAction(true);
      try {
        if (editingProduct) {
          const nextQuantity = initialQuantity + addStock;
          const {
            data,
            error
          } = await supabase.from("products").update({
            name,
            category_id: productCategoryId || null,
            cost,
            price,
            quantity: nextQuantity,
            updated_at: new Date().toISOString()
          }).eq("id", editingProduct.id).select().single();
          if (error) throw error;
          setProducts(old => old.map(item => item.id === editingProduct.id ? normalizeProduct(data) : item));
        } else {
          const {
            data,
            error
          } = await supabase.from("products").insert({
            
            category_id: productCategoryId || null,
            name,
            cost,
            price,
            quantity: initialQuantity
          }).select().single();
          if (error) throw error;
          setProducts(old => [normalizeProduct(data), ...old]);
        }
        setProductModal(false);
        setEditingProduct(null);
        setProductName("");
        setProductCost("");
        setProductPrice("");
        setProductQuantity("");
        setProductAddStock("");
        setProductCategoryId("");
      } catch (error) {
        Alert.alert("Tovarni saqlashda xato", error?.message || "Xatolik yuz berdi.");
      } finally {
        setBusyAction(false);
      }
    };
    const deleteProduct = async product => {
      try {
        
        const {
          data: deletedRows,
          error
        } = await supabase.from("products").delete().eq("id", product.id).select("id");
        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error("Mahsulot bazadan o‘chirilmadi.");
        }
        setProducts(old => old.filter(item => item.id !== product.id));
        setCart(old => old.filter(item => item.productId !== product.id));
      } catch (error) {
        Alert.alert("Xatolik", error?.message || "Tovar o‘chirilmadi.");
      }
    };

    /* =========================================================
       CATEGORIES
       ========================================================= */

    const addCategory = async () => {
      const name = safeText(categoryName);
      if (!name) {
        Alert.alert("Kategoriya", "Kategoriya nomini kiriting.");
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from("categories").insert({
          
          name
        }).select().single();
        if (error) throw error;
        setCategories(old => [...old, data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
        setCategoryName("");
      } catch (error) {
        Alert.alert("Kategoriya xatosi", error?.message || "Kategoriya qo'shilmadi.");
      }
    };
    const deleteCategory = category => {
      Alert.alert("Kategoriyani o'chirish", `"${category.name}" o'chirilsinmi?`, [{
        text: "Bekor",
        style: "cancel"
      }, {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              error
            } = await supabase.from("categories").delete().eq("id", category.id);
            if (error) throw error;
            setCategories(old => old.filter(item => item.id !== category.id));
            setProducts(old => old.map(item => item.category_id === category.id ? {
              ...item,
              category_id: null
            } : item));
            setProductCategoryId("");
          } catch (error) {
            Alert.alert("Xatolik", error?.message || "Kategoriya o'chirilmadi.");
          }
        }
      }]);
    };

    /* =========================================================
       CART
       ========================================================= */

    const addToCart = product => {
      if (Number(product.quantity || 0) <= 0) {
        Alert.alert("Omborda yo'q", `"${product.name}" qolmagan.`);
        return;
      }
      setCart(old => {
        const existing = old.find(item => item.productId === product.id);
        if (existing) {
          if (existing.quantity >= product.quantity) {
            Alert.alert("Qoldiq cheklovi", "Ombordagi qoldiqdan ortiq sotib bo'lmaydi.");
            return old;
          }
          return old.map(item => item.productId === product.id ? {
            ...item,
            quantity: item.quantity + 1
          } : item);
        }
        return [...old, {
          productId: product.id,
          name: product.name,
          cost: Number(product.cost || 0),
          stock: Number(product.quantity || 0),
          salePrice: Number(product.price || 0),
          quantity: 1
        }];
      });
    };
    const changeCartQuantity = (productId, delta) => {
      setCart(old => old.map(item => {
        if (item.productId !== productId) {
          return item;
        }
        const product = products.find(p => p.id === productId);
        const stock = Number(product?.quantity ?? item.stock ?? 0);
        const next = item.quantity + delta;
        if (next <= 0) {
          return null;
        }
        if (next > stock) {
          Alert.alert("Qoldiq cheklovi", `Maksimal ${stock} dona sotishingiz mumkin.`);
          return {
            ...item,
            quantity: stock
          };
        }
        return {
          ...item,
          quantity: next
        };
      }).filter(Boolean));
    };
    const removeFromCart = productId => {
      setCart(old => old.filter(item => item.productId !== productId));
    };
    const changeSalePrice = (productId, value) => {
      setCart(old => old.map(item => item.productId === productId ? {
        ...item,
        salePrice: Math.max(0, parseNumber(value))
      } : item));
    };

    /* =========================================================
       COMPLETE SALE
       ========================================================= */

    const completeSale = async () => {
      
      if (cart.length === 0) {
        Alert.alert("Savat bo'sh", "Sotish uchun tovar qo'shing.");
        return;
      }
      setBusyAction(true);
      try {
        /* Re-check stock from database */
        const ids = cart.map(item => item.productId);
        const {
          data: freshProducts,
          error: stockError
        } = await supabase.from("products").select("*").in("id", ids);
        if (stockError) {
          throw stockError;
        }
        for (const cartItem of cart) {
          const current = (freshProducts || []).find(item => item.id === cartItem.productId);
          if (!current) {
            throw new Error(`"${cartItem.name}" topilmadi.`);
          }
          if (Number(current.quantity || 0) < Number(cartItem.quantity || 0)) {
            throw new Error(`"${cartItem.name}" qoldig'i yetarli emas. Qoldiq: ${current.quantity}`);
          }
        }
        const total = cart.reduce((sum, item) => sum + Number(item.salePrice || 0) * Number(item.quantity || 0), 0);
        const costTotal = cart.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0);
        const profit = total - costTotal;

        /* Create sale header */
        const {
          data: sale,
          error: saleError
        } = await supabase.from("sales").insert({
          
          total,
          cost_total: costTotal,
          profit
        }).select().single();
        if (saleError) {
          throw saleError;
        }

        /* Create sale items */
        const itemsPayload = cart.map(item => ({
          sale_id: sale.id,
          
          product_id: item.productId,
          product_name: item.name,
          quantity: Number(item.quantity || 0),
          cost: Number(item.cost || 0),
          sale_price: Number(item.salePrice || 0),
          total: Number(item.salePrice || 0) * Number(item.quantity || 0)
        }));
        const {
          error: itemsError
        } = await supabase.from("sale_items").insert(itemsPayload);
        if (itemsError) {
          throw itemsError;
        }

        /* Update stock */
        for (const cartItem of cart) {
          const current = (freshProducts || []).find(item => item.id === cartItem.productId);
          const nextQuantity = Number(current.quantity || 0) - Number(cartItem.quantity || 0);
          const {
            error
          } = await supabase.from("products").update({
            quantity: Math.max(0, nextQuantity),
            updated_at: new Date().toISOString()
          }).eq("id", cartItem.productId);
          if (error) throw error;
        }
        const receiptData = {
          id: sale.id,
          created_at: sale.created_at,
          items: cart.map(item => ({
            ...item,
            total: Number(item.salePrice || 0) * Number(item.quantity || 0)
          })),
          total,
          costTotal,
          profit
        };
        setReceipt(receiptData);
        setReceiptModal(true);
        setCart([]);
        await loadAll();
      } catch (error) {
        Alert.alert("Sotuv xatosi", error?.message || "Sotuvni yakunlashda xato yuz berdi.");
      } finally {
        setBusyAction(false);
      }
    };

    /* =========================================================
       EXPENSES
       ========================================================= */

    const saveExpense = async () => {
      const title = safeText(expenseTitle);
      const amount = parseNumber(expenseAmount);
      const note = safeText(expenseNote);
      if (!title) {
        Alert.alert("Xarajat", "Nimaga xarajat qilinganini yozing.");
        return;
      }
      if (amount <= 0) {
        Alert.alert("Xarajat", "Xarajat summasini kiriting.");
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from("expenses").insert({
          
          title,
          amount,
          note: note || null
        }).select().single();
        if (error) throw error;
        setExpenses(old => [data, ...old]);
        setExpenseTitle("");
        setExpenseAmount("");
        setExpenseNote("");
        setExpenseModal(false);
      } catch (error) {
        Alert.alert("Xarajat xatosi", error?.message || "Xarajat saqlanmadi.");
      }
    };
    const deleteExpense = expense => {
      Alert.alert("Xarajatni o'chirish", `"${expense.title}" o'chirilsinmi?`, [{
        text: "Bekor",
        style: "cancel"
      }, {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              error
            } = await supabase.from("expenses").delete().eq("id", expense.id);
            if (error) throw error;
            setExpenses(old => old.filter(item => item.id !== expense.id));
          } catch (error) {
            Alert.alert("Xatolik", error?.message || "Xarajat o'chirilmadi.");
          }
        }
      }]);
    };

    /* =========================================================
       SIGN OUT
       ========================================================= */

    const signOut = async () => {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Chiqishda xato", error.message);
      }
    };

    /* =========================================================
       CATEGORY NAME HELPER
       ========================================================= */
