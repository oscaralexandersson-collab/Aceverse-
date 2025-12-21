
import { supabase } from './supabase';
import { User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, SearchResult, ContactRequest, Coach, Notification, Invoice, UserSettings, CompanyReport, MarketingCampaign, BrandDNA, CompanyReportEntry } from '../types';

// Helper to handle local storage keys securely
const getLocalKey = (table: string, userId: string) => `aceverse_${userId}_${table}`;
const SESSION_KEY = 'aceverse_session_user';
const LOCAL_USERS_KEY = 'aceverse_local_users_db';

class DatabaseService {
  
  // --- Helpers ---

  // Safety wrapper to prevent UI hangs if Supabase is slow/unreachable
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

  // --- Auth Methods ---

  async signup(email: string, password: string, firstName: string, lastName: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. LOCAL DEV BYPASS
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

    // 2. Strict Supabase Sign Up
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

    if (error) {
        throw error;
    }
    
    if (data.user) {
        this.setSession(this.mapUser(data.user), true);
        return this.mapUser(data.user);
    }

    throw new Error('Signup failed');
  }

  async login(email: string, password: string, rememberMe: boolean = true): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Special handling for Demo User
    if (cleanEmail === 'demo@aceverse.se') {
        return this.createDemoUser();
    }

    // 2. LOCAL DEV BYPASS
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

    // 3. Strict Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
    });

    if (error) {
        throw error; 
    }

    if (data.user) {
        const mappedUser = this.mapUser(data.user);
        
        // Enrich with locally stored report if available (legacy fallback)
        const localReport = localStorage.getItem(getLocalKey('company_report', mappedUser.id));
        if (localReport && !mappedUser.companyReport) {
            mappedUser.companyReport = JSON.parse(localReport);
        }
        
        this.setSession(mappedUser, rememberMe);
        return mappedUser;
    }
    
    throw new Error('Login failed');
  }

  async loginWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: window.location.origin, 
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });
    if (error) throw error;
  }

  private setSession(user: User, persistent: boolean) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);

      const data = JSON.stringify(user);
      if (persistent) {
          localStorage.setItem(SESSION_KEY, data);
      } else {
          sessionStorage.setItem(SESSION_KEY, data);
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
        onboardingCompleted: false, 
        plan: 'pro'
    };
    this.setSession(mockUser, true);
    
    const demoNotifs: Notification[] = [
        { id: '1', title: 'Välkommen!', message: 'Välkommen till Aceverse. Detta är ett demokonto.', type: 'info', read: false, date: new Date().toISOString() }
    ];
    this.saveLocal('notifications', mockUser.id, demoNotifs[0]);

    return mockUser;
  }

  async logout() {
    try {
        await this.safeSupabaseCall(supabase.auth.signOut(), 1000);
    } catch (e) {
        console.warn("Supabase signout failed (likely offline or demo user):", e);
    } finally {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await this.safeSupabaseCall(supabase.auth.getSession(), 2000);
      const session = data?.session;
      
      if (session?.user) {
        const user = this.mapUser(session.user);
        const localReport = localStorage.getItem(getLocalKey('company_report', user.id));
        if (localReport && !user.companyReport) {
             user.companyReport = JSON.parse(localReport);
        }
        this.setSession(user, true); 
        return user;
      }
    } catch (error) {
      console.warn("Supabase session check failed", error);
    }

    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
        try { return JSON.parse(local); } catch (e) { localStorage.removeItem(SESSION_KEY); }
    }
    const sessionStore = sessionStorage.getItem(SESSION_KEY);
    if (sessionStore) {
        try { return JSON.parse(sessionStore); } catch (e) { sessionStorage.removeItem(SESSION_KEY); }
    }
    return null;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (!userId.startsWith('local-')) {
        await this.safeSupabaseCall(supabase.auth.updateUser({
            data: {
                first_name: updates.firstName,
                last_name: updates.lastName,
                company: updates.company,
                bio: updates.bio,
                plan: updates.plan,
                company_report: updates.companyReport
            }
        }));
    }

    const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (local) {
        const user = JSON.parse(local);
        if (user.id === userId) {
            const updatedUser = { ...user, ...updates };
            if (localStorage.getItem(SESSION_KEY)) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
            } else {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
            }
            if (userId.startsWith('local-') && userId !== 'local-demo') {
                const existingUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
                const idx = existingUsers.findIndex((u: any) => u.id === userId);
                if (idx >= 0) {
                    existingUsers[idx] = { ...existingUsers[idx], ...updates };
                    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(existingUsers));
                }
            }
        }
    }
  }

  async setActiveCompanyReport(userId: string, report: CompanyReport): Promise<void> {
      localStorage.setItem(getLocalKey('company_report', userId), JSON.stringify(report));
      await this.updateProfile(userId, { companyReport: report });
  }

  async addReportToHistory(userId: string, report: CompanyReport): Promise<CompanyReportEntry> {
      const entry: CompanyReportEntry = {
          id: this.generateId(),
          title: report.meta?.companyName || 'Rapport',
          reportData: report,
          created_at: new Date().toISOString()
      };
      
      this.saveLocal('company_reports', userId, entry);

      if (!userId.startsWith('local-')) {
          await this.safeSupabaseCall(supabase.from('company_reports').insert({
              id: entry.id,
              user_id: userId,
              title: entry.title,
              report_data: entry.reportData,
              created_at: entry.created_at
          }));
      }
      return entry;
  }

  async deleteReport(userId: string, reportId: string): Promise<void> {
      // 1. Local Delete
      const key = getLocalKey('company_reports', userId);
      const reports = JSON.parse(localStorage.getItem(key) || '[]');
      const filteredReports = reports.filter((r: any) => r.id !== reportId);
      localStorage.setItem(key, JSON.stringify(filteredReports));

      // 2. Supabase Delete
      if (!userId.startsWith('local-')) {
          const { error } = await supabase
              .from('company_reports')
              .delete()
              .eq('id', reportId)
              .eq('user_id', userId);
          
          if (error) {
              console.error("Supabase DELETE failed:", error);
          }
      }
  }

  async completeOnboarding(userId: string, companyData: { company: string; industry: string; stage: string; description: string }): Promise<User> {
      if (!userId.startsWith('local-')) {
          await this.safeSupabaseCall(supabase.auth.updateUser({
              data: {
                  company: companyData.company,
                  industry: companyData.industry,
                  business_stage: companyData.stage,
                  description: companyData.description,
                  onboarding_completed: true
              }
          }));
      }

      const local = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (local) {
          const user = JSON.parse(local);
          const updatedUser = { 
              ...user, 
              company: companyData.company,
              onboardingCompleted: true 
          };
          if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          else sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          return updatedUser;
      }
      return (await this.getCurrentUser()) as User;
  }

  // --- Data Access ---

  async getUserData(userId: string): Promise<UserData> {
    let leads: Lead[] = [];
    let ideas: Idea[] = [];
    let pitches: Pitch[] = [];
    let chatHistory: ChatMessage[] = [];
    let coaches: Coach[] = [];
    let sessions: ChatSession[] = [];
    let notifications: Notification[] = [];
    let invoices: Invoice[] = [];
    let marketingCampaigns: MarketingCampaign[] = [];
    let brandDNAs: BrandDNA[] = [];
    let reports: CompanyReportEntry[] = [];
    let settings: UserSettings | undefined;

    if (!userId.startsWith('local-')) {
        // Use shorter timeout for read operations to load fast
        const results = await Promise.allSettled([
            this.safeSupabaseCall(supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 5000),
            this.safeSupabaseCall(supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 5000),
            this.safeSupabaseCall(supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 5000),
            this.safeSupabaseCall(supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }), 5000),
            this.safeSupabaseCall(supabase.from('marketing_campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 5000),
            this.safeSupabaseCall(supabase.from('brand_dna').select('*').eq('user_id', userId), 5000), // Get ALL rows
            this.safeSupabaseCall(supabase.from('company_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 5000),
            this.safeSupabaseCall(supabase.from('chat_sessions').select('*').eq('user_id', userId).order('last_message_at', { ascending: false }), 5000)
        ]);

        const getData = (index: number) => {
            const res = results[index];
            return res.status === 'fulfilled' && res.value && res.value.data ? res.value.data : null;
        };

        if (getData(0)) try { leads = getData(0).map((d: any) => this.mapLead(d)); } catch(e) {}
        if (getData(1)) try { ideas = getData(1).map((d: any) => this.mapIdea(d)); } catch(e) {}
        if (getData(2)) try { pitches = getData(2).map((d: any) => this.mapPitch(d)); } catch(e) {}
        if (getData(3)) try { chatHistory = getData(3).map((d: any) => this.mapChat(d)); } catch(e) {}
        if (getData(4)) try { marketingCampaigns = getData(4).map((d: any) => ({
            id: d.id,
            brandDnaId: d.brand_dna_id, // Map Supabase column
            name: d.name || 'Kampanj',
            brief: d.brief || {},
            selectedIdea: d.selected_idea || {},
            assets: d.assets || [],
            dateCreated: d.created_at
        })); } catch(e) {}
        
        const dnaResult = results[5];
        if (dnaResult.status === 'fulfilled' && dnaResult.value && dnaResult.value.data) {
             // Map list of DNAs
             brandDNAs = dnaResult.value.data.map((row: any) => row.data); 
        }

        if (getData(6)) try { reports = getData(6).map((d: any) => ({ id: d.id, title: d.title, reportData: d.report_data, created_at: d.created_at })); } catch(e) {}
        
        if (getData(7)) try {
            sessions = getData(7).map((d: any) => ({
                id: d.id,
                name: d.name,
                group: d.group_name || 'Allmänt',
                lastMessageAt: d.last_message_at ? new Date(d.last_message_at).getTime() : Date.now(),
                preview: d.preview
            }));
        } catch(e) {}
    }

    // Local Storage Merge
    const localLeads = JSON.parse(localStorage.getItem(getLocalKey('leads', userId)) || '[]');
    const localIdeas = JSON.parse(localStorage.getItem(getLocalKey('ideas', userId)) || '[]');
    const localPitches = JSON.parse(localStorage.getItem(getLocalKey('pitches', userId)) || '[]');
    const localChat = JSON.parse(localStorage.getItem(getLocalKey('chat_messages', userId)) || '[]');
    const localCoaches = JSON.parse(localStorage.getItem(getLocalKey('coaches', userId)) || '[]');
    const localSessions = JSON.parse(localStorage.getItem(getLocalKey('chat_sessions', userId)) || '[]');
    const localNotifs = JSON.parse(localStorage.getItem(getLocalKey('notifications', userId)) || '[]');
    const localInvoices = JSON.parse(localStorage.getItem(getLocalKey('invoices', userId)) || '[]');
    const localCampaigns = JSON.parse(localStorage.getItem(getLocalKey('marketing_campaigns', userId)) || '[]');
    
    // UPDATED: Handle Array of DNAs in Local Storage
    const localDNAs = JSON.parse(localStorage.getItem(getLocalKey('brand_dnas', userId)) || '[]');
    
    const localReports = JSON.parse(localStorage.getItem(getLocalKey('company_reports', userId)) || '[]');
    const localSettings = JSON.parse(localStorage.getItem(getLocalKey('settings', userId)) || 'null');

    const merge = (remote: any[], local: any[]) => {
        const remoteIds = new Set(remote.map(i => i.id));
        const localOnly = local.filter(i => !remoteIds.has(i.id));
        return [...localOnly, ...remote];
    };
    
    const finalSettings = localSettings || {
        notifications: { email: true, push: true, marketing: false },
        privacy: { publicProfile: false, dataSharing: false }
    };

    return { 
        leads: merge(leads, localLeads),
        ideas: merge(ideas, localIdeas),
        pitches: merge(pitches, localPitches),
        chatHistory: merge(chatHistory, localChat),
        coaches: localCoaches,
        sessions: merge(sessions, localSessions),
        notifications: localNotifs,
        invoices: localInvoices,
        settings: finalSettings,
        marketingCampaigns: merge(marketingCampaigns, localCampaigns),
        brandDNAs: merge(brandDNAs, localDNAs), // Return merged DNA array
        reports: merge(reports, localReports)
    };
  }

  // --- Leads ---
  async addLead(userId: string, leadData: Omit<Lead, 'id' | 'dateAdded'>): Promise<Lead> {
    const newLead: Lead = {
      id: this.generateId(),
      dateAdded: new Date().toISOString(),
      ...leadData,
      value: Number(leadData.value) || 0
    };

    this.saveLocal('leads', userId, newLead);

    if (!userId.startsWith('local-')) {
      this.safeSupabaseCall(supabase.from('leads').insert({
        id: newLead.id,
        user_id: userId,
        name: newLead.name,
        company: newLead.company,
        email: newLead.email,
        phone: newLead.phone,
        status: newLead.status,
        value: newLead.value,
        notes: newLead.notes,
        created_at: newLead.dateAdded
      })).catch(console.error);
    }
    return newLead;
  }

  async updateLead(userId: string, leadId: string, updates: Partial<Lead>): Promise<void> {
    // Local Update
    const key = getLocalKey('leads', userId);
    const leads = JSON.parse(localStorage.getItem(key) || '[]');
    const index = leads.findIndex((l: any) => l.id === leadId);
    if (index >= 0) {
      leads[index] = { ...leads[index], ...updates };
      localStorage.setItem(key, JSON.stringify(leads));
    }

    if (!userId.startsWith('local-')) {
        const updatePayload: any = {};
        if (updates.name) updatePayload.name = updates.name;
        if (updates.company) updatePayload.company = updates.company;
        if (updates.email) updatePayload.email = updates.email;
        if (updates.status) updatePayload.status = updates.status;
        if (updates.value !== undefined) updatePayload.value = updates.value;
        if (updates.notes) updatePayload.notes = updates.notes;

        if (Object.keys(updatePayload).length > 0) {
            this.safeSupabaseCall(supabase.from('leads').update(updatePayload).eq('id', leadId).eq('user_id', userId)).catch(console.error);
        }
    }
  }

  async deleteLead(userId: string, leadId: string): Promise<void> {
    const key = getLocalKey('leads', userId);
    const leads = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = leads.filter((l: any) => l.id !== leadId);
    localStorage.setItem(key, JSON.stringify(filtered));

    if (!userId.startsWith('local-')) {
      this.safeSupabaseCall(supabase.from('leads').delete().eq('id', leadId).eq('user_id', userId)).catch(console.error);
    }
  }

  // --- Chat Sessions & Messages ---

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const data = await this.getUserData(userId);
    let session = data.sessions.find(s => s.name === 'UF-läraren');
    
    if (!session) {
        session = {
            id: this.generateId(),
            name: 'UF-läraren',
            group: 'System',
            lastMessageAt: Date.now(),
            preview: 'Starta konversationen...'
        };
        this.saveLocal('chat_sessions', userId, session);
        
        if (!userId.startsWith('local-')) {
             this.safeSupabaseCall(supabase.from('chat_sessions').insert({
                 id: session.id,
                 user_id: userId,
                 name: session.name,
                 group_name: session.group,
                 last_message_at: new Date(session.lastMessageAt).toISOString(),
                 preview: session.preview
             })).catch(console.error);
        }
    }
    return session;
  }

  async createChatSession(userId: string, name: string): Promise<ChatSession> {
      const session: ChatSession = {
          id: this.generateId(),
          name,
          lastMessageAt: Date.now(),
          group: 'Allmänt'
      };
      this.saveLocal('chat_sessions', userId, session);

      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('chat_sessions').insert({
              id: session.id,
              user_id: userId,
              name: session.name,
              group_name: session.group,
              last_message_at: new Date(session.lastMessageAt).toISOString()
          })).catch(console.error);
      }
      return session;
  }

  async deleteChatSession(userId: string, sessionId: string): Promise<void> {
      const key = getLocalKey('chat_sessions', userId);
      const sessions = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = sessions.filter((s: any) => s.id !== sessionId);
      localStorage.setItem(key, JSON.stringify(filtered));

      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId)).catch(console.error);
      }
  }

  async renameChatSession(userId: string, sessionId: string, newName: string): Promise<void> {
      await this.updateChatSession(userId, sessionId, { name: newName });
  }

  async updateChatSession(userId: string, sessionId: string, updates: Partial<ChatSession>): Promise<void> {
      const key = getLocalKey('chat_sessions', userId);
      const sessions = JSON.parse(localStorage.getItem(key) || '[]');
      const index = sessions.findIndex((s: any) => s.id === sessionId);
      if (index >= 0) {
          sessions[index] = { ...sessions[index], ...updates };
          localStorage.setItem(key, JSON.stringify(sessions));
      }

      if (!userId.startsWith('local-')) {
          const payload: any = {};
          if (updates.name) payload.name = updates.name;
          if (updates.lastMessageAt) payload.last_message_at = new Date(updates.lastMessageAt).toISOString();
          if (updates.preview) payload.preview = updates.preview;
          
          if (Object.keys(payload).length > 0) {
              this.safeSupabaseCall(supabase.from('chat_sessions').update(payload).eq('id', sessionId).eq('user_id', userId)).catch(console.error);
          }
      }
      
      // Dispatch event for cross-component sync
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aceverse:chat-update', { detail: { sessionId } }));
      }
  }

  async addMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
      const msg: ChatMessage = {
          id: this.generateId(),
          timestamp: Date.now(),
          ...message
      };
      
      // Save local
      this.saveLocal('chat_messages', userId, msg);

      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('chat_messages').insert({
              id: msg.id,
              user_id: userId,
              session_id: msg.sessionId,
              role: msg.role,
              text: msg.text,
              created_at: new Date(msg.timestamp).toISOString(),
              sources: msg.sources // Assuming JSONB column in Supabase
          })).catch(console.error);
      }
      
      return msg;
  }

  // --- Ideas ---

  async addIdea(userId: string, ideaData: Omit<Idea, 'id' | 'dateCreated'>): Promise<Idea> {
      const idea: Idea = {
          id: this.generateId(),
          dateCreated: new Date().toISOString(),
          ...ideaData
      };
      this.saveLocal('ideas', userId, idea);

      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('ideas').insert({
              id: idea.id,
              user_id: userId,
              title: idea.title,
              description: idea.description,
              score: idea.score,
              created_at: idea.dateCreated,
              chat_session_id: idea.chatSessionId
          })).catch(console.error);
      }
      return idea;
  }

  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>): Promise<void> {
      const key = getLocalKey('ideas', userId);
      const ideas = JSON.parse(localStorage.getItem(key) || '[]');
      const index = ideas.findIndex((i: any) => i.id === ideaId);
      if (index >= 0) {
          ideas[index] = { ...ideas[index], ...updates };
          localStorage.setItem(key, JSON.stringify(ideas));
      }

      if (!userId.startsWith('local-')) {
          const payload: any = {};
          if (updates.nodes) payload.nodes = updates.nodes; // JSONB
          
          if (Object.keys(payload).length > 0) {
              this.safeSupabaseCall(supabase.from('ideas').update(payload).eq('id', ideaId).eq('user_id', userId)).catch(console.error);
          }
      }
  }

  // --- Pitches ---

  async addPitch(userId: string, pitchData: Omit<Pitch, 'id' | 'dateCreated'>): Promise<Pitch> {
      const pitch: Pitch = {
          id: this.generateId(),
          dateCreated: new Date().toISOString(),
          ...pitchData
      };
      this.saveLocal('pitches', userId, pitch);

      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('pitches').insert({
              id: pitch.id,
              user_id: userId,
              type: pitch.type,
              name: pitch.name,
              content: pitch.content,
              created_at: pitch.dateCreated
          })).catch(console.error);
      }
      return pitch;
  }

  // --- Coaches ---

  async addCoach(userId: string, coachData: Omit<Coach, 'id'>): Promise<Coach> {
      const coach: Coach = {
          id: this.generateId(),
          ...coachData,
          isCustom: true
      };
      this.saveLocal('coaches', userId, coach);
      
      // Coaches might not have a table in DB in this version, assuming local persistence mainly for custom ones
      // or if there is a table:
      if (!userId.startsWith('local-')) {
           this.safeSupabaseCall(supabase.from('coaches').insert({
               id: coach.id,
               user_id: userId,
               name: coach.name,
               role: coach.role,
               personality: coach.personality,
               instructions: coach.instructions,
               skills: coach.skills,
               avatar_seed: coach.avatarSeed
           })).catch(e => console.warn("Supabase coach sync skipped", e));
      }
      return coach;
  }

  async addMarketingCampaign(userId: string, campaign: MarketingCampaign): Promise<MarketingCampaign> {
      this.saveLocal('marketing_campaigns', userId, campaign);
      
      if (!userId.startsWith('local-')) {
          this.safeSupabaseCall(supabase.from('marketing_campaigns').insert({ 
              id: campaign.id, 
              user_id: userId, 
              brand_dna_id: campaign.brandDnaId, // Add column
              name: campaign.name, 
              brief: campaign.brief,
              selected_idea: campaign.selectedIdea,
              assets: campaign.assets, 
              created_at: campaign.dateCreated 
          })).catch(console.error);
      }
      return campaign;
  }

  // UPDATED: Save to ARRAY list (History support)
  async addBrandDNA(userId: string, dna: BrandDNA): Promise<void> {
      this.saveLocal('brand_dnas', userId, dna);
      
      if (!userId.startsWith('local-')) {
          // Assuming a 'brand_dna' table where we insert rows
          this.safeSupabaseCall(supabase.from('brand_dna').insert({ 
              id: dna.id,
              user_id: userId, 
              data: dna,
              created_at: dna.meta.generatedAt 
          })).catch(console.error);
      }
  }

  // Kept for backward compatibility but modified to create new entry
  async saveBrandDNA(userId: string, dna: BrandDNA): Promise<void> {
      return this.addBrandDNA(userId, dna);
  }

  // --- Settings & Privacy ---

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
      const key = getLocalKey('settings', userId);
      localStorage.setItem(key, JSON.stringify(settings));

      if (!userId.startsWith('local-')) {
          // Assuming user table has settings column or dedicated settings table
          // Usually settings are on auth.users meta or separate table. 
          // For simplicity here, sticking to local-first + maybe metadata update if supported
          this.safeSupabaseCall(supabase.auth.updateUser({
              data: { settings: settings }
          })).catch(console.error);
      }
  }

  async exportUserData(userId: string): Promise<Blob> {
      const data = await this.getUserData(userId);
      const json = JSON.stringify(data, null, 2);
      return new Blob([json], { type: 'application/json' });
  }

  async deleteAccount(userId: string): Promise<void> {
      // Local Wipe
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`aceverse_${userId}`)) {
              localStorage.removeItem(key);
          }
      });
      localStorage.removeItem(SESSION_KEY);

      if (!userId.startsWith('local-')) {
          // Supabase delete user (requires admin usually, or self-delete via RPC)
          // Here we assume client-side delete of data rows first
          await Promise.all([
              supabase.from('leads').delete().eq('user_id', userId),
              supabase.from('ideas').delete().eq('user_id', userId),
              supabase.from('pitches').delete().eq('user_id', userId),
              supabase.from('chat_messages').delete().eq('user_id', userId),
              supabase.from('marketing_campaigns').delete().eq('user_id', userId),
              supabase.from('company_reports').delete().eq('user_id', userId),
              supabase.from('chat_sessions').delete().eq('user_id', userId),
              supabase.from('brand_dna').delete().eq('user_id', userId)
          ]);
          // Note: Actual Auth user deletion often requires service role or edge function in Supabase
          // For now, we sign out and clear data.
          await supabase.auth.signOut();
      }
  }

  // --- Contact ---

  async submitContactRequest(request: ContactRequest): Promise<void> {
      // We can store this in a 'contact_requests' table in Supabase if we want
      // or just log it locally if offline.
      
      const reqWithId = { ...request, id: this.generateId(), created_at: new Date().toISOString() };
      
      // Store in a global local key for admin debug or retry
      const key = 'aceverse_pending_contact_requests';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([...existing, reqWithId]));

      try {
          await this.safeSupabaseCall(supabase.from('contact_requests').insert({
              name: request.name,
              email: request.email,
              subject: request.subject,
              message: request.message
          }));
      } catch (e) {
          console.warn("Could not save contact request to DB, stored locally.");
      }
  }

  // --- Other Methods (Keeping them for completeness) ---
  
  async search(userId: string, query: string): Promise<SearchResult[]> {
    const data = await this.getUserData(userId);
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    data.leads.forEach(l => {
        if (l.name.toLowerCase().includes(lowerQuery) || l.company.toLowerCase().includes(lowerQuery)) {
            results.push({ id: l.id, type: 'lead', title: l.name, subtitle: l.company, view: 'crm' });
        }
    });
    
    // Add other searches...
    return results;
  }

  private saveLocal(table: string, userId: string, item: any) {
    const key = getLocalKey(table, userId);
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    if (item.id) {
        const existingIndex = current.findIndex((i: any) => i.id === item.id);
        if (existingIndex >= 0) {
            current[existingIndex] = item;
            localStorage.setItem(key, JSON.stringify(current));
            return;
        }
    }
    localStorage.setItem(key, JSON.stringify([item, ...current]));
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private mapLead(data: any): Lead { return { ...data, value: Number(data.value) || 0 }; } // Simplified mapping for brevity
  private mapIdea(data: any): Idea { return { ...data }; }
  private mapPitch(data: any): Pitch { return { ...data }; }
  private mapChat(data: any): ChatMessage { return { ...data }; }
  private mapCampaign(data: any): MarketingCampaign { return { ...data }; } // Placeholder
  
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
      avatar: metadata.avatar_url,
      onboardingCompleted: metadata.onboarding_completed ?? false,
      plan: metadata.plan || 'free',
      companyReport: metadata.company_report
    };
  }
}

export const db = new DatabaseService();
