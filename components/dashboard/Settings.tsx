
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, Invoice, UserSettings, AIMemory } from '../../types';
import { db } from '../../services/db';
import { googleService } from '../../services/googleIntegration';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
    Globe, User as UserIcon, Bell, Shield, CreditCard, Check, 
    Download, Trash2, Mail, Smartphone, AlertTriangle, FileText,
    Star, ArrowRight, Loader2, Calendar, MapPin, Briefcase,
    PauseCircle, Lock, Upload, XCircle, RefreshCw, Brain, Database, Link, LogOut
} from 'lucide-react';

interface SettingsProps {
    user: User;
}

type SettingsTab = 'profile' | 'notifications' | 'intelligence' | 'security' | 'billing' | 'report' | 'integrations';

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { language, setLanguage, t } = useLanguage();
    
    // State
    const [settings, setSettings] = useState<UserSettings>({
        notifications: { email: true, push: true, marketing: false },
        privacy: { publicProfile: false, dataSharing: false }
    });
    const [memories, setMemories] = useState<AIMemory[]>([]);
    
    // Live Profile Data (to fix email sync issue)
    const [liveProfile, setLiveProfile] = useState<User>(user);

    useEffect(() => {
        const loadData = async () => {
            // Fetch full user data to get memories and latest settings
            const data = await db.getUserData(user.id);
            if (data.settings) setSettings(data.settings);
            if (data.memories) setMemories(data.memories);
            
            // Also refresh the specific user object to ensure email is live
            const freshUser = await db.getCurrentUser();
            if (freshUser) setLiveProfile(freshUser);
        };
        loadData();
    }, [user.id]);

    const handleSaveSettings = async (newSettings: UserSettings) => {
        setSettings(newSettings);
        await db.saveSettings(user.id, newSettings);
    };

    const handleDeleteMemory = async (id: string) => {
        await db.deleteMemory(id);
        setMemories(prev => prev.filter(m => m.id !== id));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileSection user={liveProfile} language={language} setLanguage={setLanguage} />;
            case 'notifications':
                return <NotificationsSection user={liveProfile} settings={settings} onUpdate={handleSaveSettings} />;
            case 'intelligence':
                return <IntelligenceSection memories={memories} onDelete={handleDeleteMemory} />;
            case 'integrations':
                return <IntegrationsSection />;
            case 'security':
                return <SecuritySection user={liveProfile} settings={settings} onUpdate={handleSaveSettings} />;
            case 'billing':
                return <BillingSection user={liveProfile} />;
            case 'report':
                return <ReportSection user={liveProfile} />;
            default:
                return null;
        }
    };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">Hantera dina kontoinställningar och företagsdetaljer.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex flex-col gap-2 sticky top-4">
            <NavButton 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
                icon={<UserIcon size={16} />} 
                label={t('settings.profile')} 
            />
            <NavButton 
                active={activeTab === 'integrations'} 
                onClick={() => setActiveTab('integrations')} 
                icon={<Link size={16} />} 
                label="Integrationer" 
            />
            <NavButton 
                active={activeTab === 'intelligence'} 
                onClick={() => setActiveTab('intelligence')} 
                icon={<Brain size={16} />} 
                label="Ace Intelligence" 
            />
            <NavButton 
                active={activeTab === 'report'} 
                onClick={() => setActiveTab('report')} 
                icon={<FileText size={16} />} 
                label="Bolagsrapport" 
            />
            <NavButton 
                active={activeTab === 'notifications'} 
                onClick={() => setActiveTab('notifications')} 
                icon={<Bell size={16} />} 
                label={t('settings.notifications')} 
            />
            <NavButton 
                active={activeTab === 'security'} 
                onClick={() => setActiveTab('security')} 
                icon={<Shield size={16} />} 
                label={t('settings.security')} 
            />
            <NavButton 
                active={activeTab === 'billing'} 
                onClick={() => setActiveTab('billing')} 
                icon={<CreditCard size={16} />} 
                label={t('settings.billing')} 
            />
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-8 min-h-[500px]">
                {renderTabContent()}
            </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 border ${
            active 
            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 border-black dark:border-white' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm border-transparent hover:border-gray-100 dark:hover:border-gray-700'
        }`}
    >
        {icon}
        {label}
    </button>
);

const IntegrationsSection = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        // Check initial status
        setIsConnected(googleService.isConnected);
        
        // Init service
        googleService.initialize().then(() => {
            setIsInitializing(false);
        });

        // Listen for status changes
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        window.addEventListener('ace_google_connected', handleConnect);
        window.addEventListener('ace_google_disconnected', handleDisconnect);

        return () => {
            window.removeEventListener('ace_google_connected', handleConnect);
            window.removeEventListener('ace_google_disconnected', handleDisconnect);
        };
    }, []);

    const handleConnect = () => {
        googleService.login();
    };

    const handleDisconnect = () => {
        googleService.logout();
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Link size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Google Workspace</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Anslut din kalender och Gmail för att låta Aceverse automatisera mötesbokning och utkast.</p>
                </div>
                <div className="ml-auto">
                    {isInitializing ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="animate-spin" size={16} /> Laddar...</div>
                    ) : isConnected ? (
                        <button onClick={handleDisconnect} className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Koppla från</button>
                    ) : (
                        <button onClick={handleConnect} className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-opacity">Anslut</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProfileSection = ({ user, language, setLanguage }: { user: User, language: string, setLanguage: (l: any) => void }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Min Profil</h3>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Förnamn</label>
                <input disabled value={user.firstName} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none opacity-60 cursor-not-allowed dark:text-white" />
            </div>
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Efternamn</label>
                <input disabled value={user.lastName} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none opacity-60 cursor-not-allowed dark:text-white" />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">E-post</label>
            <input disabled value={user.email} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none opacity-60 cursor-not-allowed dark:text-white" />
        </div>
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Språk</label>
            <div className="flex gap-2">
                <button onClick={() => setLanguage('sv')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${language === 'sv' ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}>Svenska</button>
                <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${language === 'en' ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}>English</button>
            </div>
        </div>
    </div>
);

const NotificationsSection = ({ user, settings, onUpdate }: { user: User, settings: UserSettings, onUpdate: (s: UserSettings) => void }) => {
    const toggle = (key: keyof UserSettings['notifications']) => {
        onUpdate({ ...settings, notifications: { ...settings.notifications, [key]: !settings.notifications[key] } });
    };
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aviseringar</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">E-postnotiser</span>
                    <input type="checkbox" checked={settings.notifications.email} onChange={() => toggle('email')} className="accent-black dark:accent-white w-5 h-5"/>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Push-notiser</span>
                    <input type="checkbox" checked={settings.notifications.push} onChange={() => toggle('push')} className="accent-black dark:accent-white w-5 h-5"/>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Marknadsföring</span>
                    <input type="checkbox" checked={settings.notifications.marketing} onChange={() => toggle('marketing')} className="accent-black dark:accent-white w-5 h-5"/>
                </div>
            </div>
        </div>
    );
};

const IntelligenceSection = ({ memories, onDelete }: { memories: AIMemory[], onDelete: (id: string) => void }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ace Intelligence (Minne)</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Här lagras viktig kontext som AI:n använder för att hjälpa dig.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {memories.map(m => (
                <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center text-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-200">{m.content}</span>
                    <button onClick={() => onDelete(m.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={14} /></button>
                </div>
            ))}
            {memories.length === 0 && <p className="text-gray-400 italic">Inget minne sparat än.</p>}
        </div>
    </div>
);

const SecuritySection = ({ user, settings, onUpdate }: { user: User, settings: UserSettings, onUpdate: (s: UserSettings) => void }) => {
    const toggle = (key: keyof UserSettings['privacy']) => {
        onUpdate({ ...settings, privacy: { ...settings.privacy, [key]: !settings.privacy[key] } });
    };
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Säkerhet & Sekretess</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Offentlig Profil</span>
                    <input type="checkbox" checked={settings.privacy.publicProfile} onChange={() => toggle('publicProfile')} className="accent-black dark:accent-white w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Dela anonymiserad data för förbättring</span>
                    <input type="checkbox" checked={settings.privacy.dataSharing} onChange={() => toggle('dataSharing')} className="accent-black dark:accent-white w-5 h-5" />
                </div>
            </div>
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <button className="text-red-500 text-sm font-bold flex items-center gap-2 hover:underline"><LogOut size={16}/> Radera konto</button>
            </div>
        </div>
    );
};

const BillingSection = ({ user }: { user: User }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Plan & Fakturering</h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Nuvarande Plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{user.plan === 'pro' ? 'Aceverse Pro' : user.plan === 'enterprise' ? 'Enterprise' : 'Free Tier'}</p>
        </div>
        <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-80 transition-opacity">Uppgradera</button>
    </div>
);

const ReportSection = ({ user }: { user: User }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bolagsrapport</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generera en sammanställning av ditt UF-år.</p>
        <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"><Download size={16}/> Ladda ner PDF</button>
    </div>
);

export default Settings;
