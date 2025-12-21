
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  Users, 
  Mic, 
  MessageSquare, 
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Loader2,
  FileText,
  Wifi,
  WifiOff,
  AlertTriangle,
  Megaphone,
  Moon, 
  Sun,
  Globe
} from 'lucide-react';
import { DashboardView, User, SearchResult, Notification } from '../types';
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
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isOffline = user.id.startsWith('local-');

  useEffect(() => {
    const fetchData = async () => {
        const data = await db.getUserData(user.id);
        if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter(n => !n.read).length);
        }
    };
    fetchData();
  }, [user.id, currentView]); // Refetch when view changes to keep sync

  const toggleLanguage = () => {
    setLanguage(language === 'sv' ? 'en' : 'sv');
  };

  const menuItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('dashboard.overview'), icon: <LayoutDashboard size={20} /> },
    { id: 'ideas', label: t('dashboard.ideas'), icon: <Lightbulb size={20} /> },
    { id: 'advisor', label: t('dashboard.advisor'), icon: <MessageSquare size={20} /> },
    { id: 'marketing', label: t('dashboard.marketing'), icon: <Megaphone size={20} /> },
    { id: 'crm', label: t('dashboard.crm'), icon: <Users size={20} /> },
    { id: 'pitch', label: t('dashboard.pitch'), icon: <Mic size={20} /> },
    { id: 'settings', label: t('dashboard.settings'), icon: <SettingsIcon size={20} /> },
  ];

  // Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await db.search(user.id, searchQuery);
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user.id]);

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setCurrentView(result.view);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleNotificationsClick = () => {
      // Mark all as read locally for UI then navigate
      setCurrentView('settings'); 
      // In a real scenario, we might pass a prop to Settings to open the Notifications tab directly
  };

  const groupResults = () => {
    const leads = searchResults.filter(r => r.type === 'lead');
    const ideas = searchResults.filter(r => r.type === 'idea');
    const pitches = searchResults.filter(r => r.type === 'pitch');
    return { leads, ideas, pitches };
  };

  const { leads, ideas, pitches } = groupResults();

  const renderResultGroup = (title: string, items: SearchResult[], iconType: 'lead' | 'idea' | 'pitch') => {
      if (items.length === 0) return null;
      return (
          <div>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                 {iconType === 'lead' && <Users size={12} />}
                 {iconType === 'idea' && <Lightbulb size={12} />}
                 {iconType === 'pitch' && <FileText size={12} />}
                 {title}
              </div>
              {items.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 last:border-0"
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      result.type === 'lead' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      result.type === 'idea' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                        {result.type === 'lead' && <Users size={14} />}
                        {result.type === 'idea' && <Lightbulb size={14} />}
                        {result.type === 'pitch' && <FileText size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{result.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate">{result.subtitle}</span>
                      </div>
                    </div>
                  </button>
              ))}
          </div>
      );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-all duration-300 ease-in-out absolute md:relative h-full`}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <img 
              src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Logga-Ej%20bakrund.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvTG9nZ2EtRWogYmFrcnVuZC5wbmciLCJpYXQiOjE3NjQ3NTk3NjYsImV4cCI6MTc5NjI5NTc2Nn0.wItQw7FJaVd5ANf3TXe2kTAYHeEPzQB9gDJxEcs4ZYs" 
              alt="Aceverse Logo" 
              className="h-8 w-auto object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
            />
            <span className="font-serif-display text-xl font-bold dark:text-white">Aceverse</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap relative group ${
                currentView === item.id 
                  ? 'bg-black dark:bg-white text-white dark:text-black' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
              {/* Notification Badge on Settings Item */}
              {item.id === 'settings' && unreadCount > 0 && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 ${currentView === 'settings' ? 'ring-1 ring-white' : ''}`}></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className={`mb-4 px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2 ${isOffline ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'}`}>
              {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>{isOffline ? t('dashboard.demoMode') : t('dashboard.online')}</span>
          </div>

          <div className="flex items-center gap-3 mb-4 p-2 relative">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=000&color=fff`} alt="User" />
            </div>
            {/* PROFILE NOTIFICATION BLUPP */}
            {unreadCount > 0 && (
                <div className="absolute top-1 left-8 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
            )}
            
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.company || 'Start-up'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors whitespace-nowrap"
          >
            <LogOut size={18} />
            {t('dashboard.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300">
        
        {isOffline && (
            <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2 flex items-center justify-between text-sm text-yellow-800">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>{t('dashboard.offlineWarning')}</span>
                </div>
                <button onClick={onLogout} className="underline font-semibold hover:text-black">{t('dashboard.connectNow')}</button>
            </div>
        )}

        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 relative z-30 flex-shrink-0">
            <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                   <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors">
                      <Menu size={24} />
                   </button>
                )}
                <h2 className="text-lg font-medium text-gray-900 dark:text-white capitalize">{
                    currentView === 'ideas' ? t('dashboard.ideas') : 
                    currentView === 'advisor' ? t('dashboard.advisor') :
                    currentView === 'marketing' ? t('dashboard.marketing') :
                    currentView === 'crm' ? t('dashboard.crm') :
                    currentView === 'pitch' ? t('dashboard.pitch') :
                    currentView === 'settings' ? t('dashboard.settings') :
                    t('dashboard.overview')
                }</h2>
            </div>
            
            <div className="flex items-center gap-4">
                <div ref={searchRef} className="relative hidden md:block">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if(searchResults.length > 0) setShowResults(true) }}
                        placeholder={t('dashboard.search')} 
                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-gray-200 dark:focus:border-gray-700 rounded-full text-sm focus:ring-1 focus:ring-black dark:focus:ring-white w-64 transition-all focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                         <Loader2 size={14} className="animate-spin text-gray-400" />
                      </div>
                    )}

                    {showResults && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-fadeIn">
                        <div className="max-h-96 overflow-y-auto">
                          {searchResults.length > 0 ? (
                            <>
                                {renderResultGroup(t('dashboard.searchCategories.leads'), leads, 'lead')}
                                {renderResultGroup(t('dashboard.searchCategories.ideas'), ideas, 'idea')}
                                {renderResultGroup(t('dashboard.searchCategories.pitches'), pitches, 'pitch')}
                            </>
                          ) : (
                            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                               Inga resultat hittades för "{searchQuery}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                <button 
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <button 
                    onClick={toggleLanguage}
                    className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                    <Globe size={20} />
                    <span className="text-xs font-bold">{language === 'sv' ? 'SV' : 'EN'}</span>
                </button>

                <button 
                    onClick={handleNotificationsClick}
                    className="relative p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                    )}
                </button>
            </div>
        </header>

        <div className={`flex-1 bg-gray-50 dark:bg-gray-950 transition-colors ${currentView === 'ideas' && !isSidebarOpen ? 'p-0 overflow-hidden' : 'p-8 overflow-y-auto'}`}>
            {/* 
               CRITICAL CHANGE: 
               Instead of conditionally rendering components (which unmounts them and kills background processes),
               we render ALL components but use CSS `display: none` (via 'hidden' class) to toggle visibility.
               This keeps the component state alive, allowing AI generation to continue in the background.
            */}
            <div className={`${currentView === 'ideas' && !isSidebarOpen ? 'h-full' : 'max-w-6xl mx-auto'} h-full relative`}>
                
                {/* Overview */}
                <div className={currentView === 'overview' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <Overview user={user} setView={setCurrentView} />
                </div>

                {/* Idea Lab */}
                <div className={currentView === 'ideas' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <IdeaLab user={user} isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                </div>

                {/* Advisor */}
                <div className={currentView === 'advisor' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <Advisor user={user} />
                </div>

                {/* Marketing */}
                <div className={currentView === 'marketing' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <MarketingEngine user={user} />
                </div>

                {/* CRM */}
                <div className={currentView === 'crm' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <CRM user={user} />
                </div>

                {/* Pitch Studio */}
                <div className={currentView === 'pitch' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <PitchStudio user={user} />
                </div>

                {/* Settings */}
                <div className={currentView === 'settings' ? 'block h-full animate-[fadeIn_0.5s_ease-out_forwards]' : 'hidden'}>
                    <Settings user={user} />
                </div>

            </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
