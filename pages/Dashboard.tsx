
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Lightbulb, Users, Mic, MessageSquare, 
  Settings as SettingsIcon, LogOut, Bell, Search, Menu, X, 
  Loader2, Wifi, WifiOff, Megaphone, Moon, Sun, Globe, RefreshCw
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
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Starta bakgrundssynk omedelbart
    setIsSyncing(true);
    db.getUserData(user.id).finally(() => {
      // Vi sätter isSyncing till false efter en liten fördröjning för visuell feedback
      setTimeout(() => setIsSyncing(false), 1000);
    });

    // Lyssna på när synken faktiskt blir klar för att uppdatera statsen om det behövs
    const handleSync = () => setIsSyncing(false);
    window.addEventListener('ace_data_synced', handleSync);
    return () => window.removeEventListener('ace_data_synced', handleSync);
  }, [user.id]);

  const menuItems: { id: DashboardView; label: string; icon: any }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { id: 'ideas', label: t('dashboard.ideas'), icon: Lightbulb },
    { id: 'advisor', label: t('dashboard.advisor'), icon: MessageSquare },
    { id: 'marketing', label: t('dashboard.marketing'), icon: Megaphone },
    { id: 'crm', label: t('dashboard.crm'), icon: Users },
    { id: 'pitch', label: t('dashboard.pitch'), icon: Mic },
    { id: 'settings', label: t('dashboard.settings'), icon: SettingsIcon },
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

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
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

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut size={18} /> {t('dashboard.logout')}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500"><Menu size={24} /></button>}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{currentView}</h2>
            {isSyncing && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">
                <RefreshCw size={12} className="animate-spin" /> Synkar...
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-500">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
            <button onClick={() => setLanguage(language === 'sv' ? 'en' : 'sv')} className="text-xs font-bold uppercase tracking-widest">{language}</button>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
               <img src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=000&color=fff`} alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8 custom-scrollbar">
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
