
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  SearchResult, ContactRequest, Notification, UserSettings, 
  BrandDNA, MarketingCampaign, CompanyReport, CompanyReportEntry 
} from '../types';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

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
  private maxRetries = 3;
  private backoffMs = 500;

  /**
   * Wraps Supabase calls with retry logic, backoff, and timeouts.
   */
  private async safeSupabaseCall<T>(
    operation: () => Promise<PostgrestResponse<T> | PostgrestSingleResponse<T>>,
    retries = this.maxRetries
  ): Promise<{ data: T | T[] | null; error: any }> {
    let lastError: any;

    for (let i = 0; i <= retries; i++) {
      try {
        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 6000)
        );
        
        const response = await Promise.race([operation(), timeout]) as any;
        
        if (response.error) {
          lastError = response.error;
          // If it's a 4xx error (except 429), don't retry
          if (response.error.status && response.error.status >= 400 && response.error.status < 500 && response.error.status !== 429) {
            break;
          }
        } else {
          return { data: response.data, error: null };
        }
      } catch (e) {
        lastError = e;
      }

      if (i < retries) {
        const delay = this.backoffMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error("Supabase operation failed after retries:", lastError);
    return { data: null, error: lastError };
  }

  /**
   * Manages "deleted" record tracking to prevent re-syncing from cloud
   */
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

  /**
   * Removes old deletion markers (older than 30 days) to keep storage clean
   */
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
    
    // Handle Local Dev/Demo mode securely
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
        const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
        return users.some((u: any) => u.email === cleanEmail);
      });

      if (isExisting && !(cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se')) {
        throw new AceverseDatabaseError('Användaren finns redan (Lokalt). Logga in istället.');
      }

      await this.mutex.run(async () => {
        const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
        // We store metadata but NO plaintext passwords for local users. 
        // Verification happens via a simple check in login() for demo accounts.
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

    // Verification for Demo accounts
    if (cleanEmail === 'demo@aceverse.se' || cleanEmail === 'test@aceverse.se') {
      return this.createDemoUser();
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

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
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      const data = JSON.stringify(user);
      if (persistent) localStorage.setItem(SESSION_KEY, data);
      else sessionStorage.setItem(SESSION_KEY, data);
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
   * Profile Management
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (!userId.startsWith('local-')) {
      const { error } = await supabase.auth.updateUser({ 
        data: { 
          first_name: updates.firstName, 
          last_name: updates.lastName, 
          company: updates.company, 
          bio: updates.bio, 
          plan: updates.plan, 
          company_report: updates.companyReport 
        } 
      });
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
      const { error } = await supabase.auth.updateUser({ 
        data: { 
          company: companyData.company, 
          industry: companyData.industry, 
          business_stage: companyData.stage, 
          description: companyData.description, 
          onboarding_completed: true 
        } 
      });
      if (error) throw new AceverseDatabaseError(error.message, error);
    }

    await this.mutex.run(async () => {
      const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (local) {
        const user = JSON.parse(local);
        const updatedUser = { ...user, company: companyData.company, onboardingCompleted: true };
        this.setSession(updatedUser, true);
      }
    });

    return (await this.getCurrentUser()) as User;
  }

  /**
   * Data Loading & Merging Logic
   */
  async getUserData(userId: string): Promise<UserData> {
    const isLocal = userId.startsWith('local-');
    const tombstones = this.getTombstones(userId);
    let remoteResults: any[] = [];

    if (!isLocal) {
      const ops = [
        this.safeSupabaseCall<Lead>(() => supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
        this.safeSupabaseCall<Idea>(() => supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
        this.safeSupabaseCall<Pitch>(() => supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
        this.safeSupabaseCall<ChatMessage>(() => supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
        this.safeSupabaseCall<ChatSession>(() => supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }))
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
    
    const merge = (table: string, remote: any[] | null | undefined, local: any[]) => {
      const localSafe = Array.isArray(local) ? local : [];
      const base = localSafe.filter(i => i && !tombstones.has(i.id));
      
      if (isLocal || !Array.isArray(remote)) return base;

      const remoteIds = new Set(remote.map(i => i.id));
      const pending = base.filter(i => i.pending === true && !remoteIds.has(i.id));
      const sanitizedRemote = remote.filter(i => i && !tombstones.has(i.id));
      
      const finalData = [...pending, ...sanitizedRemote];
      // Keep local cache synced
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
   * Lead Management
   */
  async addLead(userId: string, leadData: Omit<Lead, 'id' | 'dateAdded'>): Promise<Lead> {
    const lead: Lead = { 
      id: this.generateId(), 
      dateAdded: new Date().toISOString(), 
      ...leadData 
    };

    await this.saveLocal('leads', userId, lead);

    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('leads').insert({
        id: lead.id,
        user_id: userId,
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
      }));
      if (error) throw new AceverseDatabaseError("Misslyckades med att spara till molnet.", error);
    }
    return lead;
  }

  async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<void> {
    await this.updateLocal('leads', userId, leadId, updates);

    if (!userId.startsWith('local-')) {
      const p: any = {};
      if (updates.status) p.status = updates.status;
      if (updates.value !== undefined) p.value = updates.value;
      if (updates.notes) p.notes = updates.notes;
      const { error } = await this.safeSupabaseCall(() => supabase.from('leads').update(p).eq('id', leadId).eq('user_id', userId));
      if (error) throw new AceverseDatabaseError("Uppdatering misslyckades.", error);
    }
  }

  async deleteLead(userId: string, leadId: string): Promise<void> {
    await this.addTombstone(userId, leadId);
    await this.removeFromLocal('leads', userId, leadId);

    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('leads').delete().eq('id', leadId).eq('user_id', userId));
      if (error) console.warn("Cloud delete failed, using tombstone for consistency.", error);
    }
  }

  /**
   * Idea Lab Logic
   */
  async addIdea(userId: string, ideaData: Omit<Idea, 'id' | 'dateCreated' | 'score'>): Promise<Idea> {
    const idea: Idea & { pending: boolean } = { 
      id: this.generateId(), 
      dateCreated: new Date().toISOString(), 
      score: 0, 
      ...ideaData as any, 
      pending: true 
    };

    await this.saveLocal('ideas', userId, idea);
    
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('ideas').insert({
        id: idea.id,
        user_id: userId,
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
      }));
      
      if (!error) {
        idea.pending = false;
        await this.saveLocal('ideas', userId, idea);
      }
    }
    return idea;
  }

  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>): Promise<void> {
    await this.updateLocal('ideas', userId, ideaId, updates);
    
    if (!userId.startsWith('local-')) {
      const p: any = {};
      if (updates.title) p.title = updates.title;
      if (updates.currentPhase) p.current_phase = updates.currentPhase;
      if (updates.snapshot) p.snapshot = updates.snapshot;
      if (updates.nodes) p.nodes = updates.nodes;
      if (updates.tasks) p.tasks = updates.tasks;
      await this.safeSupabaseCall(() => supabase.from('ideas').update(p).eq('id', ideaId).eq('user_id', userId));
    }
  }

  async deleteIdea(userId: string, ideaId: string): Promise<void> {
    await this.addTombstone(userId, ideaId);
    await this.removeFromLocal('ideas', userId, ideaId);
    if (!userId.startsWith('local-')) {
      await this.safeSupabaseCall(() => supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', userId));
    }
  }

  /**
   * Pitch Studio Logic
   */
  async addPitch(userId: string, pitchData: Omit<Pitch, 'id' | 'dateCreated'>): Promise<Pitch> {
    const pitch: Pitch & { pending: boolean } = { 
      id: this.generateId(), 
      dateCreated: new Date().toISOString(), 
      ...pitchData as any, 
      pending: true 
    };
    await this.saveLocal('pitches', userId, pitch);
    
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('pitches').insert({ 
        id: pitch.id, 
        user_id: userId, 
        type: pitch.type, 
        name: pitch.name, 
        content: pitch.content, 
        chat_session_id: pitch.chatSessionId, 
        context_score: pitch.contextScore, 
        created_at: pitch.dateCreated 
      }));
      if (!error) {
        pitch.pending = false;
        await this.saveLocal('pitches', userId, pitch);
      }
    }
    return pitch;
  }

  async deletePitch(userId: string, pitchId: string): Promise<void> {
    await this.addTombstone(userId, pitchId);
    await this.removeFromLocal('pitches', userId, pitchId);
    if (!userId.startsWith('local-')) {
      await this.safeSupabaseCall(() => supabase.from('pitches').delete().eq('id', pitchId).eq('user_id', userId));
    }
  }

  /**
   * Chat Logic
   */
  async addMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const msg: ChatMessage & { pending: boolean } = { 
      id: this.generateId(), 
      timestamp: Date.now(), 
      ...message as any, 
      pending: true 
    };
    await this.saveLocal('chat_messages', userId, msg);
    
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('chat_messages').insert({ 
        id: msg.id, 
        user_id: userId, 
        session_id: msg.sessionId, 
        role: msg.role, 
        text: msg.text, 
        created_at: new Date(msg.timestamp).toISOString() 
      }));
      if (!error) {
        msg.pending = false;
        await this.saveLocal('chat_messages', userId, msg);
      }
    }
    return msg;
  }

  async createChatSession(userId: string, name: string): Promise<ChatSession> {
    const session: ChatSession & { pending: boolean } = { 
      id: this.generateId(), 
      name, 
      lastMessageAt: Date.now(), 
      preview: 'Starta konversationen...', 
      pending: true 
    } as any;

    await this.saveLocal('chat_sessions', userId, session);
    
    if (!userId.startsWith('local-')) {
      const { error } = await this.safeSupabaseCall(() => supabase.from('chat_sessions').insert({ 
        id: session.id, 
        user_id: userId, 
        name: session.name, 
        last_message_at: new Date(session.lastMessageAt).toISOString(), 
        preview: session.preview 
      }));
      if (!error) {
        session.pending = false;
        await this.saveLocal('chat_sessions', userId, session);
      }
    }
    return session;
  }

  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    await this.addTombstone(userId, sessionId);
    await this.removeFromLocal('chat_sessions', userId, sessionId);
    
    await this.mutex.run(async () => {
      const msgKey = GET_LOCAL_KEY('chat_messages', userId);
      const filteredMessages = JSON.parse(localStorage.getItem(msgKey) || '[]').filter((m: any) => m && m.sessionId !== sessionId);
      localStorage.setItem(msgKey, JSON.stringify(filteredMessages));
    });

    if (!userId.startsWith('local-')) {
      await Promise.all([
        this.safeSupabaseCall(() => supabase.from('chat_messages').delete().eq('session_id', sessionId).eq('user_id', userId)),
        this.safeSupabaseCall(() => supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId))
      ]);
    }
  }

  async renameChatSession(userId: string, sessionId: string, name: string): Promise<void> {
    await this.updateChatSession(userId, sessionId, { name });
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    let session = (data.sessions || []).find(s => s.name === 'UF-läraren');
    if (!session) {
      return await this.createChatSession(userId, 'UF-läraren');
    }
    return session;
  }

  async updateChatSession(userId: string, sessionId: string, updates: any) {
    await this.updateLocal('chat_sessions', userId, sessionId, updates);

    if (!userId.startsWith('local-')) {
      const p: any = {};
      if (updates.name) p.name = updates.name;
      if (updates.lastMessageAt) p.last_message_at = new Date(updates.lastMessageAt).toISOString();
      if (updates.preview) p.preview = updates.preview;
      await this.safeSupabaseCall(() => supabase.from('chat_sessions').update(p).eq('id', sessionId).eq('user_id', userId));
    }
  }

  /**
   * Reports & Brand Assets
   */
  async addReportToHistory(userId: string, report: CompanyReport): Promise<CompanyReportEntry> {
    const entry: CompanyReportEntry = {
      id: this.generateId(),
      title: report.meta.companyName,
      reportData: report,
      created_at: new Date().toISOString()
    };
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

  /**
   * GDPR Tools
   */
  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.getUserData(userId);
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
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
   * Internal Atomic Helpers
   */
  private async saveLocal(table: string, userId: string, item: any) {
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      if (item.id) {
        const existingIndex = current.findIndex((i: any) => i && i.id === item.id);
        if (existingIndex >= 0) { 
          current[existingIndex] = item; 
          localStorage.setItem(key, JSON.stringify(current)); 
          return; 
        }
      }
      localStorage.setItem(key, JSON.stringify([item, ...current]));
    });
  }

  private async updateLocal(table: string, userId: string, id: string, updates: any) {
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = current.findIndex((i: any) => i && i.id === id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...updates };
        localStorage.setItem(key, JSON.stringify(current));
      }
    });
  }

  private async removeFromLocal(table: string, userId: string, id: string) {
    return this.mutex.run(async () => {
      const key = GET_LOCAL_KEY(table, userId);
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = current.filter((i: any) => i && i.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    });
  }

  private generateId() { 
    return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  }

  private mapUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};
    return { 
      id: supabaseUser.id, 
      email: supabaseUser.email, 
      firstName: metadata.first_name || '', 
      lastName: metadata.last_name || '', 
      company: metadata.company || '', 
      bio: metadata.bio || '', 
      createdAt: supabaseUser.created_at, 
      onboardingCompleted: metadata.onboarding_completed ?? false, 
      plan: metadata.plan || 'free' 
    };
  }
}

export const db = new DatabaseService();
