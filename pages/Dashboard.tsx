
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, Lightbulb, Users, Mic, MessageSquare, 
  Settings as SettingsIcon, LogOut, Bell, Search, Menu, X, 
  Loader2, Wifi, WifiOff, Moon, Sun, Globe, RefreshCw, AlertTriangle, Calendar,
  Briefcase, ChevronUp, Check, Plus, FileText, Video, CheckCircle2
} from 'lucide-react';
import { DashboardView, User, UfEvent, Notification } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import Overview from '../components/dashboard/Overview';
import IdeaLab from '../components/dashboard/IdeaLab';
import Advisor from '../components/dashboard/Advisor';
import CRM from '../components/dashboard/CRM';
import PitchStudio from '../components/dashboard/PitchStudio';
import SettingsPage from '../components/dashboard/Settings';
import MarketingEngine from '../components/dashboard/MarketingEngine';
import ReportBuilder from '../components/dashboard/ReportBuilder';
import TeamHub from '../components/dashboard/TeamHub';
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
  const [activeMetadata, setActiveMetadata] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [nextEvent, setNextEvent] = useState<UfEvent | null>(null);
  
  const { workspaces, activeWorkspace, viewScope, switchScope, createWorkspace, inviteMember, deleteWorkspace, members } = useWorkspace();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [wsLoading, setWsLoading] = useState(false);
  const [wsError, setWsError] = useState('');
  
  const [advisorStartPrompt, setAdvisorStartPrompt] = useState<string | null>(null);
  
  const [incomingCall, setIncomingCall] = useState<{ caller: string, workspaceId: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Mapping for nice Swedish titles
  const viewTitles: Record<string, string> = {
    overview: 'Översikt',
    ideas: 'UF-Kompassen',
    advisor: 'AI-Rådgivare',
    marketing: 'Marketing Hub',
    crm: 'CRM & Sälj',
    pitch: 'Pitch Studio',
    report: 'Report Studio',
    team: 'Team Hub',
    settings: 'Inställningar'
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
              setIsProfileMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 0.5;
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      const channelId = `user-notifications:${user.id}`;
      const notifChannel = supabase.channel(channelId)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
                  const newNotif = payload.new as Notification;
                  setNotifications(prev => [newNotif, ...prev]);
                  if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(e => console.log("Audio play blocked", e)); }
          })
          .subscribe();

      let callChannel: any;
      if (activeWorkspace) {
          const callChannelId = `workspace-calls:${activeWorkspace.id}`;
          callChannel = supabase.channel(callChannelId)
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `workspace_id=eq.${activeWorkspace.id}` }, async (payload) => {
                      if (payload.new.content.includes("Startade ett videosamtal") && payload.new.user_id !== user.id) {
                          const { data } = await supabase.from('profiles').select('first_name').eq('id', payload.new.user_id).single();
                          setIncomingCall({ caller: data?.first_name || 'En kollega', workspaceId: activeWorkspace.id });
                          if (audioRef.current) audioRef.current.play().catch(() => {});
                          setTimeout(() => setIncomingCall(null), 15000);
                      }
              })
              .subscribe();
      }
      db.getNotifications(user.id).then(setNotifications);
      return () => { supabase.removeChannel(notifChannel); if (callChannel) supabase.removeChannel(callChannel); };
  }, [activeWorkspace?.id, user.id]);

  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setConnectionError(false);
    try {
      const isHealthy = await db.checkHealth();
      if (!isHealthy) throw new Error("Connection failed");
      const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
      const event = await db.getNextUfEvent(user.id, workspaceId);
      setNextEvent(event);
      const notifs = await db.getNotifications(user.id);
      setNotifications(notifs);
      window.dispatchEvent(new CustomEvent('ace_data_refresh'));
    } catch (error) { setConnectionError(true); } finally { setTimeout(() => setIsSyncing(false), 800); }
  }, [user.id, viewScope, activeWorkspace?.id]);

  useEffect(() => { refreshData(); }, [syncTrigger, user.id, refreshData]);

  const navigateToView = (view: DashboardView, metadata?: any) => {
      setCurrentView(view);
      setActiveMetadata(metadata || null);
  };

  const handlePlanEvent = (prompt: string) => {
      setAdvisorStartPrompt(prompt);
      setCurrentView('advisor');
  };

  const markRead = async (n: Notification) => {
      if (!n.read) {
          await db.markNotificationRead(n.id);
          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      }
      if (n.link) navigateToView(n.link as DashboardView, n.metadata);
      setShowNotifications(false);
  };

  let menuItems: { id: DashboardView; label: string; icon: any }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { id: 'ideas', label: t('dashboard.ideas'), icon: Lightbulb },
    { id: 'advisor', label: t('dashboard.advisor'), icon: MessageSquare },
    { id: 'marketing', label: "Marketing Hub", icon: Globe },
    { id: 'crm', label: t('dashboard.crm'), icon: Users },
    { id: 'pitch', label: t('dashboard.pitch'), icon: Mic },
    { id: 'report', label: "Report Studio", icon: FileText },
  ];

  if (viewScope === 'workspace') { menuItems.splice(1, 0, { id: 'team', label: "Team Hub", icon: Video }); }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      {/* Modals same as before */}
      {incomingCall && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-slideUp">
              <div className="bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-gray-800 dark:border-gray-200">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-bold text-sm">{incomingCall.caller} anropar teamet...</span>
                  </div>
                  <button onClick={() => { setCurrentView('team'); setIncomingCall(null); }} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors">Gå med</button>
                  <button onClick={() => setIncomingCall(null)} className="text-gray-500 hover:text-white dark:hover:text-black"><X size={16}/></button>
              </div>
          </div>
      )}

      {showCreateWsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                  <button onClick={() => setShowCreateWsModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                  <h2 className="font-serif-display text-2xl mb-4">Starta nytt Team</h2>
                  <form onSubmit={async (e) => { e.preventDefault(); if(!newWsName.trim()) return; setWsLoading(true); try { await createWorkspace(newWsName); setShowCreateWsModal(false); setNewWsName(''); } finally { setWsLoading(false); } }}>
                      <input autoFocus value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="Teamets namn..." className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg mb-4" />
                      <button type="submit" disabled={wsLoading} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest">{wsLoading ? 'Skapar...' : 'Skapa Team'}</button>
                  </form>
              </div>
          </div>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-all duration-300 relative`}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden"><span className="font-serif-display text-xl font-bold dark:text-white">Aceverse</span></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X size={20} /></button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setCurrentView(item.id); setActiveMetadata(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === item.id ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-auto space-y-2">
          {nextEvent && (
              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-1"><Calendar size={12} className="text-blue-600" /><span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Nästa Händelse</span></div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{nextEvent.title}</p>
              </div>
          )}
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === 'settings' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><SettingsIcon size={18} />{t('dashboard.settings')}</button>
          <div className="relative" ref={profileMenuRef}>
            {isProfileMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slideUp z-50 w-full">
                    <div className="p-2 space-y-1">
                        <button onClick={() => { switchScope('personal'); setIsProfileMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${viewScope === 'personal' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50'}`}>Min Profil {viewScope === 'personal' && <Check size={14}/>}</button>
                        {workspaces.map(ws => (
                            <button key={ws.id} onClick={() => { switchScope('workspace', ws.id); setIsProfileMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${viewScope === 'workspace' && activeWorkspace?.id === ws.id ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50'}`}>{ws.name} {viewScope === 'workspace' && activeWorkspace?.id === ws.id && <Check size={14}/>}</button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 p-2"><button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg">Logga ut</button></div>
                </div>
            )}
            <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${viewScope === 'workspace' ? 'bg-black text-white' : 'bg-gray-200'}`}>{viewScope === 'workspace' ? <Briefcase size={18} /> : <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}`} className="w-full h-full rounded-full" />}</div>
               <div className="min-w-0 flex-1 text-left"><p className="text-sm font-bold truncate">{viewScope === 'workspace' ? activeWorkspace?.name : user.firstName}</p></div>
               <ChevronUp size={16} className={`text-gray-400 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {viewScope === 'workspace' && <div className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center z-30">TEAM LÄGE: {activeWorkspace?.name}</div>}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500"><Menu size={24} /></button>}
            <h2 className="font-serif-display text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {viewTitles[currentView] || currentView}
            </h2>
            <button 
                onClick={refreshData} 
                disabled={isSyncing} 
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ml-4 px-3 py-1.5 rounded-full transition-all border border-transparent ${
                    isSyncing ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    connectionError ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 hover:border-green-200'
                }`}
            >
                {isSyncing ? <RefreshCw size={12} className="animate-spin"/> : connectionError ? <WifiOff size={12}/> : <CheckCircle2 size={12}/>}
                <span>{isSyncing ? 'Synkar...' : connectionError ? 'Synkfel' : 'Uppdaterad'}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 relative">
                    <Bell size={20} />
                    {unreadCount > 0 && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 z-50 animate-fadeIn">
                        <div className="p-3 border-b font-bold text-xs uppercase tracking-widest">Notiser</div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div key={n.id} onClick={() => markRead(n)} className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
                                    <p className="text-xs font-bold mb-1">{n.title}</p>
                                    <p className="text-[10px] text-gray-600 line-clamp-2">{n.message}</p>
                                </div>
                            )) : <div className="p-4 text-center text-xs text-gray-400">Inga nya notiser</div>}
                        </div>
                    </div>
                )}
            </div>
            <button onClick={toggleTheme}>{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8 custom-scrollbar">
            {currentView === 'overview' && <Overview user={user} setView={navigateToView} onPlanEvent={handlePlanEvent} />}
            {currentView === 'ideas' && <IdeaLab user={user} />}
            {currentView === 'advisor' && <Advisor user={user} initialPrompt={advisorStartPrompt} onClearPrompt={() => setAdvisorStartPrompt(null)} />}
            {currentView === 'marketing' && <MarketingEngine user={user} initialContext={activeMetadata} />}
            {currentView === 'crm' && <CRM user={user} />}
            {currentView === 'pitch' && <PitchStudio user={user} />}
            {currentView === 'settings' && <SettingsPage user={user} />}
            {currentView === 'report' && <ReportBuilder user={user} />}
            {currentView === 'team' && <TeamHub user={user} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
