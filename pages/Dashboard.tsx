
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Lightbulb, Users, Mic, MessageSquare, 
  Settings as SettingsIcon, LogOut, Bell, Search, Menu, X, 
  Loader2, Wifi, WifiOff, Moon, Sun, Globe, RefreshCw, AlertTriangle
} from 'lucide-react';
import { DashboardView, User, SearchResult } from '../types';
import { db } from '../services/db';
import Overview from '../components/dashboard/Overview';
import IdeaLab from '../components/dashboard/IdeaLab';
import Advisor from '../components/dashboard/Advisor';
import CRM from '../components/dashboard/CRM';
import PitchStudio from '../components/dashboard/PitchStudio';
import Settings from '../components/dashboard/Settings';
import MarketingEngine from '../components/dashboard/MarketingEngine';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  syncTrigger?: number; // New prop to force refresh
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, syncTrigger = 0 }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Robust Data Fetching
  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    setConnectionError(false);
    try {
      // Just a health check here, specific views load their own deep data
      // but this ensures we have a valid session before rendering
      const isHealthy = await db.checkHealth();
      if (!isHealthy) throw new Error("Connection failed");
      
      // Dispatch event for child components to reload their specific data
      window.dispatchEvent(new CustomEvent('ace_data_refresh'));
      
    } catch (error) {
      console.error("Dashboard sync failed", error);
      setConnectionError(true);
    } finally {
      // Keep loader visible briefly for UX
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, []);

  // Listen to parent sync triggers (app waking up, online event)
  useEffect(() => {
    refreshData();
  }, [syncTrigger, user.id, refreshData]);

  const menuItems: { id: DashboardView | 'marketing'; label: string; icon: any }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { id: 'ideas', label: t('dashboard.ideas'), icon: Lightbulb },
    { id: 'advisor', label: t('dashboard.advisor'), icon: MessageSquare },
    { id: 'marketing', label: "Marketing Engine", icon: Globe },
    { id: 'crm', label: t('dashboard.crm'), icon: Users },
    { id: 'pitch', label: t('dashboard.pitch'), icon: Mic },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
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

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
          <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-4 ${
                currentView === 'settings' 
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <SettingsIcon size={18} />
              {t('dashboard.settings')}
          </button>

          <div className="flex items-center gap-3 px-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
             <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden ring-2 ring-transparent group-hover:ring-black dark:group-hover:ring-white transition-all shrink-0">
               <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=000&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
             </div>
             <div className="min-w-0 overflow-hidden">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">{user.email}</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Offline / Error Banner */}
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{currentView === 'crm' ? 'CRM & Leads' : currentView}</h2>
            
            {/* Sync Indicator / Retry Button */}
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
                title="Uppdatera data"
            >
                {isSyncing ? (
                    <><RefreshCw size={12} className="animate-spin" /> Synkar...</>
                ) : connectionError ? (
                    <><AlertTriangle size={12} /> Kopplingsfel</>
                ) : (
                    <><RefreshCw size={12} /> Uppdaterad</>
                )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="Växla tema">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={() => setLanguage(language === 'sv' ? 'en' : 'sv')} className="p-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="Växla språk">
                {language}
            </button>
            <div className="h-6 w-px bg-gray-100 dark:bg-gray-800 mx-1"></div>
            <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors" title="Logga ut">
                <LogOut size={16} /> <span className="hidden sm:inline">Logga ut</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8 custom-scrollbar relative">
          <div className="max-w-6xl mx-auto h-full">
            {currentView === 'overview' && <Overview user={user} setView={setCurrentView} />}
            {currentView === 'ideas' && <IdeaLab user={user} />}
            {currentView === 'advisor' && <Advisor user={user} />}
            {currentView === 'marketing' && <MarketingEngine user={user} />}
            {currentView === 'crm' && <CRM user={user} />}
            {currentView === 'pitch' && <PitchStudio user={user} />}
            {currentView === 'settings' && <Settings user={user} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
