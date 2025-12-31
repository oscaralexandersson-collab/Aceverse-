
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  ContactRequest, UserSettings, CompanyReport, CompanyReportEntry,
  BrandDNA, MarketingCampaign
} from '../types';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

class DatabaseService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile && session.user) {
        const firstName = session.user.user_metadata?.first_name || 
                        session.user.user_metadata?.full_name?.split(' ')[0] || 
                        'Entreprenör';
        const lastName = session.user.user_metadata?.last_name || 
                       session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                       '';

        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ 
            id: session.user.id, 
            first_name: firstName,
            last_name: lastName,
            email: session.user.email,
            onboarding_completed: false
          }])
          .select()
          .maybeSingle();
        
        await supabase.from('user_settings').insert([{ id: session.user.id }]).maybeSingle();
        
        return {
          id: session.user.id,
          email: session.user.email!,
          firstName: firstName,
          lastName: lastName,
          company: '',
          onboardingCompleted: false,
          plan: 'free',
          createdAt: session.user.created_at
        };
      }

      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email || session.user.email!,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        company: profile.company || '',
        bio: profile.bio || '',
        onboardingCompleted: profile.onboarding_completed || false,
        plan: profile.plan || 'free',
        createdAt: session.user.created_at,
        avatar: profile.avatar,
        companyReport: profile.company_report
      };
    } catch (e) {
      console.error("Critical error in getCurrentUser", e);
      return null;
    }
  }

  async login(email: string, pass: string, rememberMe = true): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            throw new Error("Fel e-post eller lösenord.");
        }
        throw error;
    }
    if (!data.user) throw new Error("Inloggning misslyckades.");
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Kunde inte hämta profil.");
    return user;
  }

  async loginWithOAuth(provider: 'google' | 'apple') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  }

  async signup(email: string, pass: string, firstName: string, lastName: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { 
        data: { 
          first_name: firstName, 
          last_name: lastName, 
          full_name: `${firstName} ${lastName}`
        } 
      }
    });
    if (error) throw error;
    if (data.user && data.session === null) {
      throw new Error('CONFIRM_EMAIL');
    }
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Registrering lyckades men profil kunde inte initieras.");
    return user;
  }

  async logout() {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.warn("Supabase signOut error", e);
    } finally {
        localStorage.removeItem('aceverse-auth-token');
    }
  }

  async completeOnboarding(userId: string, data: any) {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        company: data.company, 
        onboarding_completed: true 
      })
      .eq('id', userId);
    
    if (error) throw error;
    return await this.getCurrentUser();
  }

  async updateProfile(userId: string, updates: any) {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        company: updates.company,
        bio: updates.bio,
        company_report: updates.companyReport,
        avatar: updates.avatar
      })
      .eq('id', userId);
    if (error) throw error;
  }

  async deleteAccount(userId: string) {
    const { error } = await supabase.rpc('delete_user_data', { user_id_param: userId });
    if (error) throw error;
    await this.logout();
  }

  async exportUserData(userId: string): Promise<Blob> {
    const data = await this.getUserData(userId);
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  // Updated to fetch marketing campaigns and map DNA/campaign data correctly
  async getUserData(userId: string): Promise<UserData> {
    try {
      const [leads, ideas, pitches, messages, sessions, settings, profile, reports, brandDNAs, campaigns] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('chat_messages').select('*').eq('user_id', userId),
        supabase.from('chat_sessions').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('company_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('brand_dnas').select('*').eq('user_id', userId),
        supabase.from('marketing_campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      return {
        profile: profile?.data || {},
        leads: leads.data || [],
        ideas: ideas.data || [],
        pitches: pitches.data || [],
        chatHistory: messages.data || [],
        sessions: sessions.data || [],
        settings: settings.data || undefined,
        reports: (reports.data || []).map(r => ({ 
          id: r.id, 
          user_id: r.user_id, 
          title: r.title, 
          reportData: r.report_data, 
          created_at: r.created_at 
        })),
        brandDNAs: (brandDNAs.data || []).map(b => b.dna_data || b),
        marketingCampaigns: (campaigns.data || []).map(c => c.campaign_data || c),
      };
    } catch (e) {
      console.error("Error fetching all user data", e);
      return { profile: {}, leads: [], ideas: [], pitches: [], chatHistory: [], sessions: [] };
    }
  }

  // --- LEADS ---
  async addLead(userId: string, lead: Partial<Lead>) {
    const { data, error } = await supabase
      .from('leads')
      .insert([{ 
        user_id: userId,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        linkedin: lead.linkedin,
        website: lead.website,
        notes: lead.notes,
        status: lead.status || 'Nya',
        priority: lead.priority || 'Medium',
        value: lead.value || 0,
        lead_score: lead.lead_score || 0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateLead(userId: string, leadId: string, updates: Partial<Lead>) {
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteLead(userId: string, leadId: string) {
    const { error } = await supabase.from('leads').delete().eq('id', leadId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- CHAT ---
  async createChatSession(userId: string, name: string, group = 'Default'): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: userId, name, session_group: group }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async addMessage(userId: string, msg: Partial<ChatMessage>) {
    if (!msg.session_id) throw new Error("Session ID saknas.");
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ 
        user_id: userId,
        session_id: msg.session_id,
        role: msg.role,
        text: msg.text,
        timestamp: Date.now(),
        sources: msg.sources || []
      }])
      .select()
      .single();
    if (error) throw error;
    
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: Date.now() })
      .eq('id', msg.session_id);

    return data;
  }

  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_group', 'System')
      .maybeSingle();
    if (data) return data;
    return this.createChatSession(userId, 'UF-läraren', 'System');
  }

  async deleteChatSession(userId: string, sessionId: string) {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- IDEAS ---
  async addIdea(userId: string, idea: Partial<Idea>) {
    const { data, error } = await supabase
      .from('ideas')
      .insert([{ 
        user_id: userId,
        title: idea.title,
        description: idea.description,
        score: idea.score || 0,
        current_phase: idea.current_phase || '1',
        chat_session_id: idea.chat_session_id,
        snapshot: idea.snapshot || {},
        nodes: idea.nodes || [],
        tasks: idea.tasks || []
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>) {
    const { error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', ideaId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteIdea(userId: string, ideaId: string) {
    const { error } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- PITCHES ---
  async addPitch(userId: string, pitch: Partial<Pitch>) {
    const { data, error } = await supabase
      .from('pitches')
      .insert([{ 
        user_id: userId,
        name: pitch.name,
        pitch_type: pitch.pitch_type,
        content: pitch.content,
        chat_session_id: pitch.chat_session_id,
        context_score: pitch.context_score || 0
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deletePitch(userId: string, pitchId: string) {
    const { error } = await supabase.from('pitches').delete().eq('id', pitchId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- REPORTS ---
  async addReportToHistory(userId: string, reportData: CompanyReport): Promise<CompanyReportEntry> {
    const { data, error } = await supabase
      .from('company_reports')
      .insert([{ 
        user_id: userId, 
        title: reportData.meta.companyName, 
        report_data: reportData 
      }])
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      reportData: data.report_data,
      created_at: data.created_at
    };
  }

  async deleteReport(userId: string, reportId: string) {
    const { error } = await supabase.from('company_reports').delete().eq('id', reportId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- BRAND DNA ---
  // Added methods for BrandDNA management for Marketing Engine
  async addBrandDNA(userId: string, dna: BrandDNA) {
    const { error } = await supabase
      .from('brand_dnas')
      .insert([{ 
        id: dna.id,
        user_id: userId,
        brand_name: dna.meta.brandName,
        site_url: dna.meta.siteUrl,
        dna_data: dna,
        generated_at: dna.meta.generatedAt
      }]);
    if (error) throw error;
  }

  async deleteBrandDNA(userId: string, dnaId: string) {
    const { error } = await supabase.from('brand_dnas').delete().eq('id', dnaId).eq('user_id', userId);
    if (error) throw error;
  }

  // --- MARKETING CAMPAIGNS ---
  // Added methods for MarketingCampaign management for Marketing Engine
  async addMarketingCampaign(userId: string, campaign: MarketingCampaign) {
    const { error } = await supabase
      .from('marketing_campaigns')
      .insert([{
        id: campaign.id,
        user_id: userId,
        brand_dna_id: campaign.brandDnaId,
        name: campaign.name,
        campaign_data: campaign,
        created_at: campaign.dateCreated
      }]);
    if (error) throw error;
  }

  async deleteMarketingCampaign(userId: string, campaignId: string) {
    const { error } = await supabase.from('marketing_campaigns').delete().eq('id', campaignId).eq('user_id', userId);
    if (error) throw error;
  }

  async saveSettings(userId: string, settings: UserSettings) {
    const { error } = await supabase
      .from('user_settings')
      .upsert([{ id: userId, ...settings }]);
    if (error) throw error;
  }

  async submitContactRequest(req: ContactRequest) {
    await supabase.from('contact_requests').insert([req]);
  }

  async createDemoUser(): Promise<User> {
    return this.login('test@aceverse.se', 'password');
  }
}

export const db = new DatabaseService();