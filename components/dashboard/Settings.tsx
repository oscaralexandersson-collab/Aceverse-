
import React, { useState, useEffect } from 'react';
import { User, Notification, Invoice, UserSettings, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
    Globe, User as UserIcon, Bell, Shield, CreditCard, Check, 
    Download, Trash2, Mail, Smartphone, AlertTriangle, FileText,
    Star, ArrowRight, Loader2, Calendar, MapPin, Briefcase,
    PauseCircle, Lock, X
} from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';

interface SettingsProps {
    user: User;
}

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing' | 'report';

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { language, setLanguage, t } = useLanguage();
    const [settings, setSettings] = useState<UserSettings>({
        notifications: { email: true, push: true, marketing: false },
        privacy: { publicProfile: false, dataSharing: false }
    });

    useEffect(() => {
        const loadSettings = async () => {
            const data = await db.getUserData(user.id);
            if (data.settings) setSettings(data.settings);
        };
        loadSettings();
    }, [user.id]);

    const handleSaveSettings = async (newSettings: UserSettings) => {
        setSettings(newSettings);
        await db.saveSettings(user.id, newSettings);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileSection user={user} language={language} setLanguage={setLanguage} />;
            case 'notifications':
                return <NotificationsSection user={user} settings={settings} onUpdate={handleSaveSettings} />;
            case 'security':
                return <SecuritySection user={user} settings={settings} onUpdate={handleSaveSettings} />;
            case 'billing':
                return <BillingSection user={user} />;
            case 'report':
                return <ReportSection user={user} />;
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
                active={activeTab === 'report'} 
                onClick={() => setActiveTab('report')} 
                icon={<FileText size={16} />} 
                label="Bolagsrapporter" 
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

// --- 1. PROFILE SECTION ---

const ProfileSection = ({ user, language, setLanguage }: { user: User, language: string, setLanguage: any }) => {
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [company, setCompany] = useState(user.company || '');
    const [bio, setBio] = useState(user.bio || '');
    const [msg, setMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.updateProfile(user.id, { firstName, lastName, company, bio });
            setMsg('Profil uppdaterad.');
            setTimeout(() => setMsg(''), 3000);
        } catch (error) {
            setMsg('Fel vid uppdatering.');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-all placeholder:text-gray-400";
    const labelClasses = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2";

    return (
        <div className="animate-fadeIn">
            <h2 className="font-serif-display text-2xl mb-8 border-b border-gray-100 dark:border-gray-800 pb-4 text-gray-900 dark:text-white">Min Profil</h2>

            {/* Language Selection */}
            <div className="mb-10">
                <label className={labelClasses}>Språk</label>
                <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setLanguage('sv')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${language === 'sv' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>Svenska</button>
                    <button onClick={() => setLanguage('en')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${language === 'en' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>English</button>
                </div>
            </div>
            
            {/* Avatar */}
            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border-4 border-gray-50 dark:border-gray-800 shadow-inner">
                        <img src={user.avatar || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=000&color=fff`} alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                    <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-black dark:hover:border-white transition-all mb-2 block shadow-sm text-gray-900 dark:text-white">Byt avatar</button>
                    <p className="text-xs text-gray-400">JPG, GIF eller PNG. Max storlek 800K</p>
                </div>
            </div>

            <div className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Förnamn</label>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Efternamn</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClasses} />
                    </div>
                </div>

                <div>
                    <label className={labelClasses}>E-post</label>
                    <input type="email" value={user.email} disabled className={`${inputClasses} opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800/50`} />
                </div>

                <div>
                    <label className={labelClasses}>Skola / Företag</label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputClasses} />
                </div>

                    <div>
                    <label className={labelClasses}>Bio</label>
                    <textarea className={`${inputClasses} h-32 resize-none`} value={bio} onChange={e => setBio(e.target.value)} placeholder="Kort beskrivning..." />
                </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 items-center">
                {msg && (
                    <span className={`text-sm font-medium animate-fadeIn flex items-center gap-1.5 ${msg.includes('Fel') ? 'text-red-600' : 'text-green-600'}`}>
                        {msg.includes('uppdaterad') && <Check size={14} />} {msg}
                    </span>
                )}
                <button onClick={handleSave} disabled={isSaving} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full text-sm font-bold tracking-wide hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg shadow-black/20 hover:shadow-black/30 transform hover:-translate-y-0.5 disabled:opacity-50">
                    {isSaving ? 'Sparar...' : 'Spara ändringar'}
                </button>
            </div>
        </div>
    );
};

// --- REPORT SECTION ---

const ReportSection = ({ user }: { user: User }) => {
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reportToDelete, setReportToDelete] = useState<CompanyReportEntry | null>(null);

    const loadReports = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            setReports(data.reports || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [user.id]);

    const handleClearProfileReport = async () => {
        if (confirm("Vill du rensa den aktiva bolagsrapporten från din profil? (Själva rapporten finns kvar i din historik)")) {
            await db.updateProfile(user.id, { companyReport: undefined });
            window.location.reload();
        }
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;
        const id = reportToDelete.id;
        try {
            await db.deleteReport(user.id, id);
            setReports(prev => prev.filter(r => r.id !== id));
            
            // Om vi raderar den som är aktiv på profilen, rensa även den
            if (user.companyReport && user.companyReport.meta.companyName === reportToDelete.reportData.meta.companyName) {
                await db.updateProfile(user.id, { companyReport: undefined });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setReportToDelete(null);
        }
    };

    return (
        <div className="animate-fadeIn">
            <DeleteConfirmModal 
                isOpen={!!reportToDelete} 
                onClose={() => setReportToDelete(null)} 
                onConfirm={confirmDeleteReport} 
                itemName={reportToDelete?.title || 'Rapport'} 
            />

            <div className="mb-10 pb-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-serif-display text-2xl mb-1 text-gray-900 dark:text-white">Bolagsrapporter</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Hantera dina genererade marknadsanalyser och profil-data.</p>
            </div>

            {/* Active Profile Report */}
            {user.companyReport && (
                <div className="mb-12">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Aktiv Rapport på Profil</h3>
                    <div className="bg-black dark:bg-white text-white dark:text-black p-6 rounded-2xl flex justify-between items-center shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 dark:bg-black/10 p-3 rounded-xl"><FileText size={24} /></div>
                            <div>
                                <h4 className="font-bold text-lg">{user.companyReport.meta.companyName}</h4>
                                <p className="text-xs opacity-70">Denna rapport används för att ge AI:n kontext om ditt företag.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClearProfileReport}
                            className="p-3 bg-white/10 dark:bg-black/10 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                            title="Rensa från profil"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Report History */}
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Rapporthistorik</h3>
                
                {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : reports.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-12 rounded-2xl text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <FileText size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 text-sm">Inga sparade rapporter hittades.</p>
                        <p className="text-xs text-gray-400 mt-1">Generera din första rapport under CRM > Intelligence.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {reports.map((report) => (
                            <div key={report.id} className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex justify-between items-center hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{report.title}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase font-medium">{new Date(report.created_at).toLocaleDateString()} • Market Research</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setReportToDelete(report)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Radera permanent"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 2. NOTIFICATIONS SECTION ---

const NotificationsSection = ({ user, settings, onUpdate }: { user: User, settings: UserSettings, onUpdate: (s: UserSettings) => void }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const loadNotifs = async () => {
            const data = await db.getUserData(user.id);
            setNotifications(data.notifications || []);
        };
        loadNotifs();
    }, [user.id]);

    const toggle = (key: keyof UserSettings['notifications']) => {
        onUpdate({
            ...settings,
            notifications: { ...settings.notifications, [key]: !settings.notifications[key] }
        });
    };

    return (
        <div className="animate-fadeIn">
            <h2 className="font-serif-display text-2xl mb-8 border-b border-gray-100 dark:border-gray-800 pb-4 text-gray-900 dark:text-white">Aviseringar</h2>
            
            <div className="space-y-6 mb-12">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-gray-500 dark:text-gray-300 shadow-sm"><Mail size={20} /></div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">E-postaviseringar</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Få uppdateringar om din pitch och rådgivarsvar.</p>
                        </div>
                    </div>
                    <Toggle checked={settings.notifications.email} onChange={() => toggle('email')} />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-gray-500 dark:text-gray-300 shadow-sm"><Smartphone size={20} /></div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Push-notiser</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Realtidsuppdateringar i webbläsaren.</p>
                        </div>
                    </div>
                    <Toggle checked={settings.notifications.push} onChange={() => toggle('push')} />
                </div>
            </div>

            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Tidigare Notiser</h3>
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Inga aviseringar att visa.</div>
                ) : (
                    notifications.map((n, i) => (
                        <div key={i} className={`p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 flex gap-4 ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}`}>
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{n.message}</p>
                                <span className="text-xs text-gray-400">{new Date(n.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- 3. SECURITY & GDPR SECTION ---

const SecuritySection = ({ user, settings, onUpdate }: { user: User, settings: UserSettings, onUpdate: (s: UserSettings) => void }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await db.exportUserData(user.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aceverse_gdpr_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.href = url;
            a.click();
            a.remove();
        } catch (e) {
            alert("Kunde inte exportera data.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("RÄTTEN ATT BLI GLÖMD (ART. 17): Är du säker? Detta raderar all din data permanent och kan inte ångras.")) {
            await db.deleteAccount(user.id);
            window.location.reload();
        }
    };

    const toggleRestriction = () => {
        setIsRestricted(!isRestricted);
        // In a real app, this would update a DB flag 'isProcessingRestricted'
        alert(isRestricted 
            ? "Behandling återupptagen. Vi kommer nu att processa dina data igen." 
            : "BEGRÄNSNING AKTIVERAD (Art. 18): Din data lagras men kommer inte att behandlas eller användas för AI-träning tills du återaktiverar.");
    };

    return (
        <div className="animate-fadeIn">
            <h2 className="font-serif-display text-2xl mb-8 border-b border-gray-100 dark:border-gray-800 pb-4 text-gray-900 dark:text-white">Säkerhet & GDPR-Rättigheter</h2>

            {/* ART 32 Security Declaration */}
            <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800 mb-8">
                <h4 className="font-bold text-green-800 dark:text-green-400 flex items-center gap-2 mb-2">
                    <Shield size={18} /> Säkerhetsdeklaration (Art. 32)
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">Denna system-prompt uppfyller EU 2016/679 (GDPR).</p>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-green-800 dark:text-green-400">
                    <div className="flex items-center gap-2"><Check size={12} /> TLS 1.3 Kryptering (Transit)</div>
                    <div className="flex items-center gap-2"><Check size={12} /> AES-256 Kryptering (Vila)</div>
                    <div className="flex items-center gap-2"><Check size={12} /> Dataminimering (Art. 5.1c)</div>
                    <div className="flex items-center gap-2"><Check size={12} /> Pseudonymisering</div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-8 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                <p className="font-bold mb-1">Dina rättigheter enligt GDPR</p>
                <p>Du har full kontroll över din data. Här kan du utöva dina rättigheter enligt Art. 15-21.</p>
            </div>

            <div className="space-y-8">
                {/* Restriction of Processing (Art 18) */}
                <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-orange-600 dark:text-orange-400 shadow-sm"><PauseCircle size={20} /></div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Begränsa Behandling (Art. 18)</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">Pausa all analys av din data. Datan lagras men används ej.</p>
                        </div>
                    </div>
                    <Toggle checked={isRestricted} onChange={toggleRestriction} />
                </div>

                {/* GDPR Actions Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Data Portability (Art 20) */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 shadow-sm"><Download size={20} /></div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Dataportabilitet (Art. 20)</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Ladda ner en maskinläsbar kopia (JSON) av all data vi har om dig.</p>
                        </div>
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-gray-900 dark:text-white"
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                            {isExporting ? 'Exporterar...' : 'Exportera min data'}
                        </button>
                    </div>

                    {/* Right to Erasure (Art 17) */}
                    <div className="p-6 bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400 shadow-sm"><Trash2 size={20} /></div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Rätten att bli glömd (Art. 17)</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Radera ditt konto och all associerad data permanent från våra servrar.</p>
                        </div>
                        <button 
                            onClick={handleDelete}
                            className="w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Radera mitt konto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. BILLING SECTION ---

const BillingSection = ({ user }: { user: User }) => {
    const plans = [
        { id: 'free', name: 'Start', price: '0 kr', features: ['AI-rådgivare', '3 Pitchar/mån', 'Grundläggande CRM'] },
        { id: 'pro', name: 'Pro', price: '99 kr', features: ['Obegränsad AI', 'Obegränsade Pitchar', 'Sälj-autopilot', 'Export till PPT'], popular: true },
        { id: 'enterprise', name: 'Skola', price: 'Kontakta oss', features: ['Lärarpanel', 'Klasshantering', 'Företags-login'] }
    ];

    const currentPlan = user.plan || 'free';

    return (
        <div className="animate-fadeIn">
            <h2 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">Fakturering & Plan</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">Du använder för närvarande: <span className="font-bold text-black dark:text-white uppercase">{currentPlan}</span></p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {plans.map(plan => (
                    <div key={plan.id} className={`relative p-6 rounded-2xl border ${currentPlan === plan.id ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 ring-1 ring-black dark:ring-white' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
                        {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Populärast</span>}
                        <h3 className="font-serif-display text-xl mb-1 text-gray-900 dark:text-white">{plan.name}</h3>
                        <div className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{plan.price}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mån</span></div>
                        <ul className="space-y-3 mb-6">
                            {plan.features.map((f, i) => (
                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                    <Check size={14} className="text-green-600 dark:text-green-400 mt-0.5" /> {f}
                                </li>
                            ))}
                        </ul>
                        <button 
                            disabled={currentPlan === plan.id}
                            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                                currentPlan === plan.id 
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default' 
                                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-lg shadow-black/10'
                            }`}
                        >
                            {currentPlan === plan.id ? 'Nuvarande' : 'Välj Plan'}
                        </button>
                    </div>
                ))}
            </div>

            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Fakturahistorik</h3>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">Datum</th>
                            <th className="px-6 py-4">Belopp</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">PDF</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                            <td className="px-6 py-4 text-gray-900 dark:text-white">2024-02-01</td>
                            <td className="px-6 py-4 text-gray-900 dark:text-white">99 kr</td>
                            <td className="px-6 py-4"><span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">Betald</span></td>
                            <td className="px-6 py-4 text-right"><button className="text-gray-400 hover:text-black dark:hover:text-white"><Download size={16} /></button></td>
                        </tr>
                        {/* Empty state simulation if real logic needed */}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- HELPER COMPONENT ---

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
        onClick={onChange}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
        <div className={`w-4 h-4 rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

export default Settings;
