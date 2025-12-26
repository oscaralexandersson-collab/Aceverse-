
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
        this.openingPromise = null;
        resolve(this.db);
      };

      request.onerror = () => { this.openingPromise = null; reject(request.error); };
    });

    return this.openingPromise;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userdata', 'readwrite');
      const store = tx.objectStore('userdata');
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userdata', 'readonly');
      const store = tx.objectStore('userdata');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userdata', 'readwrite');
      const store = tx.objectStore('userdata');
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

class DatabaseService {
  private storage = new IndexedDBEngine();
  private crypt = new CryptoService();
  private userDataCache: Map<string, { data: UserData, expiry: number }> = new Map();
  private CACHE_TTL = 3000;

  private generateDeterministicId(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `local-${Math.abs(hash)}`;
  }

  private invalidateCache(userId: string) {
    this.userDataCache.delete(userId);
  }

  private async performCRUD(table: string, userId: string, op: 'insert' | 'update' | 'delete', item: any, id?: string) {
    const tid = id || item.id;
    const isLocalAccount = userId.startsWith('local-');
    
    // 1. Omedelbar uppdatering av lokal IndexedDB (Persistens)
    const currentLocal = await this.getLocal(table, userId);
    let updatedLocal: any[];

    if (op === 'insert') {
      const exists = currentLocal.findIndex(i => i.id === tid);
      if (exists >= 0) currentLocal[exists] = { ...currentLocal[exists], ...item, pending: !isLocalAccount };
      else currentLocal.unshift({ ...item, pending: !isLocalAccount });
      updatedLocal = currentLocal;
    } else if (op === 'update') {
      updatedLocal = currentLocal.map(i => i.id === tid ? { ...i, ...item } : i);
    } else {
      updatedLocal = currentLocal.filter(i => i.id !== tid);
    }

    const cipher = await this.crypt.encrypt(updatedLocal, userId);
    await this.storage.set(`ace_${userId}_${table}`, cipher);
    
    // 2. Rensa minnescachen för att tvinga fram omladdning i UI
    this.invalidateCache(userId);

    // 3. Bakgrundssynk till Supabase (endast för molnkonton)
    if (!isLocalAccount) {
      try {
        const q = supabase.from(table);
        let res;
        if (op === 'insert') res = await q.insert({ ...item, user_id: userId });
        else if (op === 'update') res = await q.update(item).eq('id', tid).eq('user_id', userId);
        else res = await q.delete().eq('id', tid).eq('user_id', userId);

        if (!res.error && op === 'insert') {
          await this.updateLocal(table, userId, tid, { pending: false });
        }
      } catch (e) {
        console.warn("Background sync failed, data is safe locally.");
      }
    }
  }

  private async getLocal(table: string, userId: string): Promise<any[]> {
    const cipher = await this.storage.get(`ace_${userId}_${table}`);
    if (!cipher) return [];
    const decrypted = await this.crypt.decrypt(cipher, userId);
    return Array.isArray(decrypted) ? decrypted : [];
  }

  private async updateLocal(table: string, userId: string, id: string, updates: any) {
    const current = await this.getLocal(table, userId);
    const idx = current.findIndex(i => i.id === id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updates };
      const cipher = await this.crypt.encrypt(current, userId);
      await this.storage.set(`ace_${userId}_${table}`, cipher);
    }
  }

  // --- Public API ---

  async signup(email: string, pass: string, fn: string, ln: string): Promise<User> {
    const validEmail = email.trim().toLowerCase();
    if (validEmail.endsWith('@local.dev') || ['test@aceverse.se', 'demo@aceverse.se'].includes(validEmail)) {
      const stableId = this.generateDeterministicId(validEmail);
      const user: User = { id: stableId, email: validEmail, firstName: fn, lastName: ln, createdAt: new Date().toISOString(), onboardingCompleted: true, plan: 'pro' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    const { data, error } = await supabase.auth.signUp({ email: validEmail, password: pass, options: { data: { first_name: fn, last_name: ln, onboarding_completed: false, plan: 'free' } } });
    if (error) throw error;
    const u = { id: data.user!.id, email: validEmail, firstName: fn, lastName: ln, createdAt: new Date().toISOString(), onboardingCompleted: false, plan: 'free' } as User;
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    return u;
  }

  async login(email: string, pass: string, rememberMe = true): Promise<User> {
    const validEmail = email.trim().toLowerCase();
    if (['demo@aceverse.se', 'test@aceverse.se'].includes(validEmail)) {
      const stableId = this.generateDeterministicId(validEmail);
      const u: User = { id: stableId, email: validEmail, firstName: validEmail.includes('demo') ? 'Demo' : 'Test', lastName: 'Användare', company: 'Mitt UF-företag', createdAt: new Date().toISOString(), onboardingCompleted: true, plan: 'pro' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      return u;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: validEmail, password: pass });
    if (error) throw error;
    const m = data.user.user_metadata || {};
    const u = { id: data.user.id, email: data.user.email, firstName: m.first_name, lastName: m.last_name, onboardingCompleted: m.onboarding_completed, plan: m.plan || 'free', company: m.company } as User;
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    return u;
  }

  /**
   * Fix for Login.tsx error line 83: Added loginWithOAuth method.
   */
  async loginWithOAuth(provider: 'google' | 'apple') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }

  /**
   * Fix for Login.tsx error line 95: Added createDemoUser method.
   */
  async createDemoUser(): Promise<User> {
    const email = `demo-${Date.now()}@aceverse.se`;
    const stableId = this.generateDeterministicId(email);
    const u: User = { 
        id: stableId, 
        email, 
        firstName: 'Demo', 
        lastName: 'Användare', 
        company: 'Mitt UF-företag', 
        createdAt: new Date().toISOString(), 
        onboardingCompleted: true, 
        plan: 'pro' 
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    return u;
  }

  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    this.userDataCache.clear();
  }

  async getCurrentUser(): Promise<User | null> {
    const local = localStorage.getItem(SESSION_KEY);
    if (!local) return null;
    return JSON.parse(local);
  }

  async getUserData(userId: string): Promise<UserData> {
    const cached = this.userDataCache.get(userId);
    if (cached && Date.now() < cached.expiry) return cached.data;

    const isLocal = userId.startsWith('local-');
    let remoteResults: any[] = [null, null, null, null, null, null, null, null];

    if (!isLocal) {
      try {
        const ops = [
          supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }),
          supabase.from('brand_dnas').select('*').eq('user_id', userId),
          supabase.from('marketing_campaigns').select('*').eq('user_id', userId),
          supabase.from('company_reports').select('*').eq('user_id', userId)
        ];
        const res = await Promise.all(ops);
        remoteResults = res.map(r => r.data);
      } catch (e) { console.warn("Cloud fetch failed, using local only."); }
    }

    const loadTable = async (table: string, remote: any[] | null) => {
      const local = await this.getLocal(table, userId);
      if (isLocal || !remote) return local;
      const remoteIds = new Set(remote.map(i => i.id));
      const pending = local.filter(i => i.pending === true && !remoteIds.has(i.id));
      const merged = [...pending, ...remote];
      await this.storage.set(`ace_${userId}_${table}`, await this.crypt.encrypt(merged, userId));
      return merged;
    };

    /**
     * Fix for persistent settings: Load settings from IndexedDB instead of using defaults only.
     */
    const settingsCipher = await this.storage.get(`ace_${userId}_settings`);
    let settings = { notifications: { email: true, push: true, marketing: false }, privacy: { publicProfile: false, dataSharing: false } };
    if (settingsCipher) {
      const decrypted = await this.crypt.decrypt(settingsCipher, userId);
      if (decrypted) settings = decrypted;
    }

    const data: UserData = {
      leads: await loadTable('leads', remoteResults[0]),
      ideas: await loadTable('ideas', remoteResults[1]),
      pitches: await loadTable('pitches', remoteResults[2]),
      chatHistory: await loadTable('chat_messages', remoteResults[3]),
      sessions: await loadTable('chat_sessions', remoteResults[4]),
      brandDNAs: await loadTable('brand_dnas', remoteResults[5]),
      marketingCampaigns: await loadTable('marketing_campaigns', remoteResults[6]),
      reports: await loadTable('company_reports', remoteResults[7]),
      coaches: [],
      notifications: [],
      settings
    };

    this.userDataCache.set(userId, { data, expiry: Date.now() + this.CACHE_TTL });
    return data;
  }

  // Entities
  async addLead(uId: string, l: any) { const id = crypto.randomUUID(); await this.performCRUD('leads', uId, 'insert', { id, ...l, dateAdded: new Date().toISOString() }); return { id, ...l }; }
  async updateLead(uId: string, id: string, u: any) { await this.performCRUD('leads', uId, 'update', u, id); }
  async deleteLead(uId: string, id: string) { await this.performCRUD('leads', uId, 'delete', {}, id); }

  async addIdea(uId: string, i: any) { const id = crypto.randomUUID(); const item = { id, ...i, dateCreated: new Date().toISOString() }; await this.performCRUD('ideas', uId, 'insert', item); return item; }
  async updateIdeaState(uId: string, id: string, u: any) { await this.performCRUD('ideas', uId, 'update', u, id); }
  async deleteIdea(uId: string, id: string) { await this.performCRUD('ideas', uId, 'delete', {}, id); }

  async addPitch(uId: string, p: any) { const id = crypto.randomUUID(); const item = { id, ...p, dateCreated: new Date().toISOString() }; await this.performCRUD('pitches', uId, 'insert', item); return item; }
  async deletePitch(uId: string, id: string) { await this.performCRUD('pitches', uId, 'delete', {}, id); }

  async createChatSession(uId: string, name: string) { const id = crypto.randomUUID(); const item = { id, name, lastMessageAt: Date.now() }; await this.performCRUD('chat_sessions', uId, 'insert', item); return item; }
  async updateChatSession(uId: string, id: string, u: any) { await this.performCRUD('chat_sessions', uId, 'update', u, id); }
  async deleteChatSession(uId: string, id: string) { await this.performCRUD('chat_sessions', uId, 'delete', {}, id); }
  async renameChatSession(uId: string, id: string, name: string) { await this.updateChatSession(uId, id, { name }); }
  
  async addMessage(uId: string, m: any) { 
    const id = crypto.randomUUID(); 
    const item = { id, ...m, timestamp: Date.now() }; 
    await this.performCRUD('chat_messages', uId, 'insert', item); 
    return item; 
  }

  async ensureSystemSession(uId: string): Promise<ChatSession> {
    const data = await this.getUserData(uId);
    const existing = data.sessions.find(s => s.group === 'System');
    if (existing) return existing;
    const id = crypto.randomUUID();
    const item = { id, name: 'UF-läraren', group: 'System', lastMessageAt: Date.now() };
    await this.performCRUD('chat_sessions', uId, 'insert', item);
    return item;
  }

  async addBrandDNA(uId: string, d: any) { await this.performCRUD('brand_dnas', uId, 'insert', d); }
  async deleteBrandDNA(uId: string, id: string) { await this.performCRUD('brand_dnas', uId, 'delete', {}, id); }
  async addMarketingCampaign(uId: string, c: any) { await this.performCRUD('marketing_campaigns', uId, 'insert', c); }
  async deleteMarketingCampaign(uId: string, id: string) { await this.performCRUD('marketing_campaigns', uId, 'delete', {}, id); }
  async addReportToHistory(uId: string, r: any) { const id = crypto.randomUUID(); const item = { id, title: r.meta.companyName, reportData: r, created_at: new Date().toISOString() }; await this.performCRUD('company_reports', uId, 'insert', item); return item; }
  async deleteReport(uId: string, id: string) { await this.performCRUD('company_reports', uId, 'delete', {}, id); }

  /**
   * Fix for Settings.tsx error line 37: Added saveSettings method.
   */
  async saveSettings(userId: string, settings: UserSettings) {
    const cipher = await this.crypt.encrypt(settings, userId);
    await this.storage.set(`ace_${userId}_settings`, cipher);
    this.invalidateCache(userId);
  }

  /**
   * Fix for Settings.tsx error line 400: Added exportUserData method.
   */
  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.getUserData(userId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    return blob;
  }

  /**
   * Fix for Contact.tsx error line 27: Added submitContactRequest method.
   */
  async submitContactRequest(data: ContactRequest) {
    try {
        await supabase.from('contact_requests').insert([data]);
    } catch (e) {
        console.warn("Could not save contact request to DB", e);
    }
  }

  async updateProfile(userId: string, updates: Partial<User>) {
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      const user = JSON.parse(local);
      if (user.id === userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, ...updates }));
    }
    if (!userId.startsWith('local-')) {
      await supabase.auth.updateUser({ data: { first_name: updates.firstName, last_name: updates.lastName, company: updates.company, bio: updates.bio, company_report: updates.companyReport } });
    }
    this.invalidateCache(userId);
  }

  async completeOnboarding(userId: string, data: any) { 
    await this.updateProfile(userId, { company: data.company, onboardingCompleted: true } as any); 
    return (await this.getCurrentUser()) as User; 
  }

  async deleteAccount(userId: string) {
    const tables = ['leads', 'ideas', 'pitches', 'chat_messages', 'chat_sessions', 'brand_dnas', 'company_reports', 'marketing_campaigns'];
    for (const t of tables) await this.storage.delete(`ace_${userId}_${t}`);
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  }

  async search(userId: string, q: string): Promise<SearchResult[]> {
    const query = q.toLowerCase();
    const data = await this.getUserData(userId);
    const res: SearchResult[] = [];
    data.leads.forEach(l => { if (l.name.toLowerCase().includes(query) || l.company.toLowerCase().includes(query)) res.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company, view: 'crm' }); });
    data.ideas.forEach(i => { if (i.title.toLowerCase().includes(query)) res.push({ id: i.id, type: 'idea', title: i.title, subtitle: 'Idé', view: 'ideas' }); });
    data.pitches.forEach(p => { if (p.name.toLowerCase().includes(query)) res.push({ id: p.id, type: 'pitch', title: p.name, subtitle: 'Pitch', view: 'pitch' }); });
    return res;
  }
}

export const db = new DatabaseService();
