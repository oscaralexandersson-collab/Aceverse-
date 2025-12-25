
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  SearchResult, ContactRequest, Notification, UserSettings, 
  BrandDNA, MarketingCampaign, CompanyReport, CompanyReportEntry 
} from '../types';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

const SESSION_KEY = 'aceverse_session_user';
const DB_NAME = 'AceverseDB';
const DB_VERSION = 1;

/**
 * Structured error codes for intelligent UI recovery
 */
export enum DBErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_FOUND = 'NOT_FOUND',
  ABORTED = 'ABORTED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export class AceverseDatabaseError extends Error {
  constructor(
    public message: string, 
    public code: DBErrorCode = DBErrorCode.UNKNOWN,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AceverseDatabaseError';
  }
}

// --- SECURITY: Encryption Logic ---

class CryptoService {
  private static readonly ALGO = 'AES-GCM';
  
  private async getKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(`aceverse-salt-${userId}`),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode(userId), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: CryptoService.ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: any, userId: string): Promise<string> {
    try {
      const key = await this.getKey(userId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const ciphertext = await crypto.subtle.encrypt({ name: CryptoService.ALGO, iv }, key, encoded);
      
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error("Encryption failed", e);
      return JSON.stringify(data);
    }
  }

  async decrypt(cipherBase64: string, userId: string): Promise<any> {
    try {
      const key = await this.getKey(userId);
      const combined = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt({ name: CryptoService.ALGO, iv }, key, ciphertext);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      try { return JSON.parse(cipherBase64); } catch { return null; }
    }
  }
}

// --- MEMORY: IndexedDB Storage Engine ---

class IndexedDBEngine {
  private db: IDBDatabase | null = null;
  private openingPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.openingPromise) return this.openingPromise;

    this.openingPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('userdata')) {
          db.createObjectStore('userdata');
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Handle unexpected closure or version changes from other tabs
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          console.warn("IndexedDB connection closed due to version change.");
        };
        
        this.db.onclose = () => {
          this.db = null;
        };

        this.openingPromise = null;
        resolve(this.db);
      };

      request.onerror = () => {
        this.openingPromise = null;
        reject(request.error);
      };
    });

    return this.openingPromise;
  }

  /**
   * Helper to perform a transaction with auto-retry on connection closure
   */
  private async performTransaction<T>(
    mode: IDBTransactionMode, 
    callback: (store: IDBObjectStore) => IDBRequest<T>,
    retries = 1
  ): Promise<T> {
    try {
      const db = await this.getDB();
      return await new Promise((resolve, reject) => {
        try {
          const tx = db.transaction('userdata', mode);
          const store = tx.objectStore('userdata');
          const request = callback(store);
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          tx.onerror = () => reject(tx.error);
        } catch (e: any) {
          // Detect closed/closing connection error
          if (e.name === 'InvalidStateError' || e.message?.includes('closing')) {
            this.db = null; // Clear stale connection
            reject(e);
          } else {
            reject(e);
          }
        }
      });
    } catch (e: any) {
      if (retries > 0 && (e.name === 'InvalidStateError' || e.message?.includes('closing'))) {
        return this.performTransaction(mode, callback, retries - 1);
      }
      throw e;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.performTransaction('readwrite', (store) => store.put(value, key));
  }

  async get(key: string): Promise<string | null> {
    return await this.performTransaction('readonly', (store) => store.get(key));
  }

  async delete(key: string): Promise<void> {
    await this.performTransaction('readwrite', (store) => store.delete(key));
  }
}

// --- PERFORMANCE: Cache and Helper classes ---

class DatabaseService {
  private storage = new IndexedDBEngine();
  private crypt = new CryptoService();
  private maxRetries = 2;
  private backoffMs = 500;
  private isSyncing = false;
  
  private userDataCache: Map<string, { data: UserData, expiry: number }> = new Map();
  private CACHE_TTL = 30000;

  private validateId(id: string | undefined): string {
    if (!id || typeof id !== 'string') throw new AceverseDatabaseError("Invalid ID provided", DBErrorCode.VALIDATION_ERROR);
    return id;
  }

  private validateEmail(email: string): string {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) throw new AceverseDatabaseError("Ogiltig e-postadress.", DBErrorCode.VALIDATION_ERROR);
    return email.trim().toLowerCase();
  }

  private invalidateCache(userId: string) {
    this.userDataCache.delete(userId);
  }

  private async safeSupabaseCall<T>(
    operation: (signal: AbortSignal) => Promise<PostgrestResponse<T> | PostgrestSingleResponse<T>>,
    retries = this.maxRetries
  ): Promise<{ data: T | T[] | null; error: AceverseDatabaseError | null }> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await operation(controller.signal);
        clearTimeout(timeoutId);
        if (response.error) {
          lastError = response.error;
          const status = (response.error as any).status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            let code = DBErrorCode.UNKNOWN;
            if (status === 401 || status === 403) code = DBErrorCode.AUTH_EXPIRED;
            if (status === 404) code = DBErrorCode.NOT_FOUND;
            return { data: null, error: new AceverseDatabaseError(response.error.message, code, response.error) };
          }
        } else { return { data: response.data, error: null }; }
      } catch (e: any) {
        clearTimeout(timeoutId);
        lastError = e;
        if (e.name === 'AbortError') return { data: null, error: new AceverseDatabaseError("Timeout.", DBErrorCode.ABORTED, e) };
      }
      if (i < retries) await new Promise(r => setTimeout(r, this.backoffMs * Math.pow(2, i)));
    }
    return { data: null, error: new AceverseDatabaseError("Nätverksfel.", DBErrorCode.NETWORK_ERROR, lastError) };
  }

  async syncPendingItems(userId: string) {
    if (this.isSyncing || userId.startsWith('local-')) return;
    this.isSyncing = true;
    try {
      const tables = ['leads', 'ideas', 'pitches', 'chat_messages', 'chat_sessions'];
      for (const table of tables) {
        const localData = await this.getLocal(table, userId);
        const pendingItems = localData.filter((i: any) => i.pending === true);
        for (const item of pendingItems) {
          const { pending, ...cleanItem } = item;
          const { error } = await this.safeSupabaseCall(async (s) => supabase.from(table).insert({ ...cleanItem, user_id: userId }).abortSignal(s));
          if (!error) await this.updateLocal(table, userId, item.id, { pending: false });
        }
      }
    } catch (e) { console.error("Sync error", e); } finally { this.isSyncing = false; }
  }

  private async getLocal(table: string, userId: string): Promise<any[]> {
    try {
      const cipher = await this.storage.get(`ace_${userId}_${table}`);
      if (!cipher) return [];
      const decrypted = await this.crypt.decrypt(cipher, userId);
      return Array.isArray(decrypted) ? decrypted : [];
    } catch (e) {
      console.error("Local read failed", e);
      return [];
    }
  }

  private async saveLocal(table: string, userId: string, item: any) {
    const current = await this.getLocal(table, userId);
    let next: any[];
    if (item.id) {
      const idx = current.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) { current[idx] = item; next = current; }
      else { next = [item, ...current]; }
    } else { next = [item, ...current]; }
    
    const cipher = await this.crypt.encrypt(next, userId);
    await this.storage.set(`ace_${userId}_${table}`, cipher);
    this.invalidateCache(userId);
  }

  private async updateLocal(table: string, userId: string, id: string, updates: any) {
    const current = await this.getLocal(table, userId);
    const idx = current.findIndex((i: any) => i.id === id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updates };
      const cipher = await this.crypt.encrypt(current, userId);
      await this.storage.set(`ace_${userId}_${table}`, cipher);
      this.invalidateCache(userId);
    }
  }

  private async removeFromLocal(table: string, userId: string, id: string) {
    const current = await this.getLocal(table, userId);
    const filtered = current.filter((i: any) => i.id !== id);
    const cipher = await this.crypt.encrypt(filtered, userId);
    await this.storage.set(`ace_${userId}_${table}`, cipher);
    this.invalidateCache(userId);
  }

  // --- Auth & Profile ---

  async signup(email: string, pass: string, fn: string, ln: string): Promise<User> {
    const validEmail = this.validateEmail(email);
    if (!fn || !ln) throw new AceverseDatabaseError("Namn krävs.", DBErrorCode.VALIDATION_ERROR);
    
    if (validEmail.endsWith('@local.dev') || ['test@aceverse.se', 'demo@aceverse.se'].includes(validEmail)) {
      const user: User = { id: validEmail.includes('demo') ? 'local-demo' : `local-${Date.now()}`, email: validEmail, firstName: fn, lastName: ln, createdAt: new Date().toISOString(), onboardingCompleted: true, plan: 'pro' };
      this.setSession(user);
      return user;
    }
    const { data, error } = await supabase.auth.signUp({ email: validEmail, password: pass, options: { data: { first_name: fn, last_name: ln, onboarding_completed: false, plan: 'free' } } });
    if (error) throw new AceverseDatabaseError(error.message, DBErrorCode.UNKNOWN, error);
    if (data.user) { const u = this.mapUser(data.user); this.setSession(u); return u; }
    throw new AceverseDatabaseError('Misslyckades.');
  }

  async login(email: string, pass: string, rememberMe = true): Promise<User> {
    const validEmail = this.validateEmail(email);
    if (['demo@aceverse.se', 'test@aceverse.se'].includes(validEmail)) return this.createDemoUser();
    const { data, error } = await supabase.auth.signInWithPassword({ email: validEmail, password: pass });
    if (error) throw new AceverseDatabaseError(error.message, DBErrorCode.AUTH_EXPIRED, error);
    if (data.user) { const u = this.mapUser(data.user); this.setSession(u); return u; }
    throw new AceverseDatabaseError('Misslyckades.');
  }

  async loginWithOAuth(provider: 'google' | 'apple') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw new AceverseDatabaseError(error.message, DBErrorCode.AUTH_EXPIRED, error);
  }

  private setSession(user: User) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    this.userDataCache.clear();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) return this.mapUser(data.session.user);
    } catch {}
    const local = localStorage.getItem(SESSION_KEY);
    return local ? JSON.parse(local) : null;
  }

  // --- CRUD API ---

  async getUserData(userId: string): Promise<UserData> {
    this.validateId(userId);
    const cached = this.userDataCache.get(userId);
    if (cached && Date.now() < cached.expiry) return cached.data;

    const isLocal = userId.startsWith('local-');
    let remoteResults: any[] = [];
    if (!isLocal) {
      const ops = [
        this.safeSupabaseCall<Lead>((s) => supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(s)),
        this.safeSupabaseCall<Idea>((s) => supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(s)),
        this.safeSupabaseCall<Pitch>((s) => supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(s)),
        this.safeSupabaseCall<ChatMessage>((s) => supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).abortSignal(s)),
        this.safeSupabaseCall<ChatSession>((s) => supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }).abortSignal(s))
      ];
      const res = await Promise.allSettled(ops);
      remoteResults = res.map(r => r.status === 'fulfilled' ? r.value.data : null);
    }

    const loadTable = async (table: string, remote: any[] | null) => {
      const local = await this.getLocal(table, userId);
      if (isLocal || !remote) return local;
      const remoteIds = new Set(remote.map(i => i.id));
      const pending = local.filter((i: any) => i.pending === true && !remoteIds.has(i.id));
      const merged = [...pending, ...remote];
      const cipher = await this.crypt.encrypt(merged, userId);
      await this.storage.set(`ace_${userId}_${table}`, cipher);
      return merged;
    };

    const data: UserData = {
      leads: await loadTable('leads', remoteResults[0]),
      ideas: await loadTable('ideas', remoteResults[1]),
      pitches: await loadTable('pitches', remoteResults[2]),
      chatHistory: await loadTable('chat_messages', remoteResults[3]),
      coaches: await this.getLocal('coaches', userId),
      sessions: await loadTable('chat_sessions', remoteResults[4]),
      notifications: await this.getLocal('notifications', userId),
      settings: (await this.getLocal('settings', userId))[0] || { notifications: { email: true, push: true, marketing: false }, privacy: { publicProfile: false, dataSharing: false } },
      marketingCampaigns: await this.getLocal('marketing_campaigns', userId),
      brandDNAs: await this.getLocal('brand_dnas', userId),
      reports: await this.getLocal('company_reports', userId)
    };

    this.userDataCache.set(userId, { data, expiry: Date.now() + this.CACHE_TTL });
    if (!isLocal) this.syncPendingItems(userId);
    return data;
  }

  async search(userId: string, query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    if (q.length < 2) return [];
    const data = await this.getUserData(userId);
    const results: SearchResult[] = [];
    data.leads.forEach(l => { if (l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)) results.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company, view: 'crm' }); });
    data.ideas.forEach(i => { if (i.title.toLowerCase().includes(q)) results.push({ id: i.id, type: 'idea', title: i.title, subtitle: 'Idé', view: 'ideas' }); });
    return results;
  }

  private async performCRUD(table: string, userId: string, op: 'insert' | 'update' | 'delete', item: any, id?: string) {
    this.validateId(userId);
    const isLocal = userId.startsWith('local-');
    const tid = id || item.id;
    if (op === 'insert') await this.saveLocal(table, userId, { ...item, pending: !isLocal });
    else if (op === 'update') await this.updateLocal(table, userId, tid, item);
    else if (op === 'delete') await this.removeFromLocal(table, userId, tid);

    if (!isLocal) {
      const { error } = await this.safeSupabaseCall(async (s) => {
        const q = supabase.from(table);
        if (op === 'insert') return q.insert({ ...item, user_id: userId }).abortSignal(s);
        if (op === 'update') return q.update(item).eq('id', tid).eq('user_id', userId).abortSignal(s);
        return q.delete().eq('id', tid).eq('user_id', userId).abortSignal(s);
      });
      if (!error && op === 'insert') await this.updateLocal(table, userId, tid, { pending: false });
    }
  }

  async addLead(userId: string, l: Omit<Lead, 'id' | 'dateAdded'>) { const id = crypto.randomUUID(); await this.performCRUD('leads', userId, 'insert', { id, dateAdded: new Date().toISOString(), ...l }); return { id, ...l } as Lead; }
  async updateLead(userId: string, id: string, u: Partial<Lead>) { await this.performCRUD('leads', userId, 'update', u, id); }
  async deleteLead(userId: string, id: string) { await this.performCRUD('leads', userId, 'delete', {}, id); }

  async addIdea(userId: string, i: Omit<Idea, 'id' | 'dateCreated' | 'score'>) { const id = crypto.randomUUID(); await this.performCRUD('ideas', userId, 'insert', { id, dateCreated: new Date().toISOString(), score: 0, ...i }); return { id, ...i } as Idea; }
  async updateIdeaState(userId: string, id: string, u: Partial<Idea>) { await this.performCRUD('ideas', userId, 'update', u, id); }
  async deleteIdea(userId: string, id: string) { await this.performCRUD('ideas', userId, 'delete', {}, id); }

  async addMessage(userId: string, m: Omit<ChatMessage, 'id' | 'timestamp'>) { const id = crypto.randomUUID(); const ts = Date.now(); await this.performCRUD('chat_messages', userId, 'insert', { id, timestamp: ts, ...m }); return { id, timestamp: ts, ...m } as ChatMessage; }
  
  async createChatSession(userId: string, name: string): Promise<ChatSession> {
    const id = crypto.randomUUID();
    const session = { id, name, lastMessageAt: Date.now() };
    await this.performCRUD('chat_sessions', userId, 'insert', session);
    return session as ChatSession;
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    const existing = data.sessions.find(s => s.group === 'System');
    if (existing) return existing;
    const id = crypto.randomUUID();
    const session = { id, name: 'UF-läraren', group: 'System', lastMessageAt: Date.now() };
    await this.performCRUD('chat_sessions', userId, 'insert', session);
    return session as ChatSession;
  }

  async updateChatSession(userId: string, id: string, u: Partial<ChatSession>) { await this.performCRUD('chat_sessions', userId, 'update', u, id); }
  
  async renameChatSession(userId: string, id: string, name: string) {
    await this.updateChatSession(userId, id, { name });
  }

  async deleteChatSession(userId: string, id: string) { await this.performCRUD('chat_sessions', userId, 'delete', {}, id); }

  async addPitch(userId: string, p: Omit<Pitch, 'id' | 'dateCreated'>) { const id = crypto.randomUUID(); await this.performCRUD('pitches', userId, 'insert', { id, dateCreated: new Date().toISOString(), ...p }); return { id, ...p } as Pitch; }
  async deletePitch(userId: string, id: string) { await this.performCRUD('pitches', userId, 'delete', {}, id); }

  async addReportToHistory(userId: string, r: CompanyReport) { const id = crypto.randomUUID(); const entry = { id, title: r.meta.companyName, reportData: r, created_at: new Date().toISOString() }; await this.saveLocal('company_reports', userId, entry); return entry; }
  async deleteReport(userId: string, id: string) { await this.removeFromLocal('company_reports', userId, id); }

  async saveSettings(userId: string, s: UserSettings) { await this.saveLocal('settings', userId, s); }
  
  async addBrandDNA(userId: string, d: BrandDNA) { await this.saveLocal('brand_dnas', userId, d); }
  async addMarketingCampaign(userId: string, c: MarketingCampaign) { await this.saveLocal('marketing_campaigns', userId, c); }

  async updateProfile(userId: string, updates: Partial<User>) {
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(async (s) => 
        supabase.auth.updateUser({ data: { first_name: updates.firstName, last_name: updates.lastName, company: updates.company, bio: updates.bio, company_report: updates.companyReport } }).abortSignal(s)
      );
      if (error) throw error;
    }
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      const user = JSON.parse(local);
      if (user.id === userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, ...updates }));
    }
  }

  async completeOnboarding(userId: string, data: any) { await this.updateProfile(userId, { company: data.company, onboardingCompleted: true } as any); return (await this.getCurrentUser()) as User; }

  async exportUserData(userId: string) { const data = await this.getUserData(userId); return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); }

  async deleteAccount(userId: string) {
    const tables = ['leads', 'ideas', 'pitches', 'chat_messages', 'chat_sessions', 'notifications', 'settings', 'brand_dnas', 'company_reports'];
    for (const t of tables) await this.storage.delete(`ace_${userId}_${t}`);
    localStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  }

  async submitContactRequest(r: ContactRequest) {
    const key = 'aceverse_contact_requests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([{ id: crypto.randomUUID(), ...r, created_at: new Date().toISOString() }, ...existing]));
  }

  async createDemoUser(): Promise<User> {
    const u: User = { id: 'local-demo', email: 'demo@aceverse.se', firstName: 'Demo', lastName: 'Användare', company: 'Demo UF', createdAt: new Date().toISOString(), onboardingCompleted: true, plan: 'pro' };
    this.setSession(u);
    return u;
  }

  private mapUser(sb: any): User {
    if (!sb || !sb.id) throw new AceverseDatabaseError("Invalid user", DBErrorCode.AUTH_EXPIRED);
    const m = sb.user_metadata || {};
    return { id: sb.id, email: sb.email || '', firstName: m.first_name || 'Användare', lastName: m.last_name || '', company: m.company || '', bio: m.bio || '', createdAt: sb.created_at || new Date().toISOString(), onboardingCompleted: m.onboarding_completed ?? false, plan: (['free', 'pro', 'enterprise'].includes(m.plan) ? m.plan : 'free') as any, companyReport: m.company_report };
  }
}

export const db = new DatabaseService();
