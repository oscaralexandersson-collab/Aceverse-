
import { supabase } from './supabase';
import { User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, SearchResult, ContactRequest, Coach, Notification, Invoice, UserSettings, CompanyReport, MarketingCampaign, BrandDNA, CompanyReportEntry } from '../types';

const getLocalKey = (table: string, userId: string) => `aceverse_${userId}_${table}`;
const SESSION_KEY = 'aceverse_session_user';
const LOCAL_USERS_KEY = 'aceverse_local_users_db';

class DatabaseService {
  
  private async safeSupabaseCall(promise: Promise<any>, timeoutMs = 3000) {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs));
      try {
          const result = await Promise.race([promise, timeout]);
          return result;
      } catch (e) {
          console.warn("Supabase call skipped (timeout or error), using local data only.", e);
          return { error: e };
      }
  }

  async signup(email: string, password: string, firstName: string, lastName: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail.endsWith('@local.dev')) {
        const localUser: User = {
            id: 'local-' + Date.now(),
            email: cleanEmail,
            firstName,
            lastName,
            company: 'Local Startup',
            createdAt: new Date().toISOString(),
            onboardingCompleted: false,
            plan: 'free'
        };
        
        const existingUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
        if (existingUsers.some((u: User) => u.email === cleanEmail)) {
            throw new Error('Användaren finns redan (Lokalt). Logga in istället.');
        }
        existingUsers.push({ ...localUser, password });
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(existingUsers));

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

    if (error) throw error;
    if (data.user) {
        this.setSession(this.mapUser(data.user), true);
        return this.mapUser(data.user);
    }
    throw new Error('Signup failed');
  }

  async login(email: string, password: string, rememberMe: boolean = true): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === 'demo@aceverse.se') return this.createDemoUser();

    if (cleanEmail.endsWith('@local.dev')) {
        const existingUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
        const user = existingUsers.find((u: any) => u.email === cleanEmail && u.password === password);
        
        if (user) {
            const { password, ...safeUser } = user;
            this.setSession(safeUser, rememberMe);
            return safeUser;
        } else {
            throw new Error('Felaktig e-post eller lösenord (Lokalt konto).');
        }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
    });

    if (error) throw error;
    if (data.user) {
        const mappedUser = this.mapUser(data.user);
        this.setSession(mappedUser, rememberMe);
        return mappedUser;
    }
    throw new Error('Login failed');
  }

  async loginWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline', prompt: 'consent' } },
    });
    if (error) throw error;
  }

  private setSession(user: User, persistent: boolean) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      const data = JSON.stringify(user);
      if (persistent) localStorage.setItem(SESSION_KEY, data);
      else sessionStorage.setItem(SESSION_KEY, data);
  }

  async createDemoUser(): Promise<User> {
    const mockUser: User = { id: 'local-demo', email: 'demo@aceverse.se', firstName: 'Demo', lastName: 'User', company: 'Demo Corp', createdAt: new Date().toISOString(), onboardingCompleted: false, plan: 'pro' };
    this.setSession(mockUser, true);
    return mockUser;
  }

  async logout() {
    try { await this.safeSupabaseCall(supabase.auth.signOut(), 1000); } catch (e) {} finally {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await this.safeSupabaseCall(supabase.auth.getSession(), 2000);
      const session = data?.session;
      if (session?.user) {
        const user = this.mapUser(session.user);
        this.setSession(user, true); 
        return user;
      }
    } catch (error) {}
    const local = localStorage.getItem(SESSION_KEY);
    if (local) { try { return JSON.parse(local); } catch (e) { localStorage.removeItem(SESSION_KEY); } }
    return null;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (!userId.startsWith('local-')) {
        await this.safeSupabaseCall(supabase.auth.updateUser({ data: { first_name: updates.firstName, last_name: updates.lastName, company: updates.company, bio: updates.bio, plan: updates.plan, company_report: updates.companyReport } }));
    }
    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) {
        const user = JSON.parse(local);
        if (user.id === userId) {
            const updatedUser = { ...user, ...updates };
            if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
            else sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        }
    }
  }

  async completeOnboarding(userId: string, companyData: any): Promise<User> {
      if (!userId.startsWith('local-')) {
          await this.safeSupabaseCall(supabase.auth.updateUser({ data: { company: companyData.company, industry: companyData.industry, business_stage: companyData.stage, description: companyData.description, onboarding_completed: true } }));
      }
      const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (local) {
          const user = JSON.parse(local);
          const updatedUser = { ...user, company: companyData.company, onboardingCompleted: true };
          if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          else sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          return updatedUser;
      }
      return (await this.getCurrentUser()) as User;
  }

  async getUserData(userId: string): Promise<UserData> {
    let remoteData: any = {};
    if (!userId.startsWith('local-')) {
        const results = await Promise.allSettled([
            this.safeSupabaseCall(supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
            this.safeSupabaseCall(supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }))
        ]);
        results.forEach((res, i) => { if (res.status === 'fulfilled' && res.value?.data) remoteData[i] = res.value.data; });
    }

    const getL = (k: string) => JSON.parse(localStorage.getItem(getLocalKey(k, userId)) || '[]');
    const merge = (r: any[] = [], l: any[]) => { const ids = new Set(r.map(i => i.id)); return [...l.filter(i => !ids.has(i.id)), ...r]; };

    return { 
        leads: merge(remoteData[0]?.map((d: any) => ({ ...d, value: Number(d.value) || 0 })), getL('leads')),
        ideas: merge(remoteData[1], getL('ideas')),
        pitches: merge(remoteData[2]?.map((d: any) => ({ ...d, dateCreated: d.created_at, chatSessionId: d.chat_session_id, contextScore: d.context_score })), getL('pitches')),
        chatHistory: merge(remoteData[3], getL('chat_messages')),
        coaches: getL('coaches'),
        sessions: merge(remoteData[4]?.map((d: any) => ({ id: d.id, name: d.name, lastMessageAt: d.last_message_at ? new Date(d.last_message_at).getTime() : Date.now(), preview: d.preview })), getL('chat_sessions')),
        notifications: getL('notifications'),
        invoices: getL('invoices'),
        settings: JSON.parse(localStorage.getItem(getLocalKey('settings', userId)) || 'null') || { notifications: { email: true, push: true, marketing: false }, privacy: { publicProfile: false, dataSharing: false } },
        marketingCampaigns: getL('marketing_campaigns'),
        brandDNAs: getL('brand_dnas'),
        reports: getL('company_reports')
    };
  }

  // Added search method for global search functionality
  async search(userId: string, query: string): Promise<SearchResult[]> {
    const data = await this.getUserData(userId);
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    data.leads.forEach(l => {
      if (l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)) {
        results.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company, view: 'crm' });
      }
    });

    data.ideas.forEach(i => {
      if (i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) {
        results.push({ id: i.id, type: 'idea', title: i.title, subtitle: i.description.substring(0, 40) + '...', view: 'ideas' });
      }
    });

    data.pitches.forEach(p => {
      if (p.name.toLowerCase().includes(q)) {
        results.push({ id: p.id, type: 'pitch', title: p.name, subtitle: `Pitch Deck - ${new Date(p.dateCreated).toLocaleDateString()}`, view: 'pitch' });
      }
    });

    return results;
  }

  async addPitch(userId: string, pitchData: Omit<Pitch, 'id' | 'dateCreated'>): Promise<Pitch> {
      const pitch: Pitch = { id: this.generateId(), dateCreated: new Date().toISOString(), ...pitchData };
      this.saveLocal('pitches', userId, pitch);
      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('pitches').insert({ id: pitch.id, user_id: userId, type: pitch.type, name: pitch.name, content: pitch.content, chat_session_id: pitch.chatSessionId, context_score: pitch.contextScore, created_at: pitch.dateCreated }));
      }
      return pitch;
  }

  async updatePitch(userId: string, pitchId: string, updates: Partial<Pitch>): Promise<void> {
      const key = getLocalKey('pitches', userId);
      const pitches = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = pitches.findIndex((p: any) => p.id === pitchId);
      if (idx >= 0) {
          pitches[idx] = { ...pitches[idx], ...updates };
          localStorage.setItem(key, JSON.stringify(pitches));
      }
      if (!userId.startsWith('local-')) {
          const payload: any = {};
          if (updates.content) payload.content = updates.content;
          if (updates.contextScore !== undefined) payload.context_score = updates.contextScore;
          if (updates.name) payload.name = updates.name;
          this.safeSupabaseCall(supabase.from('pitches').update(payload).eq('id', pitchId).eq('user_id', userId));
      }
  }

  async deletePitch(userId: string, pitchId: string): Promise<void> {
      const key = getLocalKey('pitches', userId);
      const filtered = JSON.parse(localStorage.getItem(key) || '[]').filter((p: any) => p.id !== pitchId);
      localStorage.setItem(key, JSON.stringify(filtered));
      if (!userId.startsWith('local-')) this.safeSupabaseCall(supabase.from('pitches').delete().eq('id', pitchId).eq('user_id', userId));
  }

  // Added addIdea method
  async addIdea(userId: string, ideaData: Omit<Idea, 'id' | 'dateCreated' | 'score'>): Promise<Idea> {
    const idea: Idea = { id: this.generateId(), dateCreated: new Date().toISOString(), score: 0, ...ideaData };
    this.saveLocal('ideas', userId, idea);
    return idea;
  }

  // Added updateIdeaState method
  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>): Promise<void> {
    const key = getLocalKey('ideas', userId);
    const ideas = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = ideas.findIndex((i: any) => i.id === ideaId);
    if (idx >= 0) {
      ideas[idx] = { ...ideas[idx], ...updates };
      localStorage.setItem(key, JSON.stringify(ideas));
    }
  }

  async addMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
      const msg: ChatMessage = { id: this.generateId(), timestamp: Date.now(), ...message };
      this.saveLocal('chat_messages', userId, msg);
      if (!userId.startsWith('local-')) this.safeSupabaseCall(supabase.from('chat_messages').insert({ id: msg.id, user_id: userId, session_id: msg.sessionId, role: msg.role, text: msg.text, created_at: new Date(msg.timestamp).toISOString() }));
      return msg;
  }

  // Added createChatSession method
  async createChatSession(userId: string, name: string): Promise<ChatSession> {
    const session: ChatSession = { id: this.generateId(), name, lastMessageAt: Date.now(), preview: 'Starta konversationen...' };
    this.saveLocal('chat_sessions', userId, session);
    return session;
  }

  // Added deleteChatSession method
  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    const key = getLocalKey('chat_sessions', userId);
    const filtered = JSON.parse(localStorage.getItem(key) || '[]').filter((s: any) => s.id !== sessionId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  // Added renameChatSession method
  async renameChatSession(userId: string, sessionId: string, name: string): Promise<void> {
    await this.updateChatSession(userId, sessionId, { name });
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    let session = data.sessions.find(s => s.name === 'UF-läraren');
    if (!session) {
        session = { id: this.generateId(), name: 'UF-läraren', group: 'System', lastMessageAt: Date.now(), preview: 'Starta konversationen...' };
        this.saveLocal('chat_sessions', userId, session);
        if (!userId.startsWith('local-')) this.safeSupabaseCall(supabase.from('chat_sessions').insert({ id: session.id, user_id: userId, name: session.name, group_name: session.group, last_message_at: new Date(session.lastMessageAt).toISOString(), preview: session.preview }));
    }
    return session;
  }

  async updateChatSession(userId: string, sessionId: string, updates: any) {
      const key = getLocalKey('chat_sessions', userId);
      const sessions = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = sessions.findIndex((s: any) => s.id === sessionId);
      if (idx >= 0) { sessions[idx] = { ...sessions[idx], ...updates }; localStorage.setItem(key, JSON.stringify(sessions)); }
      if (!userId.startsWith('local-')) {
          const p: any = {};
          if (updates.name) p.name = updates.name;
          if (updates.lastMessageAt) p.last_message_at = new Date(updates.lastMessageAt).toISOString();
          if (updates.preview) p.preview = updates.preview;
          this.safeSupabaseCall(supabase.from('chat_sessions').update(p).eq('id', sessionId).eq('user_id', userId));
      }
  }

  // Added report management methods
  async addReportToHistory(userId: string, report: CompanyReport): Promise<CompanyReportEntry> {
    const entry: CompanyReportEntry = {
        id: this.generateId(),
        title: report.meta.companyName,
        reportData: report,
        created_at: new Date().toISOString()
    };
    this.saveLocal('company_reports', userId, entry);
    return entry;
  }

  async deleteReport(userId: string, reportId: string): Promise<void> {
    const key = getLocalKey('company_reports', userId);
    const filtered = JSON.parse(localStorage.getItem(key) || '[]').filter((r: any) => r.id !== reportId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  // Added settings and GDPR methods
  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    localStorage.setItem(getLocalKey('settings', userId), JSON.stringify(settings));
  }

  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.getUserData(userId);
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async deleteAccount(userId: string): Promise<void> {
    const tables = ['leads', 'ideas', 'pitches', 'chat_messages', 'chat_sessions', 'notifications', 'invoices', 'settings', 'marketing_campaigns', 'brand_dnas', 'company_reports'];
    tables.forEach(t => localStorage.removeItem(getLocalKey(t, userId)));
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    await this.logout();
  }

  // Added contact request and marketing methods
  async submitContactRequest(request: ContactRequest): Promise<void> {
    const req = { ...request, id: this.generateId(), created_at: new Date().toISOString() };
    const key = 'aceverse_contact_requests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([req, ...existing]));
  }

  async addBrandDNA(userId: string, dna: BrandDNA): Promise<void> {
    this.saveLocal('brand_dnas', userId, dna);
  }

  async addMarketingCampaign(userId: string, campaign: MarketingCampaign): Promise<void> {
    this.saveLocal('marketing_campaigns', userId, campaign);
  }

  private saveLocal(table: string, userId: string, item: any) {
    const key = getLocalKey(table, userId);
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    if (item.id) {
        const existingIndex = current.findIndex((i: any) => i.id === item.id);
        if (existingIndex >= 0) { current[existingIndex] = item; localStorage.setItem(key, JSON.stringify(current)); return; }
    }
    localStorage.setItem(key, JSON.stringify([item, ...current]));
  }

  private generateId() { return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2); }

  private mapUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};
    return { id: supabaseUser.id, email: supabaseUser.email, firstName: metadata.first_name || '', lastName: metadata.last_name || '', company: metadata.company || '', bio: metadata.bio || '', createdAt: supabaseUser.created_at, onboardingCompleted: metadata.onboarding_completed ?? false, plan: metadata.plan || 'free' };
  }
}

export const db = new DatabaseService();
