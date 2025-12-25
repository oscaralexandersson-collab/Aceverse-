
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  SearchResult, ContactRequest, Notification, UserSettings, 
  BrandDNA, MarketingCampaign, CompanyReport, CompanyReportEntry 
} from '../types';
import { PostgrestResponse, PostgrestSingleResponse, PostgrestBuilder } from '@supabase/supabase-js';

const SESSION_KEY = 'aceverse_session_user';
const LOCAL_USERS_KEY = 'aceverse_local_users_db';
const TOMBSTONE_KEY = (userId: string) => `aceverse_${userId}_tombstones`;
const GET_LOCAL_KEY = (table: string, userId: string) => `aceverse_${userId}_${table}`;

/**
 * Custom Error for structured error propagation
 */
export class AceverseDatabaseError extends Error {
  constructor(public message: string, public originalError?: any, public code?: string) {
    super(message);
    this.name = 'AceverseDatabaseError';
  }
}

/**
 * Simple Mutex to ensure atomic localStorage writes
 */
class StorageMutex {
  private queue: Promise<void> = Promise.resolve();

  async run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.then(() => {}, () => {});
    return result;
  }
}

class DatabaseService {
  private mutex = new StorageMutex();
  private maxRetries = 2;
  private backoffMs = 500;
  private storageQuotaLimit = 4.5 * 1024 * 1024; // ~4.5MB threshold

  /**
   * Enhanced Supabase wrapper with AbortController, retries, and strict types.
   */
  private async safeSupabaseCall<T>(
    operation: (signal: AbortSignal) => Promise<PostgrestResponse<T> | PostgrestSingleResponse<T>>,
    retries = this.maxRetries
  ): Promise<{ data: T | T[] | null; error: any }> {
    let lastError: any;

    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await operation(controller.signal);
        clearTimeout(timeoutId);
        
        if (response.error) {
          lastError = response.error;
          // Don't retry on user errors (4xx) except rate limits (429)
          const status = (response.error as any).status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            break;
          }
        } else {
          return { data: response.data, error: null };
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        lastError = e;
        if (e.name === 'AbortError') {
          console.warn("Supabase request timed out and was aborted.");
        }
      }

      if (i < retries) {
        const delay = this.backoffMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { data: null, error: lastError };
  }

  /**
   * Storage Management & Quota Enforcement
   */
  private async checkQuota() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('aceverse_')) {
        totalSize += (localStorage.getItem(key) || '').length * 2; // Rough estimate in bytes (UTF-16)
      }
    }

    if (totalSize > this.storageQuotaLimit) {
      console.warn("LocalStorage quota near limit, performing emergency cleanup...");
      this.emergencyCleanup();
    }
  }

  private emergencyCleanup() {
    // Remove oldest data first (based on table types we can afford to lose)
    const tablesToPrune = ['chat_messages', 'notifications', 'company_reports'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && tablesToPrune.some(t => key.includes(`_${t}`))) {
        localStorage.removeItem(key);
      }
    }
  }

  private getTombstones(userId: string): Map<string, number> {
    try {
      const stored = localStorage.getItem(TOMBSTONE_KEY(userId));
      const arr: [string, number][] = stored ? JSON.parse(stored) : [];
      return new Map(arr);
    } catch (e) {
      return new Map();
    }
  }

  private async addTombstone(userId: string, id: string) {
    return this.mutex.run(async () => {
      const stones = this.getTombstones(userId);
      stones.set(id, Date.now());
      localStorage.setItem(TOMBSTONE_KEY(userId), JSON.stringify(Array.from(stones.entries())));
      this.pruneTombstones(userId);
    });
  }

  private pruneTombstones(userId: string) {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const stones = this.getTombstones(userId);
    let changed = false;

    for (const [id, timestamp] of stones.entries()) {
      if (now - timestamp > THIRTY_DAYS_MS) {
        stones.delete(id);
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(TOMBSTONE_KEY(userId), JSON.stringify(Array.from(stones.entries())));
    }
  }

  /**
   * Auth Logic
   */
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail.endsWith('@local.dev') || cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se') {
      const localUser: User = {
        id: cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se' ? 'local-demo' : 'local-' + Date.now(),
        email: cleanEmail,
        firstName,
        lastName,
        company: 'Local Startup',
        createdAt: new Date().toISOString(),
        onboardingCompleted: cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se',
        plan: 'pro'
      };
      
      const isExisting = await this.mutex.run(async () => {
        const usersRaw = localStorage.getItem(LOCAL_USERS_KEY);
        const users = usersRaw ? JSON.parse(usersRaw) : [];
        return Array.isArray(users) && users.some((u: any) => u.email === cleanEmail);
      });

      if (isExisting && !(cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se')) {
        throw new AceverseDatabaseError('Användaren finns redan (Lokalt). Logga in istället.');
      }

      await this.mutex.run(async () => {
        const usersRaw = localStorage.getItem(LOCAL_USERS_KEY);
        const users = usersRaw ? JSON.parse(usersRaw) : [];
        users.push({ ...localUser, isTestFixture: true });
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      });

      this.setSession(localUser, true);
      return localUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          company: 'My Startup',
          onboarding_completed: false,
          plan: 'free'
        }
      }
    });

    if (error) throw new AceverseDatabaseError(error.message, error);
    if (data.user) {
      const user = this.mapUser(data.user);
      this.setSession(user, true);
      return user;
    }
    throw new AceverseDatabaseError('Registrering misslyckades.');
  }

  async login(email: string, password: string, rememberMe: boolean = true): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === 'demo@aceverse.se' || cleanEmail === 'test@aceverse.se') {
      return this.createDemoUser();
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) throw new AceverseDatabaseError(error.message, error);
    if (data.user) {
      const user = this.mapUser(data.user);
      this.setSession(user, rememberMe);
      return user;
    }
    throw new AceverseDatabaseError('Inloggning misslyckades.');
  }

  async loginWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { 
        redirectTo: window.location.origin, 
        queryParams: { access_type: 'offline', prompt: 'consent' } 
      },
    });
    if (error) throw new AceverseDatabaseError(error.message, error);
  }

  private setSession(user: User, persistent: boolean) {
    try {
      const data = JSON.stringify(user);
      if (persistent) {
        localStorage.setItem(SESSION_KEY, data);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, data);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.warn("Failed to set session", e);
    }
  }

  async createDemoUser(): Promise<User> {
    const mockUser: User = { 
      id: 'local-demo', 
      email: 'demo@aceverse.se', 
      firstName: 'Demo', 
      lastName: 'User', 
      company: 'Demo Corp', 
      createdAt: new Date().toISOString(), 
      onboardingCompleted: true, 
      plan: 'pro' 
    };
    this.setSession(mockUser, true);
    return mockUser;
  }

  async logout() {
    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) {
      try {
        const user = JSON.parse(local);
        localStorage.removeItem(TOMBSTONE_KEY(user.id));
      } catch(e) {}
    }
    try { 
      await supabase.auth.signOut(); 
    } catch (e) {} finally {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const user = this.mapUser(data.session.user);
        this.setSession(user, true); 
        return user;
      }
    } catch (error) {}
    
    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) { 
      try { return JSON.parse(local); } 
      catch (e) { localStorage.removeItem(SESSION_KEY); } 
    }
    return null;
  }

  /**
   * Centralized CRUD Helper (DRY)
   * Handles local storage updates and cloud synchronization with unified error reporting.
   */
  private async performCRUD<T extends { id: string }>(
    table: string, 
    userId: string, 
    operation: 'insert' | 'update' | 'delete', 
    itemOrUpdates: any, 
    id?: string
  ): Promise<void> {
    const isLocal = userId.startsWith('local-');
    const targetId = id || itemOrUpdates.id;

    // 1. Update Local State (Optimistic)
    if (operation === 'insert') await this.saveLocal(table, userId, { ...itemOrUpdates, pending: !isLocal });
    else if (operation === 'update') await this.updateLocal(table, userId, targetId, itemOrUpdates);
    else if (operation === 'delete') await this.removeFromLocal(table, userId, targetId);

    // 2. Sync to Cloud if not in local demo mode
    if (!isLocal) {
      const { error } = await this.safeSupabaseCall(async (signal) => {
        let query: any = supabase.from(table);
        if (operation === 'insert') return query.insert({ ...itemOrUpdates, user_id: userId }).abortSignal(signal);
        if (operation === 'update') return query.update(itemOrUpdates).eq('id', targetId).eq('user_id', userId).abortSignal(signal);
        if (operation === 'delete') return query.delete().eq('id', targetId).eq('user_id', userId).abortSignal(signal);
        return { data: null, error: { message: 'Invalid OP' } } as any;
      });

      if (error) {
        // If it was an insert/update, we keep it as "pending" locally to retry later (logic for sync manager could be added)
        throw new AceverseDatabaseError(`Kunde inte synkronisera ${table} till molnet.`, error);
      } else if (operation === 'insert') {
        // Mark as no longer pending
        await this.updateLocal(table, userId, targetId, { pending: false });
      }
    }
  }

  /**
   * Profile & Onboarding
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(async (signal) => 
        supabase.auth.updateUser({ 
          data: { 
            first_name: updates.firstName, 
            last_name: updates.lastName, 
            company: updates.company, 
            bio: updates.bio, 
            plan: updates.plan, 
            company_report: updates.companyReport 
          } 
        }, { abortSignal: signal } as any)
      );
      if (error) throw new AceverseDatabaseError(error.message, error);
    }
    
    await this.mutex.run(async () => {
      const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (local) {
        const user = JSON.parse(local);
        if (user.id === userId) {
          const updatedUser = { ...user, ...updates };
          const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
          storage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        }
      }
    });
  }

  async completeOnboarding(userId: string, companyData: any): Promise<User> {
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(async (signal) => 
        supabase.auth.updateUser({ 
          data: { 
            company: companyData.company, 
            industry: companyData.industry, 
            business_stage: companyData.stage, 
            description: companyData.description, 
            onboarding_completed: true 
          } 
        }, { abortSignal: signal } as any)
      );
      if (error) throw new AceverseDatabaseError(error.message, error);
    }

    await this.mutex.run(async () => {
      const localRaw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (localRaw) {
        const user = JSON.parse(localRaw);
        const updatedUser = { ...user, company: companyData.company, onboardingCompleted: true };
        this.setSession(updatedUser, true);
      }
    });

    return (await this.getCurrentUser()) as User;
  }

  /**
   * Bulk Data Retrieval
   */
  async getUserData(userId: string): Promise<UserData> {
    const isLocal = userId.startsWith('local-');
    const tombstones = this.getTombstones(userId);
    let remoteResults: any[] = [];

    if (!isLocal) {
      const ops = [
        this.safeSupabaseCall<Lead>((signal) => supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(signal)),
        this.safeSupabaseCall<Idea>((signal) => supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(signal)),
        this.safeSupabaseCall<Pitch>((signal) => supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(signal)),
        this.safeSupabaseCall<ChatMessage>((signal) => supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).abortSignal(signal)),
        this.safeSupabaseCall<ChatSession>((signal) => supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }).abortSignal(signal))
      ];
      const results = await Promise.allSettled(ops);
      remoteResults = results.map(res => res.status === 'fulfilled' ? res.value.data : null);
    }

    const getL = (table: string) => {
      try {
        const val = localStorage.getItem(GET_LOCAL_KEY(table, userId));
        if (!val) return [];
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch(e) { return []; }
    };
    
    const merge = <T extends { id: string }>(table: string, remote: T[] | null | undefined, local: T[]) => {
      const localSafe = Array.isArray(local) ? local : [];
      const base = localSafe.filter(i => i && !tombstones.has(i.id));
      if (isLocal || !Array.isArray(remote)) return base;

      const remoteIds = new Set(remote.map(i => i.id));
      const pending = base.filter(i => (i as any).pending === true && !remoteIds.has(i.id));
      const sanitizedRemote = remote.filter(i => i && !tombstones.has(i.id));
      
      const finalData = [...pending, ...sanitizedRemote];
      localStorage.setItem(GET_LOCAL_KEY(table, userId), JSON.stringify(finalData));
      return finalData;
    };

    return { 
      leads: merge('leads', remoteResults[0]?.map((d: any) => ({ ...d, value: Number(d.value) || 0 })), getL('leads')),
      ideas: merge('ideas', remoteResults[1], getL('ideas')),
      pitches: merge('pitches', remoteResults[2]?.map((d: any) => ({ ...d, dateCreated: d.created_at, chatSessionId: d.chat_session_id, contextScore: d.context_score })), getL('pitches')),
      chatHistory: merge('chat_messages', remoteResults[3]?.map((d: any) => ({ ...d, sessionId: d.session_id, timestamp: new Date(d.created_at).getTime() })), getL('chat_messages')),
      coaches: getL('coaches'),
      sessions: merge('chat_sessions', remoteResults[4]?.map((d: any) => ({ id: d.id, name: d.name, lastMessageAt: d.last_message_at ? new Date(d.last_message_at).getTime() : Date.now(), preview: d.preview, group: d.group_name })), getL('chat_sessions')),
      notifications: getL('notifications'),
      invoices: getL('invoices'),
      settings: JSON.parse(localStorage.getItem(GET_LOCAL_KEY('settings', userId)) || 'null') || { notifications: { email: true, push: true, marketing: false }, privacy: { publicProfile: false, dataSharing: false } },
      marketingCampaigns: getL('marketing_campaigns'),
      brandDNAs: getL('brand_dnas'),
      reports: getL('company_reports')
    };
  }

  async search(userId: string, query: string): Promise<SearchResult[]> {
    const data = await this.getUserData(userId);
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    (data.leads || []).forEach(l => {
      if (l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)) {
        results.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company, view: 'crm' });
      }
    });

    (data.ideas || []).forEach(i => {
      if (i.title.toLowerCase().includes(q) || (i.snapshot?.problem_statement || '').toLowerCase().includes(q)) {
        results.push({ id: i.id, type: 'idea', title: i.title, subtitle: (i.snapshot?.problem_statement || '').substring(0, 40) + '...', view: 'ideas' });
      }
    });

    return results;
  }

  /**
   * Entity Methods (Refactored to use performCRUD)
   */
  async addLead(userId: string, leadData: Omit<Lead, 'id' | 'dateAdded'>): Promise<Lead> {
    const lead: Lead = { id: this.generateId(), dateAdded: new Date().toISOString(), ...leadData };
    await this.performCRUD('leads', userId, 'insert', {
      id: lead.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      linkedin: lead.linkedin,
      website: lead.website,
      notes: lead.notes,
      status: lead.status,
      value: lead.value,
      created_at: lead.dateAdded
    });
    return lead;
  }

  async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<void> {
    await this.performCRUD('leads', userId, 'update', updates, leadId);
  }

  async deleteLead(userId: string, leadId: string): Promise<void> {
    await this.addTombstone(userId, leadId);
    await this.performCRUD('leads', userId, 'delete', {}, leadId);
  }

  async addIdea(userId: string, ideaData: Omit<Idea, 'id' | 'dateCreated' | 'score'>): Promise<Idea> {
    const idea: Idea = { id: this.generateId(), dateCreated: new Date().toISOString(), score: 0, ...ideaData as any };
    await this.performCRUD('ideas', userId, 'insert', {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      current_phase: idea.currentPhase,
      snapshot: idea.snapshot,
      nodes: idea.nodes,
      edges: idea.edges,
      cards: idea.cards,
      tasks: idea.tasks,
      evidence: idea.evidence,
      created_at: idea.dateCreated
    });
    return idea;
  }

  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>): Promise<void> {
    const mapped: any = {};
    if (updates.title) mapped.title = updates.title;
    if (updates.currentPhase) mapped.current_phase = updates.currentPhase;
    if (updates.snapshot) mapped.snapshot = updates.snapshot;
    if (updates.nodes) mapped.nodes = updates.nodes;
    if (updates.tasks) mapped.tasks = updates.tasks;
    await this.performCRUD('ideas', userId, 'update', mapped, ideaId);
  }

  async deleteIdea(userId: string, ideaId: string): Promise<void> {
    await this.addTombstone(userId, ideaId);
    await this.performCRUD('ideas', userId, 'delete', {}, ideaId);
  }

  async addPitch(userId: string, pitchData: Omit<Pitch, 'id' | 'dateCreated'>): Promise<Pitch> {
    const pitch: Pitch = { id: this.generateId(), dateCreated: new Date().toISOString(), ...pitchData as any };
    await this.performCRUD('pitches', userId, 'insert', {
      id: pitch.id,
      type: pitch.type,
      name: pitch.name,
      content: pitch.content,
      chat_session_id: pitch.chatSessionId,
      context_score: pitch.contextScore,
      created_at: pitch.dateCreated
    });
    return pitch;
  }

  async deletePitch(userId: string, pitchId: string): Promise<void> {
    await this.addTombstone(userId, pitchId);
    await this.performCRUD('pitches', userId, 'delete', {}, pitchId);
  }

  async addMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const msg: ChatMessage = { id: this.generateId(), timestamp: Date.now(), ...message as any };
    await this.performCRUD('chat_messages', userId, 'insert', {
      id: msg.id,
      session_id: msg.sessionId,
      role: msg.role,
      text: msg.text,
      created_at: new Date(msg.timestamp).toISOString()
    });
    return msg;
  }

  async createChatSession(userId: string, name: string): Promise<ChatSession> {
    const session: ChatSession = { id: this.generateId(), name, lastMessageAt: Date.now(), preview: 'Starta konversationen...' } as any;
    await this.performCRUD('chat_sessions', userId, 'insert', {
      id: session.id,
      name: session.name,
      last_message_at: new Date(session.lastMessageAt).toISOString(),
      preview: session.preview
    });
    return session;
  }

  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    await this.addTombstone(userId, sessionId);
    await this.mutex.run(async () => {
      const msgKey = GET_LOCAL_KEY('chat_messages', userId);
      const filtered = (JSON.parse(localStorage.getItem(msgKey) || '[]') as any[]).filter(m => m && m.sessionId !== sessionId);
      localStorage.setItem(msgKey, JSON.stringify(filtered));
    });
    await this.performCRUD('chat_sessions', userId, 'delete', {}, sessionId);
  }

  async renameChatSession(userId: string, sessionId: string, name: string): Promise<void> {
    await this.performCRUD('chat_sessions', userId, 'update', { name }, sessionId);
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    let session = (data.sessions || []).find(s => s.name === 'UF-läraren');
    if (!session) return await this.createChatSession(userId, 'UF-läraren');
    return session;
  }

  async updateChatSession(userId: string, sessionId: string, updates: any) {
    const mapped: any = {};
    if (updates.name) mapped.name = updates.name;
    if (updates.lastMessageAt) mapped.last_message_at = new Date(updates.lastMessageAt).toISOString();
    if (updates.preview) mapped.preview = updates.preview;
    await this.performCRUD('chat_sessions', userId, 'update', mapped, sessionId);
  }

  async addReportToHistory(userId: string, report: CompanyReport): Promise<CompanyReportEntry> {
    const entry: CompanyReportEntry = { id: this.generateId(), title: report.meta.companyName, reportData: report, created_at: new Date().toISOString() };
    await this.saveLocal('company_reports', userId, entry);
    return entry;
  }

  async deleteReport(userId: string, reportId: string): Promise<void> {
    await this.addTombstone(userId, reportId);
    await this.removeFromLocal('company_reports', userId, reportId);
  }

  async addBrandDNA(userId: string, dna: BrandDNA): Promise<void> {
    await this.saveLocal('brand_dnas', userId, dna);
  }

  async addMarketingCampaign(userId: string, campaign: MarketingCampaign): Promise<void> {
    await this.saveLocal('marketing_campaigns', userId, campaign);
  }

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    await this.mutex.run(async () => {
      localStorage.setItem(GET_LOCAL_KEY('settings', userId), JSON.stringify(settings));
    });
  }

  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.getUserData(userId);
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  async deleteAccount(userId: string): Promise<void> {
    const tables = ['leads', 'ideas', 'pitches', 'chat_messages', 'chat_sessions', 'notifications', 'invoices', 'settings', 'marketing_campaigns', 'brand_dnas', 'company_reports'];
    await this.mutex.run(async () => {
      tables.forEach(t => localStorage.removeItem(GET_LOCAL_KEY(t, userId)));
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOMBSTONE_KEY(userId));
    });
    await this.logout();
  }

  async submitContactRequest(request: ContactRequest): Promise<void> {
    const req = { ...request, id: this.generateId(), created_at: new Date().toISOString() };
    await this.mutex.run(async () => {
      const key = 'aceverse_contact_requests';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([req, ...existing]));
    });
  }

  /**
   * Internal Atomic Helpers with Quota Check
   */
  private async saveLocal(table: string, userId: string, item: any) {
    await this.checkQuota();
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      if (item.id) {
        const idx = current.findIndex((i: any) => i && i.id === item.id);
        if (idx >= 0) { current[idx] = item; localStorage.setItem(key, JSON.stringify(current)); return; }
      }
      localStorage.setItem(key, JSON.stringify([item, ...current]));
    });
  }

  private async updateLocal(table: string, userId: string, id: string, updates: any) {
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = current.findIndex((i: any) => i && i.id === id);
      if (idx >= 0) { current[idx] = { ...current[idx], ...updates }; localStorage.setItem(key, JSON.stringify(current)); }
    });
  }

  private async removeFromLocal(table: string, userId: string, id: string) {
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const filtered = (JSON.parse(localStorage.getItem(key) || '[]') as any[]).filter(i => i && i.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    });
  }

  private generateId() { 
    return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  }

  /**
   * Robust mapping and validation of Supabase User Metadata
   */
  private mapUser(supabaseUser: any): User {
    if (!supabaseUser || !supabaseUser.id) {
      throw new AceverseDatabaseError("Invalid user data received from auth server.");
    }
    const metadata = supabaseUser.user_metadata || {};
    
    // Validate created_at
    const createdAt = supabaseUser.created_at;
    const isValidDate = createdAt && !isNaN(Date.parse(createdAt));
    
    return { 
      id: supabaseUser.id, 
      email: supabaseUser.email || '', 
      firstName: metadata.first_name || 'Användare', 
      lastName: metadata.last_name || '', 
      company: metadata.company || '', 
      bio: metadata.bio || '', 
      createdAt: isValidDate ? createdAt : new Date().toISOString(), 
      onboardingCompleted: metadata.onboarding_completed ?? false, 
      plan: (['free', 'pro', 'enterprise'].includes(metadata.plan) ? metadata.plan : 'free') as any
    };
  }
}

export const db = new DatabaseService();
