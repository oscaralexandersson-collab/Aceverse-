
import { supabase } from './supabase';
import { User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, SearchResult, ContactRequest, Coach, Notification, Invoice, UserSettings, CompanyReport, MarketingCampaign, BrandDNA, CompanyReportEntry } from '../types';

const getLocalKey = (table: string, userId: string) => `aceverse_${userId}_${table}`;
const SESSION_KEY = 'aceverse_session_user';
const LOCAL_USERS_KEY = 'aceverse_local_users_db';
const TOMBSTONE_KEY = (userId: string) => `aceverse_${userId}_tombstones`;

class DatabaseService {
  // Session-baserad spärrlista (för snabb åtkomst)
  private deletedIds: Set<string> = new Set();
  
  private async safeSupabaseCall(promise: Promise<any>, timeoutMs = 4000) {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs));
      try {
          return await Promise.race([promise, timeout]);
      } catch (e) {
          console.warn("Supabase call failed or timed out:", e);
          return { error: e, data: null };
      }
  }

  // Hjälpmetoder för Tombstones (beständiga raderingar)
  private getTombstones(userId: string): Set<string> {
      try {
          const stored = localStorage.getItem(TOMBSTONE_KEY(userId));
          const arr = stored ? JSON.parse(stored) : [];
          return new Set(arr);
      } catch (e) {
          return new Set();
      }
  }

  private addTombstone(userId: string, id: string) {
      const stones = this.getTombstones(userId);
      stones.add(id);
      this.deletedIds.add(id);
      localStorage.setItem(TOMBSTONE_KEY(userId), JSON.stringify(Array.from(stones)));
  }

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
        
        const existingUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
        if (existingUsers.some((u: User) => u.email === cleanEmail)) {
            if (cleanEmail === 'test@aceverse.se' || cleanEmail === 'demo@aceverse.se') {
                this.setSession(localUser, true);
                return localUser;
            }
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

    if (cleanEmail === 'demo@aceverse.se' || cleanEmail === 'test@aceverse.se') {
        return this.createDemoUser();
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
      try {
          localStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY);
          const data = JSON.stringify(user);
          if (persistent) localStorage.setItem(SESSION_KEY, data);
          else sessionStorage.setItem(SESSION_KEY, data);
      } catch (e) {}
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
        await this.safeSupabaseCall(supabase.auth.signOut(), 1000); 
    } catch (e) {} finally {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        this.deletedIds.clear();
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
    
    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) { 
        try { return JSON.parse(local); } 
        catch (e) { localStorage.removeItem(SESSION_KEY); } 
    }
    return null;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (!userId.startsWith('local-')) {
        await this.safeSupabaseCall(supabase.auth.updateUser({ data: { first_name: updates.firstName, last_name: updates.lastName, company: updates.company, bio: updates.bio, plan: updates.plan, company_report: updates.companyReport } }));
    }
    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) {
        try {
            const user = JSON.parse(local);
            if (user.id === userId) {
                const updatedUser = { ...user, ...updates };
                if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
                else sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
            }
        } catch(e) {}
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
          this.setSession(updatedUser, true);
          return updatedUser;
      }
      return (await this.getCurrentUser()) as User;
  }

  async getUserData(userId: string): Promise<UserData> {
    const isLocal = userId.startsWith('local-');
    const tombstones = this.getTombstones(userId);
    let remoteResults: any[] = [];

    if (!isLocal) {
        const results = await Promise.allSettled([
            this.safeSupabaseCall(supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
            this.safeSupabaseCall(supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })),
            this.safeSupabaseCall(supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }))
        ]);
        remoteResults = results.map(res => res.status === 'fulfilled' ? (res.value as any).data : null);
    }

    const getL = (k: string) => {
        try {
            const val = localStorage.getItem(getLocalKey(k, userId));
            if (!val) return [];
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch(e) { return []; }
    };
    
    // SYNC ENGINE: Remote is the source of truth, with persistent Tombstone filtering
    const merge = (table: string, remote: any[] | null, local: any[]) => {
        if (isLocal) return (local || []).filter(i => i && !tombstones.has(i.id));
        if (remote === null) return (local || []).filter(i => i && !tombstones.has(i.id));

        const remoteIds = new Set(remote.map(i => i.id));
        
        // Filter out items that are marked for deletion (Tombstones)
        const pending = (local || []).filter(i => 
            i && 
            i.pending === true && 
            !remoteIds.has(i.id) && 
            !tombstones.has(i.id)
        );

        // Filter the remote results through the beständiga tombstone-listan
        const sanitizedRemote = remote.filter(i => i && !tombstones.has(i.id));

        const finalData = [...pending, ...sanitizedRemote];
        try {
            localStorage.setItem(getLocalKey(table, userId), JSON.stringify(finalData));
        } catch(e) {}
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
        settings: JSON.parse(localStorage.getItem(getLocalKey('settings', userId)) || 'null') || { notifications: { email: true, push: true, marketing: false }, privacy: { publicProfile: false, dataSharing: false } },
        marketingCampaigns: getL('marketing_campaigns'),
        brandDNAs: getL('brand_dnas'),
        reports: getL('company_reports')
    };
  }

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
      if (i.title.toLowerCase().includes(q) || (i.snapshot?.problem_statement || '').toLowerCase().includes(q)) {
        results.push({ id: i.id, type: 'idea', title: i.title, subtitle: (i.snapshot?.problem_statement || '').substring(0, 40) + '...', view: 'ideas' });
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
      const pitch: any = { id: this.generateId(), dateCreated: new Date().toISOString(), ...pitchData, pending: true };
      this.saveLocal('pitches', userId, pitch);
      
      if (!userId.startsWith('local-')) {
          const { error } = await supabase.from('pitches').insert({ id: pitch.id, user_id: userId, type: pitch.type, name: pitch.name, content: pitch.content, chat_session_id: pitch.chatSessionId, context_score: pitch.contextScore, created_at: pitch.dateCreated });
          if (!error) {
              pitch.pending = false;
              this.saveLocal('pitches', userId, pitch);
          }
      }
      return pitch;
  }

  async deletePitch(userId: string, pitchId: string): Promise<void> {
      this.addTombstone(userId, pitchId);
      this.removeFromLocal('pitches', userId, pitchId);
      if (!userId.startsWith('local-')) {
          await supabase.from('pitches').delete().eq('id', pitchId).eq('user_id', userId);
      }
  }

  async addIdea(userId: string, ideaData: Omit<Idea, 'id' | 'dateCreated' | 'score'>): Promise<Idea> {
    const idea: any = { id: this.generateId(), dateCreated: new Date().toISOString(), score: 0, ...ideaData, pending: true };
    this.saveLocal('ideas', userId, idea);
    
    if (!userId.startsWith('local-')) {
        const { error } = await supabase.from('ideas').insert({
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
        });
        if (!error) {
            idea.pending = false;
            this.saveLocal('ideas', userId, idea);
        }
    }
    return idea;
  }

  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>): Promise<void> {
    const key = getLocalKey('ideas', userId);
    try {
        const ideas = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = ideas.findIndex((i: any) => i && i.id === ideaId);
        if (idx >= 0) {
          ideas[idx] = { ...ideas[idx], ...updates };
          localStorage.setItem(key, JSON.stringify(ideas));
          
          if (!userId.startsWith('local-')) {
              const p: any = {};
              if (updates.title) p.title = updates.title;
              if (updates.currentPhase) p.current_phase = updates.currentPhase;
              if (updates.snapshot) p.snapshot = updates.snapshot;
              if (updates.nodes) p.nodes = updates.nodes;
              if (updates.tasks) p.tasks = updates.tasks;
              await supabase.from('ideas').update(p).eq('id', ideaId).eq('user_id', userId);
          }
        }
    } catch(e) {}
  }

  async deleteIdea(userId: string, ideaId: string): Promise<void> {
    this.addTombstone(userId, ideaId); // Markera som permanent raderad
    this.removeFromLocal('ideas', userId, ideaId);
    if (!userId.startsWith('local-')) {
        await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', userId);
    }
  }

  async addMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
      const msg: any = { id: this.generateId(), timestamp: Date.now(), ...message, pending: true };
      this.saveLocal('chat_messages', userId, msg);
      
      if (!userId.startsWith('local-')) {
          const { error } = await supabase.from('chat_messages').insert({ 
              id: msg.id, 
              user_id: userId, 
              session_id: msg.sessionId, 
              role: msg.role, 
              text: msg.text, 
              created_at: new Date(msg.timestamp).toISOString() 
          });
          if (!error) {
              msg.pending = false;
              this.saveLocal('chat_messages', userId, msg);
          }
      }
      return msg;
  }

  async createChatSession(userId: string, name: string): Promise<ChatSession> {
    const session: any = { id: this.generateId(), name, lastMessageAt: Date.now(), preview: 'Starta konversationen...', pending: true };
    this.saveLocal('chat_sessions', userId, session);
    
    if (!userId.startsWith('local-')) {
        const { error } = await supabase.from('chat_sessions').insert({ 
            id: session.id, 
            user_id: userId, 
            name: session.name, 
            last_message_at: new Date(session.lastMessageAt).toISOString(), 
            preview: session.preview 
        });
        if (!error) {
            session.pending = false;
            this.saveLocal('chat_sessions', userId, session);
        }
    }
    return session;
  }

  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
    this.addTombstone(userId, sessionId);
    this.removeFromLocal('chat_sessions', userId, sessionId);
    const msgKey = getLocalKey('chat_messages', userId);
    try {
        const filteredMessages = JSON.parse(localStorage.getItem(msgKey) || '[]').filter((m: any) => m && m.sessionId !== sessionId);
        localStorage.setItem(msgKey, JSON.stringify(filteredMessages));
    } catch(e) {}

    if (!userId.startsWith('local-')) {
        await supabase.from('chat_messages').delete().eq('session_id', sessionId).eq('user_id', userId);
        await supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId);
    }
  }

  async renameChatSession(userId: string, sessionId: string, name: string): Promise<void> {
    await this.updateChatSession(userId, sessionId, { name });
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    let session = data.sessions.find(s => s.name === 'UF-läraren');
    if (!session) {
        return await this.createChatSession(userId, 'UF-läraren');
    }
    return session;
  }

  async updateChatSession(userId: string, sessionId: string, updates: any) {
      const key = getLocalKey('chat_sessions', userId);
      try {
          const sessions = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = sessions.findIndex((s: any) => s && s.id === sessionId);
          if (idx >= 0) { 
              sessions[idx] = { ...sessions[idx], ...updates }; 
              localStorage.setItem(key, JSON.stringify(sessions)); 
          }
          if (!userId.startsWith('local-')) {
              const p: any = {};
              if (updates.name) p.name = updates.name;
              if (updates.lastMessageAt) p.last_message_at = new Date(updates.lastMessageAt).toISOString();
              if (updates.preview) p.preview = updates.preview;
              await supabase.from('chat_sessions').update(p).eq('id', sessionId).eq('user_id', userId);
          }
      } catch(e) {}
  }

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
    this.addTombstone(userId, reportId);
    this.removeFromLocal('company_reports', userId, reportId);
  }

  async addBrandDNA(userId: string, dna: BrandDNA): Promise<void> {
    this.saveLocal('brand_dnas', userId, dna);
  }

  async addMarketingCampaign(userId: string, campaign: MarketingCampaign): Promise<void> {
    this.saveLocal('marketing_campaigns', userId, campaign);
  }

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
    localStorage.removeItem(TOMBSTONE_KEY(userId));
    this.deletedIds.clear();
    await this.logout();
  }

  async submitContactRequest(request: ContactRequest): Promise<void> {
    const req = { ...request, id: this.generateId(), created_at: new Date().toISOString() };
    const key = 'aceverse_contact_requests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([req, ...existing]));
  }

  private saveLocal(table: string, userId: string, item: any) {
    const key = getLocalKey(table, userId);
    try {
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
    } catch(e) {}
  }

  private removeFromLocal(table: string, userId: string, id: string) {
      const key = getLocalKey(table, userId);
      try {
          const current = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = current.filter((i: any) => i && i.id !== id);
          localStorage.setItem(key, JSON.stringify(filtered));
      } catch(e) {}
  }

  private generateId() { 
      return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  }

  private mapUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};
    return { id: supabaseUser.id, email: supabaseUser.email, firstName: metadata.first_name || '', lastName: metadata.last_name || '', company: metadata.company || '', bio: metadata.bio || '', createdAt: supabaseUser.created_at, onboardingCompleted: metadata.onboarding_completed ?? false, plan: metadata.plan || 'free' };
  }
}

export const db = new DatabaseService();
