
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  ContactRequest, UserSettings, CompanyReport, CompanyReportEntry,
  BrandDNA, MarketingCampaign, Contact, Deal, SalesEvent, Activity,
  SustainabilityLog, UfEvent, Recommendation, Badge
} from '../types';

class DatabaseService {
  // --- CONNECTION HEALTH CHECK ---
  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_settings').select('id').limit(1).maybeSingle();
      return !error;
    } catch (e) {
      return false;
    }
  }

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
        // Auto-provisioning flow
        const firstName = session.user.user_metadata?.first_name || 'Entreprenör';
        const lastName = session.user.user_metadata?.last_name || '';

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

  // --- MAIN DATA FETCH ---
  async getUserData(userId: string): Promise<UserData> {
    try {
      const [
        leads, contacts, deals, sales, activities, logs, events,
        ideas, pitches, messages, sessions, settings, profile, 
        reports, brandDNAs, campaigns, points, badges
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('deals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('sales_events').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }),
        supabase.from('activities').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }),
        supabase.from('sustainability_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('uf_events').select('*').eq('user_id', userId).order('date_at', { ascending: true }),
        supabase.from('ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('pitches').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('chat_messages').select('*').eq('user_id', userId),
        supabase.from('chat_sessions').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('company_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('brand_dnas').select('*').eq('user_id', userId),
        supabase.from('marketing_campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('user_points').select('points').eq('user_id', userId),
        supabase.from('user_badges').select('*').eq('user_id', userId)
      ]);

      const totalPoints = (points.data || []).reduce((acc, curr) => acc + (curr.points || 0), 0);

      return {
        profile: profile?.data || {},
        leads: leads.data || [],
        contacts: contacts.data || [],
        deals: deals.data || [],
        salesEvents: sales.data || [],
        activities: activities.data || [],
        sustainabilityLogs: logs.data || [],
        ufEvents: events.data || [],
        points: totalPoints,
        badges: badges.data || [],
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
      throw e; 
    }
  }

  // --- CRM: CONTACTS ---
  async addContact(userId: string, contact: Partial<Contact>) {
    const { data, error } = await supabase.from('contacts').insert([{ user_id: userId, ...contact }]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'CREATE_CONTACT');
    return data;
  }

  async updateContact(userId: string, id: string, updates: Partial<Contact>) {
    const { error } = await supabase.from('contacts').update(updates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async deleteContact(userId: string, id: string) {
    await supabase.from('contacts').delete().eq('id', id).eq('user_id', userId);
  }

  // --- CRM: DEALS ---
  async addDeal(userId: string, deal: Partial<Deal>) {
    const { data, error } = await supabase.from('deals').insert([{ user_id: userId, ...deal }]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'CREATE_DEAL');
    return data;
  }

  async updateDeal(userId: string, id: string, updates: Partial<Deal>) {
    const { error } = await supabase.from('deals').update(updates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  // --- CRM: SALES ---
  async logSale(userId: string, sale: Partial<SalesEvent>) {
    const { data, error } = await supabase.from('sales_events').insert([{ user_id: userId, ...sale }]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'LOG_SALE');
    return data;
  }

  // --- CRM: ACTIVITIES ---
  async logActivity(userId: string, activity: Partial<Activity>) {
    const { data, error } = await supabase.from('activities').insert([{ user_id: userId, ...activity }]).select().single();
    if (error) throw error;
    return data;
  }

  // --- CRM: SUSTAINABILITY ---
  async logSustainability(userId: string, log: Partial<SustainabilityLog>) {
    const { data, error } = await supabase.from('sustainability_logs').insert([{ user_id: userId, ...log }]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'ADD_SUSTAINABILITY');
    return data;
  }

  // --- CRM: UF EVENTS ---
  async addUfEvent(userId: string, event: Partial<UfEvent>) {
    const { data, error } = await supabase.from('uf_events').insert([{ user_id: userId, ...event }]).select().single();
    if (error) throw error;
    return data;
  }

  // --- GAMIFICATION ENGINE ---
  async processGamification(userId: string, actionType: string) {
    // 1. Award Points
    let points = 0;
    let reason = '';
    switch(actionType) {
        case 'CREATE_CONTACT': points = 2; reason = 'Ny kontakt'; break;
        case 'CREATE_LEAD': points = 5; reason = 'Nytt lead'; break;
        case 'LOG_SALE': points = 10; reason = 'Sälj loggat'; break;
        case 'CREATE_DEAL': points = 5; reason = 'Ny affärsmöjlighet'; break;
        case 'ADD_SUSTAINABILITY': points = 8; reason = 'Hållbart val'; break;
    }
    if (points > 0) {
        await supabase.from('user_points').insert([{ user_id: userId, points, reason }]);
    }

    // 2. Check Badges (Simplified Logic)
    const { count: saleCount } = await supabase.from('sales_events').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const { count: sustCount } = await supabase.from('sustainability_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    if ((saleCount || 0) >= 1) await this.awardBadge(userId, 'FIRST_SALE');
    if ((saleCount || 0) >= 10) await this.awardBadge(userId, 'SALES_MASTER');
    if ((sustCount || 0) >= 3) await this.awardBadge(userId, 'IMPACT_MAKER');
  }

  async awardBadge(userId: string, badgeId: string) {
    // Check if exists
    const { data } = await supabase.from('user_badges').select('id').eq('user_id', userId).eq('badge_id', badgeId).maybeSingle();
    if (!data) {
        await supabase.from('user_badges').insert([{ user_id: userId, badge_id: badgeId }]);
    }
  }

  // --- RECOMMENDATION ENGINE (Simulated Backend) ---
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const recs: Recommendation[] = [];
    const now = new Date();

    // 1. Fetch relevant data
    const { data: deals } = await supabase.from('deals').select('*').eq('user_id', userId).neq('stage', 'WON').neq('stage', 'LOST');
    const { data: ufEvents } = await supabase.from('uf_events').select('*').eq('user_id', userId).gte('date_at', now.toISOString());
    const { data: contacts } = await supabase.from('contacts').select('*').eq('user_id', userId);

    // Rule 1: Stale Deals
    deals?.forEach(deal => {
        const created = new Date(deal.created_at);
        const daysOld = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
        if (daysOld > 7) {
            recs.push({
                id: `stale-${deal.id}`,
                kind: 'STALE_DEAL',
                title: `Följ upp affären: ${deal.title}`,
                description: 'Det har gått mer än 7 dagar sedan den skapades.',
                priority: 80,
                ctaLabel: 'Öppna affär',
                ctaAction: () => {} 
            });
        }
    });

    // Rule 2: UF Deadlines
    ufEvents?.forEach(evt => {
        const evtDate = new Date(evt.date_at);
        const daysLeft = Math.ceil((evtDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (daysLeft <= 14 && daysLeft >= 0) {
            recs.push({
                id: `evt-${evt.id}`,
                kind: 'UF_EVENT',
                title: `Kommande: ${evt.title}`,
                description: `${daysLeft} dagar kvar. Har ni förberett allt?`,
                priority: 95,
                ctaLabel: 'Planera nu',
                ctaAction: () => {}
            });
        }
    });

    // Rule 3: Today Focus (Fallback)
    if (recs.length === 0) {
        recs.push({
            id: 'focus-gen',
            kind: 'TODAY_FOCUS',
            title: 'Hitta nya kunder',
            description: 'Ni har inga akuta ärenden. Passa på att kontakta 3 nya prospekt idag.',
            priority: 50,
            ctaLabel: 'Gå till Kontakter',
            ctaAction: () => {}
        });
    }

    return recs.sort((a, b) => b.priority - a.priority);
  }

  // --- STORYTELLING GENERATOR ---
  async generateUfStory(userId: string): Promise<string> {
    const { data: logs } = await supabase.from('sustainability_logs').select('*').eq('user_id', userId);
    const { data: sales } = await supabase.from('sales_events').select('*').eq('user_id', userId);
    
    if (!logs?.length && !sales?.length) return "För lite data för att generera en berättelse.";

    const totalCo2 = logs?.reduce((acc, l) => acc + (l.saved_co2_approx || 0), 0).toFixed(1);
    const totalSales = sales?.reduce((acc, s) => acc + (s.amount || 0), 0);
    const impactCount = logs?.length || 0;

    return `
      VÅR UF-RESA I SIFFROR:
      Vi har genomfört ${sales?.length} försäljningar vilket genererat ${totalSales} kr i omsättning.
      Men viktigast av allt: Vi har gjort ${impactCount} aktiva hållbarhetsval som sparat ca ${totalCo2} kg CO2.
      Ett konkret exempel: "${logs?.[0]?.impact_description || 'Vi väljer lokalt.'}"
    `;
  }

  // --- LEGACY LEAD SUPPORT ---
  async addLead(userId: string, lead: Partial<Lead>) {
    // Map legacy lead to Contact + Deal if needed, keeping simple for now
    const { data, error } = await supabase.from('leads').insert([{ user_id: userId, ...lead }]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'CREATE_LEAD');
    return data;
  }
  async updateLead(userId: string, leadId: string, updates: Partial<Lead>) {
    await supabase.from('leads').update(updates).eq('id', leadId).eq('user_id', userId);
  }
  async deleteLead(userId: string, leadId: string) {
    await supabase.from('leads').delete().eq('id', leadId).eq('user_id', userId);
  }

  // --- OTHER ---
  async saveSettings(userId: string, settings: UserSettings) {
    await supabase.from('user_settings').upsert([{ id: userId, ...settings }]);
  }
  async submitContactRequest(req: ContactRequest) {
    await supabase.from('contact_requests').insert([req]);
  }
  async createDemoUser(): Promise<User> {
    return this.login('test@aceverse.se', 'password');
  }

  // Standard Chat/Pitch methods...
  async createChatSession(userId: string, name: string, group = 'Default'): Promise<ChatSession> {
    const { data, error } = await supabase.from('chat_sessions').insert([{ user_id: userId, name, session_group: group }]).select().single();
    if (error) throw error; return data;
  }
  async updateChatSession(userId: string, sessionId: string, name: string) {
    await supabase.from('chat_sessions').update({ name }).eq('id', sessionId).eq('user_id', userId);
  }
  async deleteChatSession(userId: string, sessionId: string) {
    await supabase.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  }
  async addMessage(userId: string, msg: Partial<ChatMessage>) {
    const { data, error } = await supabase.from('chat_messages').insert([{ user_id: userId, session_id: msg.session_id, role: msg.role, text: msg.text, timestamp: Date.now() }]).select().single();
    if (error) throw error;
    await supabase.from('chat_sessions').update({ last_message_at: Date.now() }).eq('id', msg.session_id);
    return data;
  }
  async ensureSystemSession(userId: string): Promise<ChatSession> {
    const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).eq('session_group', 'System').maybeSingle();
    if (data) return data;
    return this.createChatSession(userId, 'UF-läraren', 'System');
  }
  async addIdea(userId: string, idea: Partial<Idea>) {
    const { data, error } = await supabase.from('ideas').insert([{ user_id: userId, ...idea }]).select().single();
    if (error) throw error; return data;
  }
  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>) {
    await supabase.from('ideas').update(updates).eq('id', ideaId).eq('user_id', userId);
  }
  async deleteIdea(userId: string, ideaId: string) {
    await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', userId);
  }
  async addPitch(userId: string, pitch: Partial<Pitch>) {
    const { data, error } = await supabase.from('pitches').insert([{ user_id: userId, ...pitch }]).select().single();
    if (error) throw error; return data;
  }
  async deletePitch(userId: string, pitchId: string) {
    await supabase.from('pitches').delete().eq('id', pitchId).eq('user_id', userId);
  }
  async addReportToHistory(userId: string, reportData: CompanyReport): Promise<CompanyReportEntry> {
    const { data, error } = await supabase.from('company_reports').insert([{ user_id: userId, title: reportData.meta.companyName, report_data: reportData }]).select().single();
    if (error) throw error; return { id: data.id, user_id: data.user_id, title: data.title, reportData: data.report_data, created_at: data.created_at };
  }
  async addBrandDNA(userId: string, dna: BrandDNA) {
    await supabase.from('brand_dnas').insert([{ id: dna.id, user_id: userId, brand_name: dna.meta.brandName, site_url: dna.meta.siteUrl, dna_data: dna, generated_at: dna.meta.generatedAt }]);
  }
  async deleteBrandDNA(userId: string, dnaId: string) {
    await supabase.from('brand_dnas').delete().eq('id', dnaId).eq('user_id', userId);
  }
  async addMarketingCampaign(userId: string, campaign: MarketingCampaign) {
    await supabase.from('marketing_campaigns').insert([{ id: campaign.id, user_id: userId, brand_dna_id: campaign.brandDnaId, name: campaign.name, campaign_data: campaign, created_at: campaign.dateCreated }]);
  }
  async deleteMarketingCampaign(userId: string, campaignId: string) {
    await supabase.from('marketing_campaigns').delete().eq('id', campaignId).eq('user_id', userId);
  }
}

export const db = new DatabaseService();
