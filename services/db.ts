
import { supabase } from './supabase';
import { 
  User, UserData, Lead, ChatMessage, ChatSession, Idea, Pitch, 
  ContactRequest, UserSettings, CompanyReport, CompanyReportEntry,
  BrandDNA, MarketingCampaign, Contact, Deal, SalesEvent, Activity,
  SustainabilityLog, UfEvent, Recommendation, Badge, MailDraftRequest,
  PitchProject, PitchVersion, Workspace, WorkspaceMember, FullReportProject
} from '../types';
import { GoogleGenAI } from "@google/genai";

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
      // 1. Check Auth Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;

      // 2. Try to fetch existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      // 3. If profile exists, map and return it
      if (profile) {
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
      }

      // 4. FALLBACK
      const meta = session.user.user_metadata || {};
      const firstName = meta.first_name || 'Entreprenör';
      const lastName = meta.last_name || '';

      this.healingInsert(session.user.id, session.user.email!, firstName, lastName);

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

    } catch (e) {
      console.error("Critical error in getCurrentUser", e);
      return null;
    }
  }

  private async healingInsert(id: string, email: string, firstName: string, lastName: string) {
      try {
          const { error } = await supabase.from('profiles').insert([{ 
            id, 
            first_name: firstName,
            last_name: lastName,
            email,
            onboarding_completed: false
          }]);
          
          if (!error) {
              await supabase.from('user_settings').insert([{ id }]).maybeSingle();
          }
      } catch (err) {
          console.warn("Healing insert skipped/failed", err);
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
    if (!user) throw new Error("Kunde inte verifiera användarsession.");
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
    
    await new Promise(r => setTimeout(r, 1000));

    const user = await this.getCurrentUser();
    if (!user) {
        return {
            id: data.user!.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            company: '',
            onboardingCompleted: false,
            plan: 'free',
            createdAt: new Date().toISOString()
        };
    }
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
      .upsert({ 
        id: userId,
        company: data.company, 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      });
    
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

  // --- WORKSPACE MANAGEMENT (NEW) ---

  async createWorkspace(userId: string, name: string): Promise<Workspace> {
      console.log("Creating workspace...", { userId, name });
      
      // 1. Create Workspace
      const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .insert([{ name: name, owner_id: userId }])
          .select('*')
          .single();
      
      if (wsError) {
          console.error("Workspace creation error:", wsError);
          const errorMsg = wsError.message || wsError.details || JSON.stringify(wsError);
          throw new Error(`Kunde inte skapa arbetsyta: ${errorMsg}`);
      }

      console.log("Workspace created:", wsData);

      // 2. Add Owner as Admin Member
      const { error: memberError } = await supabase
          .from('workspace_members')
          .insert([{ workspace_id: wsData.id, user_id: userId, role: 'admin' }]);

      if (memberError) {
          console.error("Failed to add owner to workspace, cleaning up...", memberError);
          const errorMsg = memberError.message || memberError.details || JSON.stringify(memberError);
          
          // Attempt rollback
          await supabase.from('workspaces').delete().eq('id', wsData.id);
          throw new Error(`Kunde inte lägga till dig i teamet: ${errorMsg}`);
      }

      return wsData;
  }

  async deleteWorkspace(workspaceId: string) {
      console.log("Starting workspace deletion sequence...", workspaceId);
      
      // 1. Special case: Pitch Versions often depend on Pitch Projects.
      const { data: projects } = await supabase
          .from('pitch_projects')
          .select('id')
          .eq('workspace_id', workspaceId);
      
      if (projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          await supabase.from('pitch_versions').delete().in('project_id', projectIds);
      }

      // 2. Standard cleanup of direct dependents
      const tables = [
          'contacts', 
          'deals', 
          'leads', 
          'ideas', 
          'sales_events', 
          'uf_events', 
          'chat_sessions', 
          'pitch_projects', 
          'brand_dnas', 
          'marketing_campaigns',
          'workspace_members' // Members must be last of the dependents
      ];

      for (const table of tables) {
          try {
              const { error } = await supabase
                  .from(table)
                  .delete()
                  .eq('workspace_id', workspaceId);
              
              if (error) {
                  console.warn(`Warning during cleanup of ${table}:`, error.message);
              } else {
                  console.log(`Cleaned up ${table}`);
              }
          } catch (e) {
              console.warn(`Exception during cleanup of ${table}`, e);
          }
      }

      // 3. Finally, delete the workspace itself
      const { error } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

      if (error) {
          console.error("Delete workspace error:", error);
          throw new Error(`Kunde inte radera teamet. Databasfel: ${error.message}.`);
      }
      
      console.log("Workspace deleted successfully.");
  }

  async inviteMemberByEmail(workspaceId: string, email: string): Promise<void> {
      // 1. Find user by email using Secure RPC (Bypasses RLS)
      const { data, error } = await supabase.rpc('get_user_id_by_email', { email_input: email });
      
      if (error) {
          console.error("RPC Error:", error);
          throw new Error("Kunde inte söka efter användare.");
      }

      // RPC returns an array of objects even for single return in some setups, or just the data.
      // Based on the SQL definition `RETURNS TABLE (id uuid)`, it returns [{ id: ... }]
      if (!data || data.length === 0) {
          throw new Error("Användaren hittades inte. Be personen skapa ett Aceverse-konto först.");
      }

      const targetUserId = data[0].id;

      // 2. Check if already member
      const { data: existing } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', targetUserId)
          .maybeSingle();

      if (existing) throw new Error("Användaren är redan med i teamet.");

      // 3. Add to workspace
      const { error: insertError } = await supabase
          .from('workspace_members')
          .insert([{ workspace_id: workspaceId, user_id: targetUserId, role: 'member' }]);

      if (insertError) throw insertError;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
      const { data, error } = await supabase
          .from('workspace_members')
          .select('*, user:profiles(*)')
          .eq('workspace_id', workspaceId);
      
      if (error) throw error;
      return data || [];
  }

  // --- DATA RECOVERY / REPAIR ---
  async rescueDataToPersonal(userId: string) {
      console.log("Starting data rescue for user:", userId);
      // Set workspace_id to NULL for all items owned by user
      const tables = [
          'contacts', 'deals', 'leads', 'ideas', 
          'sales_events', 'uf_events', 'chat_sessions', 
          'pitch_projects', 'brand_dnas', 'marketing_campaigns'
      ];
      
      for (const table of tables) {
          try {
              const { error } = await supabase
                  .from(table)
                  .update({ workspace_id: null })
                  .eq('user_id', userId);
              
              if (error) {
                  console.error(`Failed to rescue table ${table}:`, error);
              } else {
                  console.log(`Rescued table ${table}`);
              }
          } catch (e) {
              console.error(`Exception rescuing table ${table}:`, e);
          }
      }
  }

  // --- MAIN DATA FETCH ---
  async getUserData(userId: string): Promise<UserData> {
    try {
      // NOTE: RLS handles security. We fetch ALL items the user has access to.
      // The frontend handles filtering between "Personal" and "Team" views.
      
      const [
        leads, contacts, deals, sales, activities, logs, events,
        ideas, pitches, messages, sessions, settings, profile, 
        reports, brandDNAs, campaigns, points, badges, fullReportProjects
      ] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_events').select('*').order('occurred_at', { ascending: false }),
        supabase.from('activities').select('*').order('occurred_at', { ascending: false }),
        supabase.from('sustainability_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('uf_events').select('*').order('date_at', { ascending: true }),
        supabase.from('ideas').select('*').order('created_at', { ascending: false }),
        supabase.from('pitches').select('*').order('created_at', { ascending: false }),
        supabase.from('chat_messages').select('*'), 
        supabase.from('chat_sessions').select('*'),
        supabase.from('user_settings').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('company_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('brand_dnas').select('*'),
        supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('user_points').select('points').eq('user_id', userId),
        supabase.from('user_badges').select('*').eq('user_id', userId),
        supabase.from('full_report_projects').select('*').order('updated_at', { ascending: false }) // New Table for Report Builder
      ]);

      const totalPoints = (points.data || []).reduce((acc, curr) => acc + (curr.points || 0), 0);

      // --- Pitch Engine Data Handling ---
      let pitchProjectsData: any[] = [];
      try {
          const { data, error } = await supabase
            .from('pitch_projects')
            .select('*, versions:pitch_versions(*)')
            .order('created_at', { ascending: false }); 
            
          if (!error && data) {
              pitchProjectsData = data;
          }
      } catch (err) {
          console.warn("Pitch project fetch warning", err);
      }

      const mappedPitchProjects: PitchProject[] = pitchProjectsData.map((p: any) => ({
          ...p,
          versions: (p.versions || []).sort((a: any, b: any) => b.version_number - a.version_number)
      }));

      // Map Full Reports from existing report structure if we decide to reuse 'company_reports' table with a flag, 
      // but for cleaner separation we'll assume a new 'full_report_projects' table exists or use JSON storage in 'company_reports'.
      // For this implementation, let's map from the 'company_reports' table but filter by a specific structure check or type.
      // NOTE: For simplicity in this demo, we will use the 'company_reports' table to store these as well, using report_data.type to distinguish.
      
      const mappedReports = (reports.data || []).map(r => ({ 
          id: r.id, 
          user_id: r.user_id, 
          title: r.title, 
          reportData: r.report_data, 
          created_at: r.created_at,
          workspace_id: r.workspace_id
      }));

      // Filter out the "Intelligence" reports vs "Full Builder" reports if needed in frontend.
      
      // Since we added 'full_report_projects' to the Promise.all, let's use that data if the table exists.
      // If table doesn't exist, we fallback to empty array to avoid crash.
      const mappedFullReports = (fullReportProjects.data || []).map(p => ({
          ...p,
          sections: typeof p.sections === 'string' ? JSON.parse(p.sections) : p.sections,
          financials: typeof p.financials === 'string' ? JSON.parse(p.financials) : p.financials
      }));

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
        pitchProjects: mappedPitchProjects,
        chatHistory: messages.data || [],
        sessions: sessions.data || [],
        settings: settings.data || undefined,
        reports: mappedReports,
        fullReports: mappedFullReports, // NEW
        brandDNAs: (brandDNAs.data || []).map(b => b.dna_data || b),
        marketingCampaigns: (campaigns.data || []).map(c => c.campaign_data || c),
      };
    } catch (e) {
      console.error("Error fetching all user data", e);
      throw e; 
    }
  }

  // --- UPDATED CREATE CHAT SESSION WITH WORKSPACE & VISIBILITY ---
  async createChatSession(userId: string, name: string, group = 'Default', workspaceId?: string | null, visibility: 'private' | 'shared' = 'private'): Promise<ChatSession> {
    const payload: any = { user_id: userId, name, session_group: group, visibility };
    
    // Explicitly handle null for personal workspace
    if (workspaceId) {
        payload.workspace_id = workspaceId;
    } else {
        payload.workspace_id = null;
    }
    
    const { data, error } = await supabase.from('chat_sessions').insert([payload]).select().single();
    if (error) throw error; 
    return data;
  }

  async updateChatSession(userId: string, sessionId: string, name: string) {
    await supabase.from('chat_sessions').update({ name }).eq('id', sessionId);
  }
  async deleteChatSession(userId: string, sessionId: string) {
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
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
    // Default system session is private
    return this.createChatSession(userId, 'UF-läraren', 'System', null, 'private');
  }
  
  // --- IDEA LAB ---
  async addIdea(userId: string, idea: Partial<Idea>) {
    const payload = { user_id: userId, ...idea };
    // ensure workspace_id is explicitly set or null
    if (!payload.workspace_id) payload.workspace_id = null; 
    
    const { data, error } = await supabase.from('ideas').insert([payload]).select().single();
    if (error) throw error; return data;
  }
  async updateIdeaState(userId: string, ideaId: string, updates: Partial<Idea>) {
    await supabase.from('ideas').update(updates).eq('id', ideaId);
  }
  async deleteIdea(userId: string, ideaId: string) {
    await supabase.from('ideas').delete().eq('id', ideaId);
  }

  // --- LEGACY PITCH (Deprecated but kept for types) ---
  async addPitch(userId: string, pitch: Partial<Pitch>) {
    const { data, error } = await supabase.from('pitches').insert([{ user_id: userId, ...pitch }]).select().single();
    if (error) throw error; return data;
  }
  async deletePitch(userId: string, pitchId: string) {
    await supabase.from('pitches').delete().eq('id', pitchId);
  }

  // --- REPORTS ---
  async addReportToHistory(userId: string, reportData: CompanyReport): Promise<CompanyReportEntry> {
    const { data, error } = await supabase.from('company_reports').insert([{ user_id: userId, title: reportData.meta.companyName, report_data: reportData }]).select().single();
    if (error) throw error; return { id: data.id, user_id: data.user_id, title: data.title, reportData: data.report_data, created_at: data.created_at };
  }

  // --- REPORT BUILDER METHODS (NEW) ---
  
  async saveFullReportProject(userId: string, project: Partial<FullReportProject>) {
      const payload = {
          user_id: userId,
          company_name: project.company_name,
          sections: project.sections, // Supabase handles JSON automatically
          financials: project.financials,
          workspace_id: project.workspace_id || null,
          updated_at: new Date().toISOString()
      };

      if (project.id) {
          // Update existing
          const { data, error } = await supabase
              .from('full_report_projects')
              .update(payload)
              .eq('id', project.id)
              .select()
              .single();
          if (error) throw error;
          return data;
      } else {
          // Create new
          const { data, error } = await supabase
              .from('full_report_projects')
              .insert([payload])
              .select()
              .single();
          if (error) throw error;
          return data;
      }
  }

  async deleteFullReportProject(userId: string, projectId: string) {
      const { error } = await supabase.from('full_report_projects').delete().eq('id', projectId);
      if (error) throw error;
  }

  // --- MARKETING ENGINE ---
  async addBrandDNA(userId: string, dna: BrandDNA) {
    const payload = { 
        id: dna.id, 
        user_id: userId, 
        brand_name: dna.meta.brandName, 
        site_url: dna.meta.siteUrl, 
        dna_data: dna, 
        generated_at: dna.meta.generatedAt, 
        workspace_id: dna.workspace_id || null // Add workspace support
    };
    await supabase.from('brand_dnas').insert([payload]);
  }
  async deleteBrandDNA(userId: string, dnaId: string) {
    await supabase.from('brand_dnas').delete().eq('id', dnaId);
  }
  async addMarketingCampaign(userId: string, campaign: MarketingCampaign) {
    const payload = { 
        id: campaign.id, 
        user_id: userId, 
        brand_dna_id: campaign.brandDnaId, 
        name: campaign.name, 
        campaign_data: campaign, 
        created_at: campaign.dateCreated,
        workspace_id: campaign.workspace_id || null // Add workspace support
    };
    await supabase.from('marketing_campaigns').insert([payload]);
  }
  async deleteMarketingCampaign(userId: string, campaignId: string) {
    await supabase.from('marketing_campaigns').delete().eq('id', campaignId);
  }

  // --- CRM / SALES ---
  async addLead(userId: string, lead: Partial<Lead>) {
    // Legacy lead support
    const payload = { user_id: userId, ...lead };
    if (!payload.workspace_id) payload.workspace_id = null;
    const { data, error } = await supabase.from('leads').insert([payload]).select().single();
    if (error) throw error;
    await this.processGamification(userId, 'CREATE_LEAD');
    return data;
  }
  async updateLead(userId: string, leadId: string, updates: Partial<Lead>) {
    await supabase.from('leads').update(updates).eq('id', leadId);
  }
  async deleteLead(userId: string, leadId: string) {
    await supabase.from('leads').delete().eq('id', leadId);
  }
  async saveSettings(userId: string, settings: UserSettings) {
    await supabase.from('user_settings').upsert([{ id: userId, ...settings }]);
  }
  async submitContactRequest(req: ContactRequest) {
    await supabase.from('contact_requests').insert([req]);
  }
  async createDemoUser(): Promise<User> {
    return this.login('test@aceverse.se', 'password');
  }

  // --- PITCH ENGINE 2.0 METHODS ---
  async createPitchProject(userId: string, data: Partial<PitchProject>) {
      const payload = {
          user_id: userId,
          title: data.title,
          target_audience: data.target_audience,
          format: data.format,
          time_limit_seconds: data.time_limit_seconds,
          workspace_id: data.workspace_id || null // Critical fix
      };
      const { data: project, error } = await supabase.from('pitch_projects').insert([payload]).select().single();
      if (error) throw error;
      return project;
  }

  async savePitchVersion(projectId: string, versionNumber: number, transcript: string, analysisData: any) {
      const { data, error } = await supabase.from('pitch_versions').insert([{
          project_id: projectId,
          version_number: versionNumber,
          transcript: transcript,
          analysis_data: analysisData
      }]).select().single();
      if (error) throw error;
      return data;
  }

  async deletePitchProject(userId: string, projectId: string) {
      const { error } = await supabase.from('pitch_projects').delete().eq('id', projectId);
      if (error) throw error;
  }

  async updatePitchProject(userId: string, projectId: string, updates: Partial<PitchProject>) {
      const { error } = await supabase.from('pitch_projects').update(updates).eq('id', projectId);
      if (error) throw error;
  }

  // --- CRM & DASHBOARD ---

  async getNextUfEvent(userId: string, workspaceId?: string | null): Promise<UfEvent | null> {
    const now = new Date().toISOString();
    
    // Base query
    let query = supabase
      .from('uf_events')
      .select('*')
      .gte('date_at', now)
      .order('date_at', { ascending: true })
      .limit(1);

    // Strict Scope Filtering
    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    } else {
        // Personal: Fetch where workspace_id is NULL
        query = query.is('workspace_id', null);
        // Note: We also check user_id for double safety, though RLS handles it
        query = query.eq('user_id', userId); 
    }

    const { data } = await query.maybeSingle();
    return data;
  }

  async getRecommendations(userId: string, workspaceId?: string | null): Promise<Recommendation[]> {
    const recs: Recommendation[] = [];
    const event = await this.getNextUfEvent(userId, workspaceId);
    
    if (event) {
        recs.push({
            id: `rec-evt-${event.id}`,
            kind: 'UF_EVENT',
            title: `Förberedelse: ${event.title}`,
            description: `Det är snart dags för ${event.title}. Har ni koll på allt?`,
            priority: 90,
            ctaLabel: 'Planera',
            ctaAction: () => {} 
        });
    }

    // Filter deals based on scope
    let dealsQuery = supabase.from('deals').select('*');
    
    if (workspaceId) {
        dealsQuery = dealsQuery.eq('workspace_id', workspaceId);
    } else {
        dealsQuery = dealsQuery.is('workspace_id', null).eq('user_id', userId);
    }

    const { data: deals } = await dealsQuery.in('stage', ['QUALIFY', 'PROPOSAL', 'NEGOTIATION']).limit(1);

    if (deals && deals.length > 0) {
        recs.push({
            id: `rec-deal-${deals[0].id}`,
            kind: 'STALE_DEAL',
            title: 'Stäng affären',
            description: `Ni har en öppen möjlighet med ${deals[0].company || 'en kund'}. Följ upp idag.`,
            priority: 85,
            ctaLabel: 'Visa Affär',
            ctaAction: () => {}
        });
    }
    if (recs.length === 0) {
        recs.push({
            id: 'rec-default',
            kind: 'TODAY_FOCUS',
            title: 'Hitta nya kunder',
            description: 'Använd CRM-verktyget för att bygga er pipeline.',
            priority: 50,
            ctaLabel: 'Gå till CRM',
            ctaAction: () => {}
        });
    }
    return recs;
  }

  async addContact(userId: string, contactData: Partial<Contact>) {
    const payload = { user_id: userId, ...contactData };
    if (!payload.workspace_id) payload.workspace_id = null;
    const { error } = await supabase.from('contacts').insert([payload]);
    if (error) throw error;
    await this.processGamification(userId, 'ADD_CONTACT');
  }

  async updateContact(userId: string, contactId: string, contactData: Partial<Contact>) {
    const { error } = await supabase.from('contacts').update(contactData).eq('id', contactId);
    if (error) throw error;
  }

  async addDeal(userId: string, dealData: Partial<Deal>) {
    const payload = { user_id: userId, ...dealData };
    if (!payload.workspace_id) payload.workspace_id = null;
    const { error } = await supabase.from('deals').insert([payload]);
    if (error) throw error;
    await this.processGamification(userId, 'CREATE_DEAL');
  }

  async updateDeal(userId: string, dealId: string, dealData: Partial<Deal>) {
    const { error } = await supabase.from('deals').update(dealData).eq('id', dealId);
    if (error) throw error;
  }

  async logSale(userId: string, saleData: Partial<SalesEvent>) {
    const payload = { user_id: userId, ...saleData, occurred_at: new Date().toISOString() };
    if (!payload.workspace_id) payload.workspace_id = null;
    const { error } = await supabase.from('sales_events').insert([payload]);
    if (error) throw error;
    await this.processGamification(userId, 'LOG_SALE');
  }

  async updateSale(userId: string, saleId: string, saleData: Partial<SalesEvent>) {
    const { error } = await supabase.from('sales_events').update(saleData).eq('id', saleId);
    if (error) throw error;
  }

  async addUfEvent(userId: string, eventData: Partial<UfEvent>) {
    const payload = { user_id: userId, ...eventData };
    if (!payload.workspace_id) payload.workspace_id = null;
    const { error } = await supabase.from('uf_events').insert([payload]);
    if (error) throw error;
  }

  async generateUfStory(userId: string): Promise<string> {
    try {
      const { data: logs } = await supabase.from('sustainability_logs').select('*').eq('user_id', userId);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Skriv en kort, övertygande paragraf för en UF-årsredovisning om företagets hållbarhetsarbete.
      
      Aktiviteter:
      ${(logs || []).map(l => `- ${l.impact_description} (${l.category})`).join('\n')}
      
      Om inga aktiviteter finns, skriv en generell vision om hållbarhet.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      return response.text || "Kunde inte generera text.";
    } catch (e) {
      console.error(e);
      return "Kunde inte generera text just nu.";
    }
  }

  async processGamification(userId: string, action: string) {
    const pointsMap: Record<string, number> = {
      'CREATE_LEAD': 10,
      'ADD_CONTACT': 10,
      'CREATE_DEAL': 20,
      'LOG_SALE': 50,
      'COMPLETE_ONBOARDING': 50
    };
    const points = pointsMap[action] || 5;
    
    // Optimistic log, assume user_points table exists as per getUserData
    await supabase.from('user_points').insert([{ user_id: userId, points, reason: action, created_at: new Date().toISOString() }]);
  }

  // --- AI EMAIL GENERATOR ---
  async generateAiEmail(req: MailDraftRequest): Promise<{subject: string, body: string}> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const systemPrompt = `
            Du är en professionell affärsassistent för ett UF-företag (Ung Företagsamhet) i Sverige.
            Ditt uppdrag är att skriva ett perfekt formulerat mail till en potentiell kund eller partner.
            
            REGLER:
            1. Språk: Svenska (om inte annat anges).
            2. Ton: ${req.tone} (Men alltid professionell och respektfull).
            3. Struktur: Hälsning, Kärnmeddelande (1-2 stycken), Call to Action (CTA), Avslut, Signatur.
            4. Kontext: Använd all given data. Lämna INGA tomma hakparenteser typ [Datum]. Om data saknas, skriv runt det.
            5. Längd: Håll det relevant. Inga långa uppsatser.
            
            MOTTAGARE:
            Namn: ${req.recipient.name}
            Företag: ${req.recipient.company || 'Deras företag'}
            Källa: ${req.recipient.origin}
            Senaste interaktion: ${req.recipient.lastInteraction || 'Ingen'}
            
            AVSÄNDARE:
            Namn: ${req.senderName}
            UF-Företag: ${req.senderCompany}
            
            MAILTYP: ${req.template}
            EXTRA KONTEXT FRÅN ANVÄNDAREN: "${req.extraContext || 'Ingen speciell kontext.'}"
            RELEVANT DATUM/TID: ${req.meetingTime || 'Ingen specifik tid angiven'}

            SPECIALINSTRUKTIONER FÖR TID:
            - Om mailtypen är "Boka möte" (BOOK_MEETING) och en tid är angiven ovan: Föreslå denna tid specifikt i mailet.
            - Om mailtypen är "Tack för möte" (THANK_MEETING) och en tid är angiven ovan: Referera till att ni sågs vid denna tidpunkt/datum.
            
            OUTPUT:
            Returnera ENDAST en JSON-sträng med "subject" och "body". Inget annat prat.
            Exempel: {"subject": "Hej...", "body": "Hej X..."}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Generera mailet nu.",
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json'
            }
        });

        const json = JSON.parse(response.text || '{}');
        return {
            subject: json.subject || "Inget ämne",
            body: json.body || "Kunde inte generera text."
        };

    } catch (e) {
        console.error("Mail Gen Error", e);
        throw new Error("Kunde inte skapa mailet. Försök igen.");
    }
  }
}

export const db = new DatabaseService();
