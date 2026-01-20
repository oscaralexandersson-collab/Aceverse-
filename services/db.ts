
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  ContactRequest, UserSettings, CompanyReport, CompanyReportEntry,
  BrandDNA, MarketingCampaign, Contact, Deal, SalesEvent, Activity,
  SustainabilityLog, UfEvent, Recommendation, Badge, MailDraftRequest,
  PitchProject, PitchVersion, Workspace, WorkspaceMember, FullReportProject, AIMemory, TeamMessage, Notification, Channel
} from '../types';
import { GoogleGenAI } from "@google/genai";

class DatabaseService {
  
  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      return !error || error.code === 'PGRST116'; 
    } catch (e) {
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;

      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      
      if (profileError) console.error("Profile fetch error:", profileError);

      if (profile) {
        return {
          id: profile.id,
          email: profile.email || session.user.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          company: profile.company_name,
          bio: profile.bio,
          avatar: profile.avatar,
          onboardingCompleted: profile.onboarding_completed || false,
          plan: profile.plan || 'free',
          createdAt: profile.created_at
        };
      }
      return null;
    } catch (e) {
      console.error("getCurrentUser error", e);
      return null;
    }
  }

  async login(email: string, pass: string, remember: boolean): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned");
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Profile not found");
    return user;
  }

  async signup(email: string, pass: string, first: string, last: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { first_name: first, last_name: last } }
    });
    if (error) throw error;
    // For email confirmation flows, we might not get a user immediately active
    if (data.user && data.user.identities && data.user.identities.length === 0) {
       throw new Error('CONFIRM_EMAIL');
    }
    const user = await this.getCurrentUser();
    // If auto-confirm is off, user might be null here
    if (!user && data.user) return { id: data.user.id, email, firstName: first, lastName: last, onboardingCompleted: false, plan: 'free', createdAt: new Date().toISOString() }; 
    if (!user) throw new Error("Signup successful but profile creation failed");
    return user;
  }

  async loginWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    await supabase.auth.signInWithOAuth({ provider });
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async createDemoUser(): Promise<User> {
    // For demo purposes, we usually just return a dummy user or log in to a demo account
    // Here we simulate a login
    return {
        id: 'demo-user-123',
        email: 'demo@aceverse.se',
        firstName: 'Demo',
        lastName: 'User',
        company: 'Demo UF',
        onboardingCompleted: true,
        plan: 'pro',
        createdAt: new Date().toISOString()
    };
  }

  // --- DATA FETCHING ---

  async getUserData(userId: string): Promise<UserData> {
    // Helper to fetch data safely
    const fetchTable = async (table: string, uid: string) => {
        const { data } = await supabase.from(table).select('*').eq('user_id', uid);
        return data || [];
    };

    const [contacts, deals, sales, ideas, projects, sessions, msgs, dnas, campaigns, reports, memories, ufEvents, logs] = await Promise.all([
        fetchTable('contacts', userId),
        fetchTable('deals', userId),
        fetchTable('sales_events', userId),
        fetchTable('ideas', userId),
        fetchTable('pitch_projects', userId),
        fetchTable('chat_sessions', userId),
        fetchTable('chat_messages', userId),
        fetchTable('brand_dna', userId),
        fetchTable('marketing_campaigns', userId),
        fetchTable('full_report_projects', userId),
        fetchTable('ai_memories', userId),
        fetchTable('uf_events', userId),
        fetchTable('sustainability_logs', userId)
    ]);

    // Map any naming discrepancies if necessary, assuming types match DB for now or close enough
    return {
        profile: {},
        contacts: contacts as Contact[],
        deals: deals as Deal[],
        salesEvents: sales as SalesEvent[],
        ideas: ideas as Idea[],
        pitchProjects: projects as PitchProject[],
        sessions: sessions as ChatSession[],
        chatHistory: msgs as ChatMessage[],
        brandDNAs: dnas as BrandDNA[],
        marketingCampaigns: campaigns as MarketingCampaign[],
        fullReports: reports as FullReportProject[],
        memories: memories as AIMemory[],
        ufEvents: ufEvents as UfEvent[],
        sustainabilityLogs: logs as SustainabilityLog[],
        activities: [],
        pitches: [],
        points: 450, // Mock points
        badges: [],
        leads: [],
        reports: [], // Legacy reports
        settings: { notifications: {email: true, push: true, marketing: false}, privacy: {publicProfile: false, dataSharing: false} }
    };
  }

  // --- RECOMMENDATIONS ---
  async getRecommendations(userId: string, workspaceId?: string | null): Promise<Recommendation[]> {
      // Mock logic for recommendations based on data
      // In production this would query backend logic
      return [
          { id: '1', title: 'Uppdatera Affärsplan', description: 'Det var 2 veckor sedan du uppdaterade din plan.', kind: 'ACTION', ctaLabel: 'Öppna', ctaAction: () => {} },
          { id: '2', title: 'UF-Mässan', description: 'Anmälan stänger om 5 dagar.', kind: 'UF_EVENT', ctaLabel: 'Planera', ctaAction: () => {} }
      ];
  }

  async getNotifications(userId: string): Promise<Notification[]> {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
      return data as Notification[] || [];
  }

  async markNotificationRead(id: string): Promise<void> {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
  }

  async getNextUfEvent(userId: string, workspaceId?: string | null): Promise<UfEvent | null> {
      let query = supabase.from('uf_events').select('*').eq('user_id', userId).gte('date_at', new Date().toISOString()).order('date_at', { ascending: true }).limit(1);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data } = await query.maybeSingle();
      return data as UfEvent;
  }

  // --- CRM ACTIONS ---
  async updateSale(userId: string, id: string, data: Partial<SalesEvent>) {
      await supabase.from('sales_events').update(data).eq('id', id);
  }
  async logSale(userId: string, data: Partial<SalesEvent>) {
      await supabase.from('sales_events').insert({ ...data, user_id: userId });
  }
  async updateDeal(userId: string, id: string, data: Partial<Deal>) {
      await supabase.from('deals').update(data).eq('id', id);
  }
  async addDeal(userId: string, data: Partial<Deal>) {
      await supabase.from('deals').insert({ ...data, user_id: userId });
  }
  async updateContact(userId: string, id: string, data: Partial<Contact>) {
      await supabase.from('contacts').update(data).eq('id', id);
  }
  async addContact(userId: string, data: Partial<Contact>) {
      await supabase.from('contacts').insert({ ...data, user_id: userId });
  }
  async addUfEvent(userId: string, data: Partial<UfEvent>) {
      await supabase.from('uf_events').insert({ ...data, user_id: userId });
  }

  // --- AI GENERATION (GEMINI) ---
  async generateAiEmail(req: MailDraftRequest): Promise<{subject: string, body: string}> {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Skriv ett e-postutkast.
        Avsändare: ${req.senderName}, ${req.senderCompany}
        Mottagare: ${req.recipient.name}, ${req.recipient.company || ''}
        Typ: ${req.template}
        Ton: ${req.tone}
        Kontext: ${req.extraContext}
        ${req.meetingTime ? `Föreslagen tid: ${req.meetingTime}` : ''}
        
        Returnera endast JSON: { "subject": "...", "body": "..." }
      `;
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text || '{"subject":"", "body":""}');
  }

  async generateUfStory(userId: string): Promise<string> {
      const { data: logs } = await supabase.from('sustainability_logs').select('*').eq('user_id', userId);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Skriv en kort text (max 100 ord) för en UF-årsredovisning om företagets hållbarhetsarbete baserat på dessa loggar: ${JSON.stringify(logs)}`;
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
      });
      return response.text || '';
  }

  // --- CHAT & SESSIONS ---
  async ensureSystemSession(userId: string): Promise<ChatSession> {
      const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).eq('session_group', 'System').limit(1).maybeSingle();
      if (data) return data as ChatSession;
      return this.createChatSession(userId, 'UF-läraren', 'System', null, 'private');
  }

  async createChatSession(userId: string, name: string, group: string, workspaceId: string | null | undefined, visibility: 'private' | 'shared'): Promise<ChatSession> {
      const { data, error } = await supabase.from('chat_sessions').insert({
          user_id: userId,
          name,
          session_group: group,
          workspace_id: workspaceId || null,
          visibility,
          last_message_at: Date.now()
      }).select().single();
      if (error) throw error;
      return data as ChatSession;
  }

  async updateChatSession(userId: string, id: string, name: string) {
      await supabase.from('chat_sessions').update({ name }).eq('id', id);
  }

  async deleteChatSession(userId: string, id: string) {
      await supabase.from('chat_sessions').delete().eq('id', id);
  }

  async addMessage(userId: string, msg: Partial<ChatMessage>): Promise<ChatMessage> {
      const { data, error } = await supabase.from('chat_messages').insert({
          user_id: userId,
          session_id: msg.session_id,
          role: msg.role,
          text: msg.text,
          timestamp: Date.now()
      }).select().single();
      
      if (error) throw error;
      
      // Update session timestamp
      await supabase.from('chat_sessions').update({ last_message_at: Date.now() }).eq('id', msg.session_id);
      
      return data as ChatMessage;
  }

  // --- IDEA LAB ---
  async addIdea(userId: string, idea: Partial<Idea>): Promise<Idea> {
      const { data, error } = await supabase.from('ideas').insert({ ...idea, user_id: userId }).select().single();
      if (error) throw error;
      return data as Idea;
  }
  async updateIdeaState(userId: string, id: string, data: Partial<Idea>) {
      await supabase.from('ideas').update(data).eq('id', id);
  }
  async deleteIdea(userId: string, id: string) {
      await supabase.from('ideas').delete().eq('id', id);
  }

  // --- PITCH STUDIO ---
  async createPitchProject(userId: string, data: Partial<PitchProject>): Promise<PitchProject> {
      const { data: proj, error } = await supabase.from('pitch_projects').insert({ ...data, user_id: userId }).select().single();
      if (error) throw error;
      return proj as PitchProject;
  }
  async savePitchVersion(projectId: string, versionNum: number, transcript: string, analysis: any): Promise<PitchVersion> {
      const { data, error } = await supabase.from('pitch_versions').insert({
          project_id: projectId,
          version_number: versionNum,
          transcript,
          analysis_data: analysis
      }).select().single();
      if (error) throw error;
      return data as PitchVersion;
  }
  async updatePitchProject(userId: string, id: string, data: Partial<PitchProject>) {
      await supabase.from('pitch_projects').update(data).eq('id', id);
  }
  async deletePitchProject(userId: string, id: string) {
      await supabase.from('pitch_projects').delete().eq('id', id);
  }

  // --- SETTINGS ---
  async saveSettings(userId: string, settings: UserSettings) {
      // Assuming settings is a jsonb column in profiles or a separate table
      await supabase.from('profiles').update({ settings }).eq('id', userId);
  }

  async getRecentMemories(userId: string, workspaceId?: string | null): Promise<string> {
      let query = supabase.from('ai_memories').select('content').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data } = await query;
      return data?.map(m => m.content).join('\n') || '';
  }

  async deleteMemory(id: string) {
      await supabase.from('ai_memories').delete().eq('id', id);
  }

  // --- MISC ---
  async submitContactRequest(data: ContactRequest) {
      await supabase.from('contact_requests').insert(data);
  }

  async completeOnboarding(userId: string, data: any): Promise<User | null> {
      await supabase.from('profiles').update({
          company_name: data.company,
          onboarding_completed: true,
          // Store other onboarding fields if needed
      }).eq('id', userId);
      return this.getCurrentUser();
  }

  async addBrandDNA(userId: string, dna: BrandDNA) {
      await supabase.from('brand_dna').insert({ ...dna, user_id: userId });
  }
  async deleteBrandDNA(userId: string, id: string) {
      await supabase.from('brand_dna').delete().eq('id', id);
  }
  async addMarketingCampaign(userId: string, campaign: MarketingCampaign) {
      await supabase.from('marketing_campaigns').insert({ ...campaign, user_id: userId });
  }
  async deleteMarketingCampaign(userId: string, id: string) {
      await supabase.from('marketing_campaigns').delete().eq('id', id);
  }

  // --- WORKSPACE ---
  async createWorkspace(userId: string, name: string): Promise<Workspace> {
      const { data: ws, error } = await supabase.from('workspaces').insert({ name, owner_id: userId }).select().single();
      if (error) throw error;
      // Add owner as admin
      await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: userId, role: 'owner' });
      return ws as Workspace;
  }
  async deleteWorkspace(workspaceId: string) {
      await supabase.from('workspaces').delete().eq('id', workspaceId);
  }
  async inviteMemberByEmail(workspaceId: string, email: string) {
      // In a real app this sends an invite. Here we just add if user exists or mock it
      const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single();
      if (user) {
          await supabase.from('workspace_members').insert({ workspace_id: workspaceId, user_id: user.id, role: 'member' });
      } else {
          // Store invite pending
          await supabase.from('workspace_invites').insert({ workspace_id: workspaceId, email, role: 'member' });
      }
  }

  // --- REPORT BUILDER ---
  async saveFullReportProject(userId: string, project: Partial<FullReportProject>): Promise<FullReportProject> {
      const { data, error } = await supabase.from('full_report_projects').upsert({
          ...project,
          user_id: userId,
          updated_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      return data as FullReportProject;
  }
  async deleteFullReportProject(userId: string, id: string) {
      await supabase.from('full_report_projects').delete().eq('id', id);
  }

  // --- TEAM HUB ---
  async getChannels(workspaceId: string): Promise<Channel[]> {
      const { data } = await supabase.from('channels').select('*').eq('workspace_id', workspaceId).order('created_at');
      return data as Channel[] || [];
  }
  async createChannel(workspaceId: string, name: string): Promise<Channel> {
      const { data, error } = await supabase.from('channels').insert({ workspace_id: workspaceId, name }).select().single();
      if (error) throw error;
      return data as Channel;
  }
  async renameChannel(channelId: string, name: string) {
      await supabase.from('channels').update({ name }).eq('id', channelId);
  }
  async deleteChannel(channelId: string) {
      await supabase.from('channels').delete().eq('id', channelId);
  }
  async getTeamMessages(workspaceId: string, channelId: string): Promise<TeamMessage[]> {
      const { data } = await supabase.from('team_messages')
        .select('*, user:profiles(*)') // Join profile
        .eq('workspace_id', workspaceId)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);
        
      // Map join result
      return (data || []).map((msg: any) => ({
          ...msg,
          user: msg.user ? {
              id: msg.user.id,
              firstName: msg.user.first_name,
              lastName: msg.user.last_name,
              avatar: msg.user.avatar,
              email: msg.user.email,
              plan: 'free', onboardingCompleted: true, createdAt: ''
          } : undefined
      }));
  }
  async sendTeamMessage(workspaceId: string, userId: string, content: string, members: WorkspaceMember[], channelId?: string) {
      const { error } = await supabase.from('team_messages').insert({
          workspace_id: workspaceId,
          channel_id: channelId,
          user_id: userId,
          content
      });
      if (error) throw error;
  }
}

export const db = new DatabaseService();
