
import React, { useState, useEffect } from 'react';
import { User, UserSettings } from '../../types';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
    User as UserIcon, Bell, Shield, CreditCard,
    Loader2, Link, Save, Download, Trash2, Mail, Lock, 
    Globe, Layout, Smartphone, Megaphone, FileText, CheckCircle2, Eye, X
} from 'lucide-react';

interface SettingsProps {
    user: User;
}

type SettingsTab = 'general' | 'security' | 'notifications' | 'billing' | 'integrations';

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const { t, language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
    const [showDataModal, setShowDataModal] = useState(false);
    const [userDataJSON, setUserDataJSON] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company || '',
        bio: user.bio || ''
    });

    const [settings, setSettings] = useState<UserSettings>({
        notifications: { email: true, push: true, marketing: false },
        privacy: { publicProfile: false, dataSharing: false }
    });

    useEffect(() => {
        const loadFreshData = async () => {
            const currentUser = await db.getCurrentUser();
            if (currentUser) {
                setFormData({
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    company: currentUser.company || '',
                    bio: currentUser.bio || ''
                });
            }
            const userData = await db.getUserData(user.id);
            if (userData.settings) {
                setSettings(userData.settings);
            }
        };
        loadFreshData();
    }, [user.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const { error: profileError } = await supabase.from('profiles').update({
                first_name: formData.firstName,
                last_name: formData.lastName,
                company_name: formData.company,
                bio: formData.bio,
                email: formData.email 
            }).eq('id', user.id);

            if (profileError) throw profileError;

            if (formData.email !== user.email) {
                const { error: authError } = await supabase.auth.updateUser({ email: formData.email });
                if (authError) throw authError;
                setMessage({ type: 'success', text: 'Profil sparad. En bekräftelselänk har skickats till din nya e-postadress. Bytet slutförs när du klickar på länken.' });
            } else {
                setMessage({ type: 'success', text: 'Profil uppdaterad i databasen.' });
            }
            
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: `Kunde inte spara ändringar: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async (newSettings: UserSettings) => {
        setSettings(newSettings);
        await db.saveSettings(user.id, newSettings);
    };

    const handleViewData = async () => {
        setIsLoading(true);
        try {
            const allData = await db.getUserData(user.id);
            // Create a clean readable format for Art. 15 compliance
            const report = {
                Registrerad: {
                    Namn: `${user.firstName} ${user.lastName}`,
                    Email: user.email,
                    ID: user.id
                },
                "Lagrad Data": {
                    "Antal Chattar": allData.sessions.length,
                    "Antal Kontakter": allData.contacts.length,
                    "Antal Affärer": allData.deals.length,
                    "Skapade Idéer": allData.ideas.length,
                    "Pitchar": allData.pitchProjects.length
                },
                "Rättslig Grund": "Art. 6.1(b) Fullgörande av avtal (Tjänsten)",
                "Lagringsperiod": "Tills konto raderas eller inaktivitet i 24 månader."
            };
            setUserDataJSON(JSON.stringify(report, null, 2));
            setShowDataModal(true);
        } catch(e) {
            alert("Kunde inte hämta data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportData = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const allData = await db.getUserData(user.id);
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `aceverse_gdpr_export_${user.id}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            setMessage({ type: 'success', text: 'Din data har exporterats enligt Art. 20 (Dataportabilitet).' });
        } catch (e: any) {
            setMessage({ type: 'error', text: `Export misslyckades: ${e.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmText = "RADERA ALLT";
        const input = prompt(`VARNING: Detta raderar all din data permanent (Art. 17). Detta kan inte ångras.\n\nSkriv "${confirmText}" för att bekräfta:`);
        if (input === confirmText) {
            setIsLoading(true);
            try {
                // Wipe user data
                await db.wipeUserData(user.id);
                // Sign out
                await supabase.auth.signOut();
                window.location.reload();
            } catch(e) {
                alert("Kunde inte radera kontot. Kontakta support.");
                setIsLoading(false);
            }
        }
    };

    const menuItems = [
        { id: 'general', label: t('settings.profile'), icon: UserIcon },
        { id: 'security', label: 'GDPR & Säkerhet', icon: Shield },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'integrations', label: 'Integrationer', icon: Link },
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
    ];

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-8 animate-fadeIn pb-20">
            
            {showDataModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
                        <button onClick={() => setShowDataModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                        <h2 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">Registerutdrag (Art. 15)</h2>
                        <p className="text-sm text-gray-500 mb-6">Här är en sammanställning av personuppgifter vi behandlar om dig.</p>
                        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 rounded-xl font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-gray-800 custom-scrollbar">
                            {userDataJSON}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowDataModal(false)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Stäng</button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-4 mt-2">Inställningar</h2>
                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id as SettingsTab); setMessage(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    activeTab === item.id 
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                
                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold animate-slideUp ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.type === 'success' ? <div className="w-2 h-2 bg-green-500 rounded-full"/> : <div className="w-2 h-2 bg-red-500 rounded-full"/>}
                        {message.text}
                    </div>
                )}

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-8">{t('settings.profile')}</h2>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-2xl font-bold text-gray-600 shadow-inner">
                                    {formData.firstName?.[0]}
                                </div>
                                <div>
                                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold uppercase hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                        Byt bild
                                    </button>
                                    <p className="text-xs text-gray-400 mt-2">Max 800KB. JPG/PNG.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Förnamn</label>
                                    <input 
                                        name="firstName" 
                                        value={formData.firstName} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium dark:text-white border border-transparent focus:border-black dark:focus:border-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Efternamn</label>
                                    <input 
                                        name="lastName" 
                                        value={formData.lastName} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium dark:text-white border border-transparent focus:border-black dark:focus:border-white transition-all"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">E-postadress</label>
                                <input 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleInputChange} 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium dark:text-white border border-transparent focus:border-black dark:focus:border-white transition-all"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Företag / Organisation</label>
                                <input 
                                    name="company" 
                                    value={formData.company} 
                                    onChange={handleInputChange} 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium dark:text-white border border-transparent focus:border-black dark:focus:border-white transition-all"
                                />
                            </div>

                            <div className="mb-8">
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Bio / Pitch</label>
                                <textarea 
                                    name="bio" 
                                    value={formData.bio} 
                                    onChange={handleInputChange} 
                                    rows={4}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium dark:text-white border border-transparent focus:border-black dark:focus:border-white transition-all resize-none"
                                />
                            </div>

                            <button 
                                onClick={handleSaveProfile} 
                                disabled={isLoading} 
                                className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                Spara Ändringar
                            </button>
                        </div>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-8">Aviseringar</h2>
                        <div className="space-y-6">
                            {[
                                { id: 'email', label: 'E-postnotiser', desc: 'Få veckovisa sammanfattningar och viktiga uppdateringar via e-post.', icon: Mail },
                                { id: 'push', label: 'Push-notiser', desc: 'Notiser i webbläsaren vid nya meddelanden eller händelser.', icon: Smartphone },
                                { id: 'marketing', label: 'Marknadsföring', desc: 'Nyheter om Aceverse, tävlingar och partnererbjudanden.', icon: Megaphone }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-500">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{item.label}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={settings.notifications[item.id as keyof typeof settings.notifications]}
                                            onChange={(e) => handleSaveSettings({
                                                ...settings,
                                                notifications: { ...settings.notifications, [item.id]: e.target.checked }
                                            })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECURITY & GDPR TAB */}
                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-2">GDPR & Säkerhet</h2>
                            <p className="text-sm text-gray-500 mb-8">Vi värnar om din integritet. Här hanterar du dina lagstadgade rättigheter.</p>
                            
                            <div className="space-y-6 mb-12">
                                {/* Article 15 */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-blue-500"><Eye size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Rätten till tillgång (Art. 15)</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Se exakt vilken data vi lagrar om dig.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleViewData} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Visa Registerutdrag</button>
                                </div>

                                {/* Article 20 */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-green-500"><Download size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Dataportabilitet (Art. 20)</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Ladda ner all din data i maskinläsbart format.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleExportData} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Exportera (JSON)</button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-500"><Globe size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Publik Profil</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Gör din profil synlig för andra användare.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={settings.privacy.publicProfile}
                                            onChange={(e) => handleSaveSettings({
                                                ...settings,
                                                privacy: { ...settings.privacy, publicProfile: e.target.checked }
                                            })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-500"><Lock size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Byt Lösenord</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Skickar en återställningslänk till din e-post.</p>
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/reset-password' });
                                        setMessage({ type: 'success', text: 'Återställningslänk skickad till din e-post.' });
                                    }} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase hover:opacity-80">Skicka länk</button>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-4 text-red-500">Farozon (Art. 17)</h3>
                            <div className="border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/10 rounded-xl p-6">
                                <h4 className="font-bold text-red-700 dark:text-red-400 mb-2">Rätten att bli glömd</h4>
                                <p className="text-xs text-red-600 dark:text-red-300 mb-4">Detta raderar PERMANENT ditt konto och all tillhörande data (chattar, filer, idéer). Åtgärden kan inte ångras.</p>
                                <button onClick={handleDeleteAccount} className="px-4 py-2 bg-white dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold uppercase hover:bg-red-50 dark:hover:bg-red-800 transition-colors flex items-center gap-2">
                                    <Trash2 size={16} /> Radera Mitt Konto
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* BILLING TAB */}
                {activeTab === 'billing' && (
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm text-center py-20">
                        <CreditCard size={48} className="mx-auto mb-6 text-gray-300" />
                        <h3 className="text-2xl font-serif-display text-gray-900 dark:text-white mb-2">Aceverse Pro</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">Du använder just nu gratisversionen.</p>
                        <button className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">Uppgradera Plan</button>
                    </div>
                )}

                {/* INTEGRATIONS TAB */}
                {activeTab === 'integrations' && (
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-8">Integrationer</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Google Workspace</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Synka kalender och kontakter.</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold uppercase hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Anslut</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default Settings;
