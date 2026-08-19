const fs = require('fs');
let appJs = fs.readFileSync('App.js', 'utf8');

const kassaIndex = appJs.indexOf('const renderKassa = () => {');
if (kassaIndex === -1) {
  console.log('Error: const renderKassa not found');
  process.exit(1);
}

const header = appJs.substring(0, kassaIndex).replace(/\/\* =========================================================\s+KASSA SCREEN\s+========================================================= \*\/\s*$/, '');
const tail = appJs.substring(kassaIndex);

const newHeader = `
const SUPABASE_URL = "https://jniqyvpnwibvtptzpvgc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CeVF6nkRmc_SVpmhp-_Efg_oLvwvqcH";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

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
const LOW_LIMIT = 2;

const money = value => {
  const number = Number(value || 0);
  return \`\${number.toLocaleString("uz-UZ")} so'm\`;
};
const numberOnly = value => String(value ?? "").replace(/\\D/g, "");
const parseNumber = value => {
  const n = Number(String(value ?? "").replace(/[^\\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const safeText = value => String(value ?? "").trim();
const todayKey = () => {
  const d = new Date();
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
};
const normalizeProduct = item => ({
  ...item,
  cost: Number(item.cost || 0),
  price: Number(item.price || 0),
  quantity: Number(item.quantity || 0)
});
const normalizeSaleItem = item => ({
  ...item,
  quantity: Number(item.quantity || 0),
  cost: Number(item.cost || 0),
  sale_price: Number(item.sale_price || 0),
  total: Number(item.total || 0)
});

function Icon({ name, size = 21, color = COLORS.goldLight }) {
  return <Ionicons name={name} size={size} color={color} />;
}
function SectionTitle({ title, subtitle, right }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? right : null}
    </View>
  );
}
function StatCard({ label, value, color = COLORS.white, small = false }) {
  return (
    <View style={small ? styles.statCardSmall : styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[small ? styles.statValueSmall : styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}
function EmptyState({ icon = "cube-outline", title = "Ma'lumot yo'q", text = "" }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={34} color={COLORS.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}
function PrimaryButton({ title, onPress, icon = "add", disabled = false, danger = false }) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, danger && { backgroundColor: COLORS.red }, disabled && { opacity: 0.45 }]}
    >
      <Icon name={icon} size={19} color={danger ? COLORS.white : COLORS.bg} />
      <Text style={[styles.primaryButtonText, danger && { color: COLORS.white }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("kassa");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [receipt, setReceipt] = useState(null);

  /* PRODUCT FORM */
  const [productName, setProductName] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productAddStock, setProductAddStock] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");

  /* CATEGORY FORM */
  const [categoryName, setCategoryName] = useState("");

  /* EXPENSE FORM */
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

`;

const recoveredLogic = fs.readFileSync('recovered_logic.js', 'utf8');

const finalCode = header.trim() + '\n\n' + newHeader + recoveredLogic + '\n\n' + tail;
fs.writeFileSync('App.js', finalCode);
console.log('App.js restored successfully!');
