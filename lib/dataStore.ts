import { db } from "@/lib/firebase";
import { 
  DEFAULT_COLORS, 
  DEFAULT_COMPANIES, 
  DEFAULT_COUNTRIES, 
  DEFAULT_GROUPS, 
  DEFAULT_MEMBERS, 
  DEFAULT_TYPES, 
  INITIAL_TRANSACTIONS 
} from "@/lib/seedData";
import { 
  AdminLog, 
  DimColor, 
  DimCompany, 
  DimCountry, 
  DimGroup, 
  DimMember, 
  DimType, 
  PriceRule, 
  Transaction 
} from "@/types/cheki";
import { 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDocs, 
  onSnapshot, 
  query, 
  updateDoc, 
  where, 
  writeBatch 
} from "firebase/firestore";

// Local storage keys for fallback demo mode
const STORAGE_PREFIX = "cheki_tracker_v2_";

function getLocalData<T>(key: string, defaultValue: T[]): T[] {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

// Global subscribers for reactive UI updates in local/demo mode
const listeners: Record<string, Set<() => void>> = {};

function notifyListeners(key: string) {
  if (listeners[key]) {
    listeners[key].forEach(fn => fn());
  }
}

export function subscribeToLocalStore(key: string, callback: () => void): () => void {
  if (!listeners[key]) listeners[key] = new Set();
  listeners[key].add(callback);
  return () => {
    listeners[key]?.delete(callback);
  };
}

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------

export function isValidTransaction(t: Partial<Transaction>): boolean {
  if (!t) return false;
  const hasMember = Boolean(t.member && t.member.trim() !== "");
  const hasDate = Boolean(t.date && t.date.trim() !== "");
  return hasMember || hasDate;
}

export function subscribeTransactions(
  userId: string,
  onData: (items: Transaction[]) => void,
  isDemo: boolean = false
): () => void {
  if (isDemo || !userId || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const seed = INITIAL_TRANSACTIONS.filter(isValidTransaction).map((t, idx) => ({
      ...t,
      id: `trans_${idx + 1}`,
      userId: userId || 'demo-user-id',
      createdAt: new Date().toISOString(),
    }));
    const load = () => {
      const items = getLocalData<Transaction>(`transactions_${userId || 'demo'}`, seed).filter(isValidTransaction);
      onData(items);
    };
    load();
    return subscribeToLocalStore(`transactions_${userId || 'demo'}`, load);
  }

  try {
    const q = query(collection(db, "fact_cheki_transaction"), where("userId", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as Transaction;
        if (isValidTransaction(d)) {
          items.push({ ...d, id: doc.id });
        }
      });
      // Sort newest date first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onData(items);
    }, (error) => {
      console.warn("Firestore transactions subscription failed, fallback to local:", error);
      const seed = INITIAL_TRANSACTIONS.filter(isValidTransaction).map((t, idx) => ({
        ...t,
        id: `trans_${idx + 1}`,
        userId,
      }));
      onData(getLocalData<Transaction>(`transactions_${userId}`, seed).filter(isValidTransaction));
    });
  } catch {
    return () => {};
  }
}

export async function addTransaction(data: Omit<Transaction, 'id'>, isDemo = false): Promise<Transaction> {
  if (!isValidTransaction(data)) {
    throw new Error("Cannot save blank transaction (both member and date are empty).");
  }

  const month = data.date ? data.date.substring(0, 7) : "";
  const year = data.date ? data.date.substring(0, 4) : "";
  const payload = {
    ...data,
    month,
    year,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `transactions_${data.userId || 'demo'}`;
    const current = getLocalData<Transaction>(key, []);
    const newDoc: Transaction = {
      ...payload,
      id: 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    };
    setLocalData(key, [newDoc, ...current]);
    notifyListeners(key);
    logAdminAction(data.userId, "ADD_TRANSACTION", `Added transaction for member: ${data.member}, event: ${data.event}`, true);
    return newDoc;
  }

  const docRef = await addDoc(collection(db, "fact_cheki_transaction"), payload);
  logAdminAction(data.userId, "ADD_TRANSACTION", `Added transaction ID: ${docRef.id}`);
  return { id: docRef.id, ...payload };
}

export async function updateTransaction(id: string, userId: string, updates: Partial<Transaction>, isDemo = false): Promise<void> {
  let month = updates.month;
  let year = updates.year;
  if (updates.date) {
    month = updates.date.substring(0, 7);
    year = updates.date.substring(0, 4);
  }
  const payload = {
    ...updates,
    ...(month ? { month } : {}),
    ...(year ? { year } : {}),
    updatedAt: new Date().toISOString(),
  };

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `transactions_${userId || 'demo'}`;
    const current = getLocalData<Transaction>(key, []);
    const updated = current.map(item => item.id === id ? { ...item, ...payload } : item);
    setLocalData(key, updated);
    notifyListeners(key);
    logAdminAction(userId, "UPDATE_TRANSACTION", `Updated transaction ID: ${id}`, true);
    return;
  }

  await updateDoc(doc(db, "fact_cheki_transaction", id), payload);
  logAdminAction(userId, "UPDATE_TRANSACTION", `Updated transaction ID: ${id}`);
}

export async function deleteTransaction(id: string, userId: string, isDemo = false): Promise<void> {
  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `transactions_${userId || 'demo'}`;
    const current = getLocalData<Transaction>(key, []);
    setLocalData(key, current.filter(item => item.id !== id));
    notifyListeners(key);
    logAdminAction(userId, "DELETE_TRANSACTION", `Deleted transaction ID: ${id}`, true);
    return;
  }

  await deleteDoc(doc(db, "fact_cheki_transaction", id));
  logAdminAction(userId, "DELETE_TRANSACTION", `Deleted transaction ID: ${id}`);
}

export async function batchUpsertTransactions(userId: string, rows: Omit<Transaction, 'id' | 'userId'>[], isDemo = false): Promise<void> {
  // Enforce strict backend validation: filter out any blank transaction rows
  const validRows = rows.filter(isValidTransaction);

  if (validRows.length === 0) {
    console.warn("No valid non-blank transactions to batch upsert.");
    return;
  }

  const processed = validRows.map((r, idx) => ({
    ...r,
    userId,
    month: r.date ? r.date.substring(0, 7) : "",
    year: r.date ? r.date.substring(0, 4) : "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `transactions_${userId || 'demo'}`;
    const current = getLocalData<Transaction>(key, []);
    const newItems: Transaction[] = processed.map((r, idx) => ({
      ...r,
      id: `trans_grid_${Date.now()}_${idx}`,
    }));
    setLocalData(key, [...newItems, ...current]);
    notifyListeners(key);
    logAdminAction(userId, "BATCH_UPSERT_TRANSACTIONS", `Saved ${validRows.length} rows from grid editor`, true);
    return;
  }

  const batch = writeBatch(db);
  processed.forEach((item) => {
    const docRef = doc(collection(db, "fact_cheki_transaction"));
    batch.set(docRef, item);
  });
  await batch.commit();
  logAdminAction(userId, "BATCH_UPSERT_TRANSACTIONS", `Saved ${validRows.length} rows from grid editor`);
}

// ----------------------------------------------------
// METADATA DIM TABLES
// ----------------------------------------------------

export function getItemValueString(data: Record<string, unknown>): string {
  if (!data) return '';
  if (data.member_name) return `${data.member_name}${data.group ? ` (${data.group})` : ''}`;
  if (data.group) return String(data.group);
  if (data.company) return String(data.company);
  if (data.color) return String(data.color);
  if (data.type || data.Type) return String(data.type || data.Type);
  if (data.country || data.displayed_country) return String(data.displayed_country || data.country);
  if (data.location) return String(data.location);
  const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'userId' && k !== 'createdAt' && k !== 'updatedAt');
  if (keys.length > 0) return String(data[keys[0]]);
  return '';
}

export function subscribeMetadata<T>(
  tableName: string,
  userId: string,
  defaultSeed: Omit<T, 'id' | 'userId'>[],
  onData: (items: T[]) => void,
  isDemo: boolean = false
): () => void {
  const seed = defaultSeed.map((item, idx) => ({
    ...item,
    id: `${tableName}_${idx + 1}`,
    userId: userId || 'demo-user-id',
  })) as unknown as T[];

  const sortNewestTop = (list: T[]) => {
    return [...list].sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return 0; // maintain order if no timestamp
    });
  };

  if (isDemo || !userId || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const load = () => {
      const raw = getLocalData<T>(`${tableName}_${userId || 'demo'}`, seed);
      onData(sortNewestTop(raw));
    };
    load();
    return subscribeToLocalStore(`${tableName}_${userId || 'demo'}`, load);
  }

  try {
    const q = query(collection(db, tableName), where("userId", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      if (items.length === 0) {
        onData(sortNewestTop(seed));
      } else {
        onData(sortNewestTop(items));
      }
    }, () => {
      const raw = getLocalData<T>(`${tableName}_${userId}`, seed);
      onData(sortNewestTop(raw));
    });
  } catch {
    onData(sortNewestTop(seed));
    return () => {};
  }
}

export async function addMetadataDoc<T extends { id: string; userId: string }>(
  tableName: string,
  userId: string,
  data: Record<string, unknown>,
  isDemo = false
): Promise<void> {
  const now = new Date().toISOString();
  const payload = { ...data, userId, createdAt: now, updatedAt: now };
  const valStr = getItemValueString(data);

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `${tableName}_${userId || 'demo'}`;
    const current = getLocalData<T>(key, []);
    const newId = `${tableName}_${Date.now()}`;
    const newDoc = { ...payload, id: newId } as unknown as T;
    setLocalData(key, [newDoc, ...current]);
    notifyListeners(key);
    logAdminAction(userId, `ADD_${tableName.toUpperCase()}`, `Added ID ${newId} (${valStr})`, true);
    return;
  }

  const docRef = await addDoc(collection(db, tableName), payload);
  logAdminAction(userId, `ADD_${tableName.toUpperCase()}`, `Added ID ${docRef.id} (${valStr})`);
}

export async function updateMetadataDoc(
  tableName: string,
  id: string,
  userId: string,
  data: Record<string, unknown>,
  isDemo = false
): Promise<void> {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  const valStr = getItemValueString(data);

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `${tableName}_${userId || 'demo'}`;
    const current = getLocalData<Record<string, unknown> & { id: string }>(key, []);
    const updated = current.map(item => item.id === id ? { ...item, ...payload } : item);
    setLocalData(key, updated);
    notifyListeners(key);
    logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated ID ${id} (${valStr})`, true);
    return;
  }

  await updateDoc(doc(db, tableName, id), payload);
  logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated ID ${id} (${valStr})`);
}

export async function deleteMetadataDoc(
  tableName: string,
  id: string,
  userId: string,
  itemValue?: string,
  isDemo = false
): Promise<void> {
  const valSuffix = itemValue ? ` (${itemValue})` : '';

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `${tableName}_${userId || 'demo'}`;
    const current = getLocalData<{ id: string }>(key, []);
    setLocalData(key, current.filter(item => item.id !== id));
    notifyListeners(key);
    logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${id}${valSuffix}`, true);
    return;
  }

  await deleteDoc(doc(db, tableName, id));
  logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${id}${valSuffix}`);
}

// ----------------------------------------------------
// PRICE RULES
// ----------------------------------------------------

export const DEFAULT_PRICE_RULES: PriceRule[] = [
  {
    id: 'rule_1',
    name: 'Free Cheki',
    conditions: [{ field: 'type', operator: 'equals', value: 'Free Cheki' }],
    price: 0,
    priority: 1,
    enabled: true,
  },
  {
    id: 'rule_2',
    name: 'Free Shame',
    conditions: [{ field: 'type', operator: 'equals', value: 'Free Shame' }],
    price: 0,
    priority: 2,
    enabled: true,
  },
  {
    id: 'rule_3',
    name: 'Deco Cheki',
    conditions: [{ field: 'type', operator: 'equals', value: 'Deco Cheki' }],
    price: 500,
    priority: 3,
    enabled: true,
  },
  {
    id: 'rule_4',
    name: 'Korea Idol',
    conditions: [{ field: 'country', operator: 'equals', value: '🇹🇭 KR' }],
    price: 220,
    priority: 4,
    enabled: true,
  },
  {
    id: 'rule_5',
    name: 'China Idol',
    conditions: [{ field: 'country', operator: 'equals', value: '🇨🇳 CN' }],
    price: 400,
    priority: 5,
    enabled: true,
  },
  {
    id: 'rule_default',
    name: 'Standard Cheki',
    conditions: [],
    price: 300,
    priority: 99,
    enabled: true,
  },
];

export function getPriceRules(userId: string): PriceRule[] {
  return getLocalData<PriceRule>(`price_rules_${userId || 'demo'}`, DEFAULT_PRICE_RULES);
}

export function savePriceRules(userId: string, rules: PriceRule[]): void {
  setLocalData(`price_rules_${userId || 'demo'}`, rules);
  notifyListeners(`price_rules_${userId || 'demo'}`);
}

// Helper: Calculate Total Price for a given transaction row based on active price rules
export function calculateRowPrice(
  row: { type?: string; country?: string; group?: string; location?: string; member?: string; company?: string; quantity?: number },
  rules: PriceRule[] = DEFAULT_PRICE_RULES
): number {
  const qty = Number(row.quantity) || 1;
  const sortedRules = [...rules].filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (rule.conditions.length === 0) {
      return rule.price * qty; // Default catch-all rule
    }
    const matchesAll = rule.conditions.every(cond => {
      const val = (row[cond.field] || "").toString().toLowerCase().trim();
      const target = cond.value.toLowerCase().trim();
      return cond.operator === 'equals' ? val === target : val.includes(target);
    });

    if (matchesAll) {
      return rule.price * qty;
    }
  }

  return 300 * qty; // Default fallback
}


// ----------------------------------------------------
// ADMIN LOGS
// ----------------------------------------------------

export function logAdminAction(userId: string, actionType: string, actionDetail: string, isDemo = false): void {
  const log: AdminLog = {
    id: 'log_' + Date.now(),
    userId: userId || 'demo-user-id',
    actionType,
    actionDetail,
    timestamp: new Date().toISOString(),
  };

  const key = `admin_logs_${userId || 'demo'}`;
  const current = getLocalData<AdminLog>(key, []);
  setLocalData(key, [log, ...current]);

  if (!isDemo && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    addDoc(collection(db, "fact_admin_log"), log).catch(err => console.warn("Failed writing admin log to Firestore:", err));
  }
}

export function getAdminLogs(userId: string): AdminLog[] {
  return getLocalData<AdminLog>(`admin_logs_${userId || 'demo'}`, []);
}

// ----------------------------------------------------
// FIRESTORE DATABASE SEEDER / IMPORTER
// ----------------------------------------------------
export async function seedUserDataToFirestore(userId: string): Promise<{ success: boolean; message: string }> {
  if (!userId || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    return { success: true, message: "Running in local demo mode, data is pre-seeded in browser storage." };
  }

  try {
    // 1. Transactions Seeding (chunked in batches of 300)
    const transSnap = await getDocs(query(collection(db, "fact_cheki_transaction"), where("userId", "==", userId)));
    if (transSnap.empty) {
      const CHUNK_SIZE = 300;
      for (let i = 0; i < INITIAL_TRANSACTIONS.length; i += CHUNK_SIZE) {
        const chunk = INITIAL_TRANSACTIONS.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((t) => {
          const docRef = doc(collection(db, "fact_cheki_transaction"));
          batch.set(docRef, {
            ...t,
            userId,
            month: t.date ? t.date.substring(0, 7) : "",
            year: t.date ? t.date.substring(0, 4) : "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
        await batch.commit();
      }
    }

    // Helper for dim tables
    const seedDimTable = async (tableName: string, defaultData: Record<string, unknown>[]) => {
      const snap = await getDocs(query(collection(db, tableName), where("userId", "==", userId)));
      if (snap.empty) {
        const CHUNK_SIZE = 300;
        for (let i = 0; i < defaultData.length; i += CHUNK_SIZE) {
          const chunk = defaultData.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            const docRef = doc(collection(db, tableName));
            batch.set(docRef, {
              ...item,
              userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          });
          await batch.commit();
        }
      }
    };

    await seedDimTable("dim_member", DEFAULT_MEMBERS);
    await seedDimTable("dim_company", DEFAULT_COMPANIES);
    await seedDimTable("dim_group", DEFAULT_GROUPS);
    await seedDimTable("dim_color", DEFAULT_COLORS);
    await seedDimTable("dim_type", DEFAULT_TYPES);
    await seedDimTable("dim_country", DEFAULT_COUNTRIES);
    await seedDimTable("dim_location", [
      { location: 'Bangkok' },
      { location: 'Tokyo' },
      { location: 'Seoul' },
      { location: 'Taipei' }
    ]);

    logAdminAction(userId, "SEED_FIRESTORE_DATA", `Successfully imported ${INITIAL_TRANSACTIONS.length} transaction records and ${DEFAULT_MEMBERS.length} dim members into Firestore`);
    return { success: true, message: `Successfully synced ${INITIAL_TRANSACTIONS.length} transactions to Firestore!` };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Failed to seed Firestore data:", error);
    return { success: false, message: `Error syncing data to Firestore: ${error.message}` };
  }
}

