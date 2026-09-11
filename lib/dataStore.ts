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
  setDoc,
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

function getLocalObject<T>(key: string, defaultValue: T): T {
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

function setLocalObject<T>(key: string, data: T): void {
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
      const active = raw.filter((i: any) => !i.is_deleted);
      onData(sortNewestTop(active));
    };
    load();
    return subscribeToLocalStore(`${tableName}_${userId || 'demo'}`, load);
  }

  try {
    const q = query(collection(db, tableName), where("userId", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const dbItems: T[] = [];
      const dbMapById = new Map<string, T>();
      const deletedIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const d = { ...data, id: docSnap.id } as unknown as T;
        if ((data as any).is_deleted) {
          deletedIds.add(docSnap.id);
        } else {
          dbItems.push(d);
          dbMapById.set(docSnap.id, d);
        }
      });

      const finalItems: T[] = [];
      const seenKeys = new Set<string>();

      // 1. Add DB items (non-deleted)
      dbItems.forEach(item => {
        const valKey = getItemValueString(item as Record<string, unknown>).toLowerCase() || String((item as any).id);
        if (!seenKeys.has(valKey)) {
          seenKeys.add(valKey);
          finalItems.push(item);
        }
      });

      // 2. Add seed items if not deleted or overridden
      if (seed && seed.length > 0) {
        seed.forEach(item => {
          const seedId = String((item as any).id);
          if (deletedIds.has(seedId)) return;
          if (dbMapById.has(seedId)) return;

          const valKey = getItemValueString(item as Record<string, unknown>).toLowerCase() || seedId;
          if (!seenKeys.has(valKey)) {
            seenKeys.add(valKey);
            finalItems.push(item);
          }
        });
      }

      onData(sortNewestTop(finalItems));
    }, () => {
      const raw = getLocalData<T>(`${tableName}_${userId}`, seed);
      const active = raw.filter((i: any) => !i.is_deleted);
      onData(sortNewestTop(active));
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
  const todayDateStr = now.split('T')[0];
  const payload = { 
    ...data, 
    is_custom: data.is_custom !== undefined ? data.is_custom : true,
    userId, 
    createdAt: data.createdAt || now, 
    updatedAt: now,
    date_added: data.date_added || todayDateStr,
    date_modified: todayDateStr,
  };
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
  const now = new Date().toISOString();
  const todayDateStr = now.split('T')[0];
  const payload = { 
    ...data, 
    updatedAt: now,
    date_modified: todayDateStr,
  };
  const valStr = getItemValueString(data);

  if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
    const key = `${tableName}_${userId || 'demo'}`;
    const current = getLocalData<Record<string, unknown> & { id: string }>(key, []);
    let found = false;
    const updated = current.map(item => {
      if (item.id === id) {
        found = true;
        return { ...item, ...payload };
      }
      return item;
    });
    if (!found) {
      updated.unshift({ id, ...payload });
    }
    setLocalData(key, updated);
    notifyListeners(key);
    logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated ID ${id} (${valStr})`, true);
    return;
  }

  // If modifying a Back Office default table ('default_dim_*' or userId === 'global')
  if (tableName.startsWith('default_') || userId === 'global') {
    const docRef = doc(db, tableName, id);
    await setDoc(docRef, { ...payload, id, userId: 'global' }, { merge: true });
    logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated ID ${id} (${valStr})`);
    return;
  }

  // Regular user updating dim_* doc from Admin tab (user override on default Back Office item)
  if (id.startsWith('default_') || data.isDefault || data.backoffice_id) {
    const targetId = String(data.backoffice_id || id);
    const { isDefault: _ignoreDef, ...overrideData } = data;
    const overridePayload = {
      ...overrideData,
      id: targetId,
      backoffice_id: targetId,
      is_custom: false,
      userId,
      updatedAt: now,
      date_modified: todayDateStr,
    };

    if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
      const key = `${tableName}_${userId || 'demo'}`;
      const current = getLocalData<Record<string, unknown> & { id: string }>(key, []);
      let found = false;
      const updated = current.map(item => {
        if (item.id === targetId || (item as any).backoffice_id === targetId) {
          found = true;
          return { ...item, ...overridePayload };
        }
        return item;
      });
      if (!found) {
        updated.unshift(overridePayload);
      }
      setLocalData(key, updated);
      notifyListeners(key);
      logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated override for ${targetId} (${valStr})`, true);
      return;
    }

    const docRef = doc(db, tableName, targetId);
    await setDoc(docRef, overridePayload, { merge: true });
    logAdminAction(userId, `UPDATE_${tableName.toUpperCase()}`, `Updated override for ${targetId} (${valStr})`);
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
    setLocalData(key, current.filter(item => item.id !== id && (item as any).backoffice_id !== id));
    notifyListeners(key);
    logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${id}${valSuffix}`, true);
    return;
  }

  // If modifying a Back Office default table ('default_dim_*' or userId === 'global')
  if (tableName.startsWith('default_') || userId === 'global') {
    if (id.startsWith('default_') || id.includes('_')) {
      // Seed item: write a soft-delete marker document with id in Firestore so snapshot overrides static seed!
      await setDoc(doc(db, tableName, id), {
        id,
        userId: 'global',
        is_deleted: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, tableName, id));
    }
    logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${id}${valSuffix}`);
    return;
  }

  // Regular user deleting inherited default item from Admin tab
  if (id.startsWith('default_')) {
    const targetId = String(id);
    const overridePayload = {
      id: targetId,
      backoffice_id: targetId,
      originalId: targetId,
      is_custom: false,
      userId,
      is_deleted: true,
      is_active: false,
      updatedAt: new Date().toISOString()
    };

    if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
      const key = `${tableName}_${userId || 'demo'}`;
      const current = getLocalData<Record<string, unknown> & { id: string }>(key, []);
      let found = false;
      const updated = current.map(item => {
        if (item.id === targetId || (item as any).backoffice_id === targetId) {
          found = true;
          return { ...item, ...overridePayload };
        }
        return item;
      });
      if (!found) {
        updated.unshift(overridePayload);
      }
      setLocalData(key, updated);
      notifyListeners(key);
      logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${targetId}${valSuffix}`, true);
      return;
    }

    const docRef = doc(db, tableName, targetId);
    await setDoc(docRef, overridePayload, { merge: true });
    logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${targetId}${valSuffix}`);
    return;
  }

  await deleteDoc(doc(db, tableName, id));
  logAdminAction(userId, `DELETE_${tableName.toUpperCase()}`, `Deleted ID ${id}${valSuffix}`);
}

export function subscribeDefaultMetadata<T>(
  tableName: string,
  defaultSeed: Omit<T, 'id' | 'userId'>[],
  onData: (items: T[]) => void,
  isDemo: boolean = false
): () => void {
  const defaultTable = `default_${tableName}`;
  return subscribeMetadata<T>(defaultTable, 'global', defaultSeed, onData, isDemo);
}

export interface UserSubscriptionConfig {
  subscribeAll: boolean;
  countries: string[];
  companies: string[];
  groups: string[];
}

export function getUserSubscriptions(userId: string): UserSubscriptionConfig {
  const key = `subscriptions_${userId || 'demo'}`;
  return getLocalObject<UserSubscriptionConfig>(key, {
    subscribeAll: false,
    countries: [],
    companies: [],
    groups: [],
  });
}

export function saveUserSubscriptions(userId: string, config: UserSubscriptionConfig): void {
  const key = `subscriptions_${userId || 'demo'}`;
  setLocalObject(key, config);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cheki_subscriptions_updated'));
  }
}

export function subscribeMergedMetadata<T>(
  tableName: string,
  userId: string,
  defaultSeed: Omit<T, 'id' | 'userId'>[],
  onData: (items: T[]) => void,
  isDemo: boolean = false
): () => void {
  const seed = defaultSeed.map((item, idx) => ({
    ...item,
    id: `default_${tableName}_${idx + 1}`,
    userId: 'global',
    isDefault: true,
    is_active: (item as any).is_active !== undefined ? (item as any).is_active : true,
  })) as unknown as T[];

  let defaultItems: T[] = seed;
  let userItems: T[] = [];

  const emitMerged = () => {
    const userSubs = getUserSubscriptions(userId);

    // Maps for fast user override lookups
    const userOverridesById = new Map<string, any>();
    const userOverridesByKey = new Map<string, any>();

    userItems.forEach(u => {
      const uId = String((u as any).id || '');
      if (uId) userOverridesById.set(uId, u);

      const boId = String((u as any).backoffice_id || (u as any).originalId || '');
      if (boId) userOverridesById.set(boId, u);

      const val = getItemValueString(u as Record<string, unknown>).toLowerCase();
      if (val) userOverridesByKey.set(val, u);
    });

    const merged: T[] = [];
    const processedKeys = new Set<string>();
    const processedUserItemObjects = new Set<any>();

    // 1. Process Default items from Back Office (filter out disallowed & unsubscribed items)
    defaultItems.forEach((d) => {
      const isAllowed = (d as any).is_allowed_import !== false && (d as any).allow_import !== false;
      if (!isAllowed) return; // Disallowed in Back Office

      // Check optional user subscription filters (driven strictly by Group level)
      if (!userSubs.subscribeAll) {
        const itemCountry = String((d as any).country || '').trim().toLowerCase();
        const itemCompany = String((d as any).company || '').trim().toLowerCase();
        const itemGroup = String((d as any).group || '').trim().toLowerCase();

        const subscribedGroupSet = new Set(userSubs.groups.map(g => String(g).trim().toLowerCase()));

        if (tableName === 'dim_member') {
          // Member is subscribed ONLY if its group is in subscribedGroupSet
          if (!subscribedGroupSet.has(itemGroup)) return;
        } else if (tableName === 'dim_group') {
          // Group is subscribed ONLY if it is in subscribedGroupSet
          if (!subscribedGroupSet.has(itemGroup)) return;
        } else if (tableName === 'dim_company') {
          // Company is subscribed ONLY if at least one group in userSubs.groups belongs to this company
          const hasSubscribedGroup = defaultItems.some(item => {
            const grp = String((item as any).group || '').trim().toLowerCase();
            const comp = String((item as any).company || '').trim().toLowerCase();
            return comp === itemCompany && subscribedGroupSet.has(grp);
          }) || (subscribedGroupSet.size > 0 && userSubs.companies.some(c => String(c).trim().toLowerCase() === itemCompany));

          if (!hasSubscribedGroup) return;
        } else {
          // Fallback (e.g. dim_country): check if any group in userSubs.groups belongs to this country
          const hasSubscribedGroupInCountry = defaultItems.some(item => {
            const grp = String((item as any).group || '').trim().toLowerCase();
            const cnt = String((item as any).country || '').trim().toLowerCase();
            return cnt === itemCountry && subscribedGroupSet.has(grp);
          }) || (subscribedGroupSet.size > 0 && userSubs.countries.some(c => String(c).trim().toLowerCase() === itemCountry));

          if (!hasSubscribedGroupInCountry) return;
        }
      }

      const dId = String((d as any).id || '');
      const val = getItemValueString(d as Record<string, unknown>).toLowerCase();

      // Priority lookup: 1) by Back Office ID (dId), 2) by string value
      const override = (dId ? userOverridesById.get(dId) : null) || (val ? userOverridesByKey.get(val) : null);

      if (dId) processedKeys.add(dId);
      if (val) processedKeys.add(val);

      if (override) {
        processedUserItemObjects.add(override);
        const oId = String((override as any).id || '');
        const oBoId = String((override as any).backoffice_id || (override as any).originalId || '');
        const oVal = getItemValueString(override as Record<string, unknown>).toLowerCase();

        if (oId) processedKeys.add(oId);
        if (oBoId) processedKeys.add(oBoId);
        if (oVal) processedKeys.add(oVal);
      }

      const activeState = override && (override as any).is_active !== undefined
        ? Boolean((override as any).is_active)
        : ((d as any).is_active !== undefined ? Boolean((d as any).is_active) : true);

      const isDeleted = Boolean((override && (override as any).is_deleted) || (d as any).is_deleted);
      if (isDeleted) return;

      merged.push({
        ...d,
        isDefault: true,
        is_active: activeState,
      });
    });

    // 2. Process Custom User-Created items ONLY
    userItems.forEach((u) => {
      if (processedUserItemObjects.has(u)) return;

      const uId = String((u as any).id || '');
      const boId = String((u as any).backoffice_id || (u as any).originalId || '');
      const val = getItemValueString(u as Record<string, unknown>).toLowerCase();

      const isOverrideOrNotCustom = processedUserItemObjects.has(u) ||
                                    Boolean(boId) ||
                                    (uId && (processedKeys.has(uId) || uId.startsWith('default_'))) ||
                                    (val && processedKeys.has(val)) ||
                                    (u as any).is_custom === false ||
                                    (u as any).isDefault === true ||
                                    (u as any).is_imported === true;

      if (!isOverrideOrNotCustom) {
        processedKeys.add(uId);
        if (val) processedKeys.add(val);

        merged.push({
          ...u,
          isDefault: false,
          is_active: (u as any).is_active !== undefined ? Boolean((u as any).is_active) : true,
        });
      }
    });

    onData(merged);
  };

  const defaultTable = `default_${tableName}`;
  const unsubDefault = subscribeMetadata<T>(defaultTable, 'global', defaultSeed, (items) => {
    defaultItems = items.map(i => ({ 
      ...i, 
      isDefault: true,
      is_active: (i as any).is_active !== undefined ? Boolean((i as any).is_active) : true
    }));
    emitMerged();
  }, isDemo);

  const unsubUser = subscribeMetadata<T>(tableName, userId, [], (items) => {
    userItems = items.map(i => ({ ...i, isDefault: false }));
    emitMerged();
  }, isDemo);

  const handleSubscriptionsUpdated = () => emitMerged();
  if (typeof window !== 'undefined') {
    window.addEventListener('cheki_subscriptions_updated', handleSubscriptionsUpdated);
  }

  return () => {
    unsubDefault();
    unsubUser();
    if (typeof window !== 'undefined') {
      window.removeEventListener('cheki_subscriptions_updated', handleSubscriptionsUpdated);
    }
  };
}

export async function addDefaultMetadataDoc<T extends { id: string; userId: string }>(
  tableName: string,
  data: Record<string, unknown>,
  isDemo = false
): Promise<void> {
  const defaultTable = `default_${tableName}`;
  return addMetadataDoc<T>(defaultTable, 'global', { ...data, isDefault: true }, isDemo);
}

export async function updateDefaultMetadataDoc(
  tableName: string,
  id: string,
  data: Record<string, unknown>,
  isDemo = false
): Promise<void> {
  const defaultTable = `default_${tableName}`;
  return updateMetadataDoc(defaultTable, id, 'global', { ...data, isDefault: true }, isDemo);
}

export async function deleteDefaultMetadataDoc(
  tableName: string,
  id: string,
  itemValue?: string,
  isDemo = false
): Promise<void> {
  const defaultTable = `default_${tableName}`;
  return deleteMetadataDoc(defaultTable, id, 'global', itemValue, isDemo);
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

    logAdminAction(userId, "SEED_FIRESTORE_DATA", `Successfully imported ${INITIAL_TRANSACTIONS.length} transaction records into Firestore`);
    return { success: true, message: `Successfully synced ${INITIAL_TRANSACTIONS.length} transactions to Firestore!` };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Failed to seed Firestore data:", error);
    return { success: false, message: `Error syncing data to Firestore: ${error.message}` };
  }
}

export async function clearUserCustomMetadata(userId: string, isDemo = false): Promise<void> {
  const tables = ['dim_member', 'dim_group', 'dim_company'];
  for (const t of tables) {
    if (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) {
      setLocalData(`${t}_${userId || 'demo'}`, []);
      notifyListeners(`${t}_${userId || 'demo'}`);
    } else {
      try {
        const snap = await getDocs(query(collection(db, t), where("userId", "==", userId)));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (err) {
        console.warn(`Error clearing ${t}:`, err);
      }
    }
  }
}

export async function importFromDefaultMetadata(
  userId: string,
  selection: {
    country?: string;
    company?: string;
    group?: string;
  },
  defaultMembers: any[],
  defaultGroups: any[],
  defaultCompanies: any[],
  isDemo = false
): Promise<{ count: number }> {
  // Fetch current user custom items to prevent duplicates
  const existingGroupsSnap = (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) 
    ? getLocalData<any>(`dim_group_${userId || 'demo'}`, []) 
    : (await getDocs(query(collection(db, 'dim_group'), where("userId", "==", userId)))).docs.map(d => d.data());
  
  const existingCompaniesSnap = (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) 
    ? getLocalData<any>(`dim_company_${userId || 'demo'}`, []) 
    : (await getDocs(query(collection(db, 'dim_company'), where("userId", "==", userId)))).docs.map(d => d.data());
  
  const existingMembersSnap = (isDemo || process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("Demo")) 
    ? getLocalData<any>(`dim_member_${userId || 'demo'}`, []) 
    : (await getDocs(query(collection(db, 'dim_member'), where("userId", "==", userId)))).docs.map(d => d.data());

  const existingGroupNames = new Set<string>(existingGroupsSnap.map(d => String(d.group || '').toLowerCase().trim()));
  const existingCompanyNames = new Set<string>(existingCompaniesSnap.map(d => String(d.company || '').toLowerCase().trim()));
  const existingMemberNames = new Set<string>(existingMembersSnap.map(d => String(d.member_name || '').toLowerCase().trim()));

  const isImportAllowed = (item: any) => {
    if (!item) return false;
    if (item.is_allowed_import === false || item.allow_import === false) return false;
    return true;
  };

  const allowedCompaniesSet = new Set(defaultCompanies.filter(c => isImportAllowed(c)).map(c => c.company));

  // 1. Determine matching groups
  const matchingGroups = defaultGroups.filter((g) => {
    if (!isImportAllowed(g)) return false;
    if (g.company && allowedCompaniesSet.size > 0 && !allowedCompaniesSet.has(g.company)) return false;
    if (selection.country && g.country !== selection.country) return false;
    if (selection.company && g.company !== selection.company) return false;
    if (selection.group && g.group !== selection.group) return false;
    return true;
  });

  const matchingGroupNames = new Set(matchingGroups.map(g => g.group));

  // 2. Determine matching companies
  const matchingCompanies = defaultCompanies.filter((c) => {
    if (!isImportAllowed(c)) return false;
    if (selection.company) return c.company === selection.company;
    return matchingGroups.some(g => g.company === c.company);
  });

  // 3. Determine matching members
  const matchingMembers = defaultMembers.filter((m) => {
    if (!isImportAllowed(m)) return false;
    if (!matchingGroupNames.has(m.group)) return false;
    if (selection.group && m.group !== selection.group) return false;
    return true;
  });

  let count = 0;

  // Save to user dim_* collections (skipping existing duplicate names)
  for (const g of matchingGroups) {
    if (existingGroupNames.has(String(g.group).toLowerCase().trim())) continue;
    const { id, isDefault, is_default, ...data } = g;
    await addMetadataDoc('dim_group', userId, { ...data, is_imported: true, is_active: true }, isDemo);
    count++;
  }

  for (const c of matchingCompanies) {
    if (existingCompanyNames.has(String(c.company).toLowerCase().trim())) continue;
    const { id, isDefault, is_default, ...data } = c;
    await addMetadataDoc('dim_company', userId, { ...data, is_imported: true, is_active: true }, isDemo);
    count++;
  }

  for (const m of matchingMembers) {
    if (existingMemberNames.has(String(m.member_name).toLowerCase().trim())) continue;
    const { id, isDefault, is_default, ...data } = m;
    await addMetadataDoc('dim_member', userId, { ...data, is_imported: true, is_active: true }, isDemo);
    count++;
  }

  logAdminAction(userId, 'IMPORT_DEFAULT_METADATA', `Imported ${count} items from Default settings`, isDemo);
  return { count };
}

