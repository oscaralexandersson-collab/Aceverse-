
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, Lightbulb, Users, Mic, MessageSquare, 
  Settings as SettingsIcon, LogOut, Bell, Search, Menu, X, 
  Loader2, Wifi, WifiOff, Moon, Sun, Globe, RefreshCw, AlertTriangle, Calendar,
  Briefcase, ChevronUp, Check, Plus
} from 'lucide-react';
import { DashboardView, User, UfEvent } from '../types';
import { db } from '../services/db';
import Overview from '../components/dashboard/Overview';
import IdeaLab from '../components/dashboard/IdeaLab';
import Advisor from '../components/dashboard/Advisor';
import CRM from '../components/dashboard/CRM';
import PitchStudio from '../components/dashboard/PitchStudio';
import SettingsPage from '../components/dashboard/Settings';
import MarketingEngine from '../components/dashboard/MarketingEngine';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  syncTrigger?: number; 
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, syncTrigger = 0 }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [nextEvent, setNextEvent] = useState<UfEvent | null>(null);
  
  // Workspace / Profile Switching Logic
  const { workspaces, activeWorkspace, viewScope, switchScope, createWorkspace, inviteMember, deleteWorkspace, members } = useWorkspace();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Modals for Workspace
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [wsLoading, setWsLoading] = useState(false);
  const [wsError, setWsError] = useState('');
  
  const [advisorStartPrompt, setAdvisorStartPrompt] = useState<string | null>(null);
  
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Close profile menu on outside click
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
              setIsProfileMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setConnectionError(false);
    try {
      const isHealthy = await db.checkHealth();
      if (!isHealthy) throw new Error("Connection failed");
      
      // Pass strict scope to fetch next event correctly
      const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
      const event = await db.getNextUfEvent(user.id, workspaceId);
      setNextEvent(event);
      
      window.dispatchEvent(new CustomEvent('ace_data_refresh'));
    } catch (error) {
      console.error("Dashboard sync failed", error);
      setConnectionError(true);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, [user.id, viewScope, activeWorkspace?.id]);

  useEffect(() => { refreshData(); }, [syncTrigger, user.id, refreshData]);

  // Listener for data scope change
  useEffect(() => {
      refreshData();
  }, [viewScope, activeWorkspace?.id]);

  const handlePlanEvent = (prompt: string) => {
      setAdvisorStartPrompt(prompt);
      setCurrentView('advisor');
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWsName.trim()) return;
      setWsLoading(true);
      setWsError('');
      try {
          await createWorkspace(newWsName);
          setShowCreateWsModal(false);
          setNewWsName('');
      } catch (err: any) {
          setWsError(err.message || 'Kunde inte skapa team.');
      } finally {
          setWsLoading(false);
      }
  };

  const handleDeleteWorkspace = async () => {
      if (!activeWorkspace) return;
      if (confirm(`Är du säker på att du vill radera teamet "${activeWorkspace.name}" permanent? Detta kan inte ångras och all data kopplad till teamet kommer att raderas.`)) {
          try {
              setWsLoading(true);
              await deleteWorkspace(activeWorkspace.id);
              setShowTeamModal(false);
          } catch (err: any) {
              setWsError(err.message || 'Kunde inte radera team.');
          } finally {
              setWsLoading(false);
          }
      }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail.trim()) return;
      setWsLoading(true);
      setWsError('');
      try {
          await inviteMember(inviteEmail);
          setInviteEmail('');
          alert('Inbjudan skickad/användare tillagd!');
      } catch (err: any) {
          setWsError(err.message || 'Kunde inte bjuda in.');
      } finally {
          setWsLoading(false);
      }
  };

  // Removed Settings from here to manually place it at bottom
  const menuItems: { id: DashboardView; label: string; icon: any }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { id: 'ideas', label: t('dashboard.ideas'), icon: Lightbulb },
    { id: 'advisor', label: t('dashboard.advisor'), icon: MessageSquare },
    { id: 'marketing', label: "Marketing Engine", icon: Globe },
    { id: 'crm', label: t('dashboard.crm'), icon: Users },
    { id: 'pitch', label: t('dashboard.pitch'), icon: Mic },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      
      {/* --- CREATE WORKSPACE MODAL --- */}
      {showCreateWsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                  <button onClick={() => setShowCreateWsModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                  <h2 className="font-serif-display text-2xl mb-4 text-gray-900 dark:text-white">Starta nytt Team</h2>
                  <p className="text-sm text-gray-500 mb-6">Skapa en gemensam arbetsyta för ditt UF-företag.</p>
                  <form onSubmit={handleCreateWorkspace}>
                      <input 
                          autoFocus
                          value={newWsName}
                          onChange={(e) => setNewWsName(e.target.value)}
                          placeholder="Teamets namn (t.ex. EcoWear UF)"
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all mb-4"
                      />
                      {wsError && <p className="text-red-500 text-xs font-bold mb-4">{wsError}</p>}
                      <button 
                          type="submit"
                          disabled={wsLoading || !newWsName.trim()}
                          className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {wsLoading ? <Loader2 className="animate-spin" size={16}/> : 'Skapa Team'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- TEAM SETTINGS MODAL --- */}
      {showTeamModal && activeWorkspace && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <button onClick={() => setShowTeamModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                  <div className="mb-6">
                      <h2 className="font-serif-display text-2xl mb-1 text-gray-900 dark:text-white">{activeWorkspace.name}</h2>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Teamhantering</p>
                  </div>

                  <div className="mb-8">
                      <h3 className="text-sm font-bold mb-3">Bjud in medlem</h3>
                      <form onSubmit={handleInviteMember} className="flex gap-2">
                          <input 
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="E-postadress..."
                              className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-sm dark:text-white border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white transition-all"
                          />
                          <button 
                              type="submit"
                              disabled={wsLoading || !inviteEmail.trim()}
                              className="px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-80 disabled:opacity-50"
                          >
                              {wsLoading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>}
                          </button>
                      </form>
                      {wsError && <p className="text-red-500 text-xs mt-2 font-bold">{wsError}</p>}
                  </div>

                  <div className="flex-1 overflow-y-auto mb-6">
                      <h3 className="text-sm font-bold mb-3">Medlemmar ({members.length})</h3>
                      <div className="space-y-2">
                          {members.map(m => (
                              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 flex items-center justify-center text-xs font-bold text-white">
                                          {m.user?.firstName?.[0] || '?'}
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-gray-900 dark:text-white">{m.user?.firstName} {m.user?.lastName}</p>
                                          <p className="text-xs text-gray-500">{m.user?.email}</p>
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                      {m.role}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Danger Zone */}
                  {activeWorkspace.owner_id === user.id && (
                      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                          <h4 className="text-[10px] font-bold text-red-500 uppercase mb-2 tracking-widest">Farozon</h4>
                          <button 
                              onClick={handleDeleteWorkspace} 
                              disabled={wsLoading}
                              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline font-medium"
                          >
                              {wsLoading ? 'Raderar...' : 'Radera detta team permanent'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-all duration-300 relative`}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="font-serif-display text-xl font-bold dark:text-white">Aceverse</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X size={20} /></button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as DashboardView)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentView === item.id 
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* BOTTOM SECTION */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-auto relative space-y-2">
          
          {/* NEXT EVENT CARD */}
          {nextEvent && (
              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm cursor-default">
                  <div className="flex items-center gap-2 mb-1">
                      <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Nästa Händelse</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{nextEvent.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(nextEvent.date_at).toLocaleDateString()}</p>
              </div>
          )}

          {/* SETTINGS BUTTON */}
          <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentView === 'settings' 
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <SettingsIcon size={18} />
              {t('dashboard.settings')}
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

          {/* Profile / Workspace Switcher Menu */}
          <div className="relative" ref={profileMenuRef}>
            {isProfileMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slideUp z-50 w-full">
                    <div className="p-2 space-y-1">
                        <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profiler</div>
                        <button 
                          onClick={() => { switchScope('personal'); setIsProfileMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewScope === 'personal' ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-200 to-gray-400 flex items-center justify-center text-[10px] text-white font-bold">
                                    {user.firstName[0]}
                                </div>
                                Min Profil
                            </div>
                            {viewScope === 'personal' && <Check size={14} />}
                        </button>

                        <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 flex justify-between items-center">
                            Arbetsytor (Team)
                            <button 
                              onClick={() => { setShowCreateWsModal(true); setIsProfileMenuOpen(false); }}
                              className="text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1 rounded hover:bg-blue-100 transition-colors"
                              title="Skapa nytt team"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        
                        {workspaces.map(ws => (
                            <button 
                              key={ws.id}
                              onClick={() => { switchScope('workspace', ws.id); setIsProfileMenuOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewScope === 'workspace' && activeWorkspace?.id === ws.id ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-6 h-6 rounded-md bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shrink-0">
                                        <Briefcase size={12} />
                                    </div>
                                    <span className="truncate max-w-[100px]">{ws.name}</span>
                                    {ws.memberCount !== undefined && ws.memberCount > 0 && (
                                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded-full">
                                            {ws.memberCount}
                                        </span>
                                    )}
                                </div>
                                {viewScope === 'workspace' && activeWorkspace?.id === ws.id && <Check size={14} />}
                            </button>
                        ))}
                        {workspaces.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-400 italic">Inga team än.</div>
                        )}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <LogOut size={14} /> Logga ut
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Button Trigger */}
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${viewScope === 'workspace' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gradient-to-tr from-gray-200 to-gray-300'}`}>
                  {viewScope === 'workspace' ? <Briefcase size={18} /> : <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`} alt="Avatar" className="w-full h-full rounded-full object-cover" />}
               </div>
               <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                      {viewScope === 'workspace' ? activeWorkspace?.name : `${user.firstName} ${user.lastName}`}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight uppercase tracking-wide font-bold">
                      {viewScope === 'workspace' ? 'Team' : 'Personlig'}
                  </p>
               </div>
               <ChevronUp size={16} className={`text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Scope Banner (Visible when in Team Mode) */}
        {viewScope === 'workspace' && (
            <div className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center w-full z-30 flex justify-center items-center gap-4 relative">
                TEAM LÄGE: {activeWorkspace?.name}
                <button 
                    onClick={() => setShowTeamModal(true)}
                    className="absolute right-4 text-[9px] underline hover:no-underline flex items-center gap-1"
                >
                    <SettingsIcon size={10} /> Hantera Team
                </button>
            </div>
        )}

        {connectionError && (
            <div className="bg-red-500 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2 animate-slideUp z-50">
                <WifiOff size={14} />
                Ingen kontakt med servern. Kontrollera din anslutning.
                <button onClick={refreshData} className="underline hover:opacity-80 ml-2">Försök igen</button>
            </div>
        )}

        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors"><Menu size={24} /></button>}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{currentView === 'crm' ? 'CRM & Leads' : currentView === 'settings' ? t('dashboard.settings') : currentView}</h2>
            
            <button 
                onClick={refreshData} 
                disabled={isSyncing}
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ml-4 px-3 py-1.5 rounded-full transition-all ${
                    connectionError 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : isSyncing 
                        ? 'text-gray-400' 
                        : 'text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
                {isSyncing ? <><RefreshCw size={12} className="animate-spin" /> Synkar...</> : <><RefreshCw size={12} /> Uppdaterad</>}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={() => setLanguage(language === 'sv' ? 'en' : 'sv')} className="p-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                {language}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8 custom-scrollbar relative">
          <div className="max-w-6xl mx-auto h-full">
            {currentView === 'overview' && (
                <Overview 
                    user={user} 
                    setView={setCurrentView} 
                    onPlanEvent={handlePlanEvent} 
                />
            )}
            {currentView === 'ideas' && <IdeaLab user={user} />}
            {currentView === 'advisor' && (
                <Advisor 
                    user={user} 
                    initialPrompt={advisorStartPrompt}
                    onClearPrompt={() => setAdvisorStartPrompt(null)}
                />
            )}
            {currentView === 'marketing' && <MarketingEngine user={user} />}
            {currentView === 'crm' && <CRM user={user} />}
            {currentView === 'pitch' && <PitchStudio user={user} />}
            {currentView === 'settings' && <SettingsPage user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
