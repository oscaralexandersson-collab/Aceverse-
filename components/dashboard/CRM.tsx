
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Plus, Search, Mail, Phone, Calendar as CalendarIcon,
    ArrowRight, BarChart3, TrendingUp, DollarSign, CheckCircle2, 
    Target, Leaf, Award, Briefcase, Zap, Filter, MoreHorizontal,
    ShoppingBag, Trash2, Edit2, Loader2, X
} from 'lucide-react';
import { User, Contact, Deal, SalesEvent, SustainabilityLog, UfEvent, Recommendation, Badge } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

type Tab = 'dashboard' | 'sales' | 'deals' | 'contacts' | 'impact';

interface CRMProps {
    user: User;
}

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    
    // Data State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [sales, setSales] = useState<SalesEvent[]>([]);
    const [logs, setLogs] = useState<SustainabilityLog[]>([]);
    const [ufEvents, setUfEvents] = useState<UfEvent[]>([]);
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [points, setPoints] = useState(0);
    const [badges, setBadges] = useState<Badge[]>([]);

    // Modal State
    const [showSaleModal, setShowSaleModal] = useState(false); // B2C
    const [showDealModal, setShowDealModal] = useState(false); // B2B
    const [showContactModal, setShowContactModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false); // Calendar

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            setContacts(data.contacts);
            setDeals(data.deals);
            setSales(data.salesEvents);
            setLogs(data.sustainabilityLogs);
            setUfEvents(data.ufEvents);
            setPoints(data.points);
            setBadges(data.badges);
            
            // Generate dynamic recommendations
            const newRecs = await db.getRecommendations(user.id);
            setRecs(newRecs);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- QUICK ACTIONS ---
    const handleLogSale = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const amount = Number(formData.get('price')) * Number(formData.get('qty'));
        
        await db.logSale(user.id, {
            product_name: formData.get('product') as string,
            quantity: Number(formData.get('qty')),
            amount: amount,
            channel: formData.get('channel') as string
        });
        setShowSaleModal(false);
        loadData();
    };

    const handleAddDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        // Create deal logic
        await db.addDeal(user.id, {
            title: formData.get('title') as string,
            value: Number(formData.get('value')),
            stage: formData.get('stage') as any,
            // In a real app we might link to a contact ID here, keeping it simple for now
        });
        setShowDealModal(false);
        loadData();
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        await db.addUfEvent(user.id, {
            title: formData.get('title') as string,
            date_at: new Date(formData.get('date') as string).toISOString(),
            type: formData.get('type') as any
        });
        setShowEventModal(false);
        loadData();
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        await db.addContact(user.id, {
            name: formData.get('name') as string,
            type: formData.get('type') as any,
            company: formData.get('company') as string,
            email: formData.get('email') as string
        });
        setShowContactModal(false);
        loadData();
    };

    // Determine main button action based on tab
    const getMainAction = () => {
        if (activeTab === 'deals') {
            return { label: 'Ny Affär (B2B)', action: () => setShowDealModal(true), icon: <Briefcase size={16}/> };
        }
        return { label: 'Ny Försäljning (B2C)', action: () => setShowSaleModal(true), icon: <Plus size={16}/> };
    };

    const mainAction = getMainAction();

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex flex-col h-full gap-6 animate-fadeIn pb-20">
            
            {/* TOP HEADER & NAV */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <h1 className="font-serif-display text-4xl text-gray-900 dark:text-white mb-2">CRM & Sälj</h1>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <TabButton id="dashboard" label="Fokus" icon={<Target size={14}/>} active={activeTab === 'dashboard'} onClick={setActiveTab} />
                        <TabButton id="sales" label="Sälj (B2C)" icon={<ShoppingBag size={14}/>} active={activeTab === 'sales'} onClick={setActiveTab} />
                        <TabButton id="deals" label="Affärer (B2B)" icon={<Briefcase size={14}/>} active={activeTab === 'deals'} onClick={setActiveTab} />
                        <TabButton id="contacts" label="Kontakter" icon={<Users size={14}/>} active={activeTab === 'contacts'} onClick={setActiveTab} />
                        <TabButton id="impact" label="Hållbarhet" icon={<Leaf size={14}/>} active={activeTab === 'impact'} onClick={setActiveTab} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Poäng</span>
                        <span className="text-xl font-bold text-yellow-500 flex items-center gap-1"><Award size={16}/> {points}</span>
                    </div>
                    <button onClick={mainAction.action} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                        {mainAction.icon} {mainAction.label}
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                {/* 1. DASHBOARD / FOKUS */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        {/* Recommendations */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Viktigast just nu</h3>
                            <div className="grid gap-4">
                                {recs.length > 0 ? recs.map(rec => (
                                    <div key={rec.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-l-4 border-black dark:border-white shadow-sm flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{rec.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{rec.description}</p>
                                        </div>
                                        <button onClick={rec.ctaAction} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                                            {rec.ctaLabel}
                                        </button>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl text-gray-400 text-sm">
                                        Inga akuta åtgärder. Bra jobbat!
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* UF Calendar Snippet */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Kommande UF-Händelser</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                {ufEvents.slice(0, 3).map(evt => (
                                    <div key={evt.id} className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <CalendarIcon size={18} className="text-blue-500"/>
                                            <span className="text-[10px] font-bold bg-white dark:bg-black px-2 py-1 rounded text-blue-500">{new Date(evt.date_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{evt.title}</h4>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{evt.type}</span>
                                    </div>
                                ))}
                                <button onClick={() => setShowEventModal(true)} className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-all p-4">
                                    <Plus size={24} className="mb-2"/>
                                    <span className="text-xs font-bold uppercase">Lägg till händelse</span>
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {/* 2. SALES (B2C) */}
                {activeTab === 'sales' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="Omsättning idag" value={`${sales.filter(s => new Date(s.occurred_at).toDateString() === new Date().toDateString()).reduce((acc,s) => acc+s.amount, 0)} kr`} />
                            <StatBox label="Totalt sålt" value={`${sales.reduce((acc,s) => acc+s.amount, 0)} kr`} />
                            <StatBox label="Antal köp" value={sales.length.toString()} />
                            <StatBox label="Snittorder" value={`${Math.round(sales.length ? sales.reduce((acc,s) => acc+s.amount, 0)/sales.length : 0)} kr`} />
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Säljhierarki</h3>
                                <button onClick={() => setShowSaleModal(true)} className="text-xs font-bold uppercase underline">Logga ny</button>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-black text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Produkt</th>
                                        <th className="px-6 py-4">Kanal</th>
                                        <th className="px-6 py-4">Datum</th>
                                        <th className="px-6 py-4 text-right">Belopp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {sales.map(s => (
                                        <tr key={s.id}>
                                            <td className="px-6 py-4 font-bold">{s.product_name} <span className="text-gray-400 text-xs font-normal">x{s.quantity}</span></td>
                                            <td className="px-6 py-4"><span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-[10px] font-bold uppercase">{s.channel}</span></td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(s.occurred_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold">{s.amount} kr</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. DEALS (B2B) */}
                {activeTab === 'deals' && (
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between mb-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Säljpipeline</h3>
                            <button onClick={() => setShowDealModal(true)} className="flex items-center gap-2 text-xs font-bold uppercase hover:underline"><Plus size={14}/> Ny affär</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                            {['QUALIFY', 'PROPOSAL', 'NEGOTIATION', 'WON'].map(stage => (
                                <div key={stage} className="min-w-[280px] bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 flex flex-col">
                                    <div className="mb-4 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stage}</span>
                                        <span className="bg-white dark:bg-gray-800 px-2 rounded-full text-xs font-bold">{deals.filter(d => d.stage === stage).length}</span>
                                    </div>
                                    <div className="space-y-3 overflow-y-auto flex-1">
                                        {deals.filter(d => d.stage === stage).map(d => (
                                            <div key={d.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-black dark:hover:border-white transition-colors">
                                                <h4 className="font-bold text-sm mb-1">{d.title}</h4>
                                                <div className="flex justify-between items-center text-xs text-gray-500">
                                                    <span>{d.value} kr</span>
                                                    <span>{d.probability}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. CONTACTS */}
                {activeTab === 'contacts' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="relative max-w-xs w-full">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input placeholder="Sök kontakter..." className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl pl-10 py-3 text-sm outline-none focus:ring-1 focus:ring-black"/>
                            </div>
                            <button onClick={() => setShowContactModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2">
                                <Plus size={14}/> Ny Kontakt
                            </button>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {contacts.map(c => (
                                <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow group relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-lg font-bold font-serif">{c.name[0]}</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">{c.type}</span>
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">{c.name}</h4>
                                    <p className="text-xs text-gray-500 mb-4">{c.company || 'Privatperson'}</p>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        {c.email && <div className="flex items-center gap-2"><Mail size={14}/> {c.email}</div>}
                                        {c.phone && <div className="flex items-center gap-2"><Phone size={14}/> {c.phone}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. IMPACT / SUSTAINABILITY */}
                {activeTab === 'impact' && (
                    <div className="space-y-8">
                        <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[3rem] border border-green-100 dark:border-green-800 relative overflow-hidden">
                            <Leaf size={120} className="absolute -right-10 -bottom-10 text-green-200 dark:text-green-900/40 rotate-12"/>
                            <div className="relative z-10">
                                <h3 className="text-sm font-black uppercase tracking-widest text-green-700 dark:text-green-400 mb-2">Vår Hållbarhetsimpact</h3>
                                <p className="text-3xl font-serif-display text-gray-900 dark:text-white mb-6">Ni har gjort <span className="text-green-600">{logs.length}</span> aktiva val för miljön.</p>
                                <button onClick={async () => {
                                    const story = await db.generateUfStory(user.id);
                                    navigator.clipboard.writeText(story);
                                    alert("Rapporttext kopierad till urklipp!");
                                }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-green-700 transition-colors">
                                    Generera Rapporttext
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Loggade Insatser</h3>
                            <div className="space-y-4">
                                {logs.map(log => (
                                    <div key={log.id} className="flex gap-4 items-start p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="mt-1"><CheckCircle2 size={16} className="text-green-500"/></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{log.impact_description}</p>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{log.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            
            {/* SALE MODAL (B2C) */}
            {showSaleModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative">
                        <button onClick={() => setShowSaleModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">Logga Försäljning (B2C)</h2>
                        <form onSubmit={handleLogSale} className="space-y-4">
                            <input name="product" placeholder="Produktnamn" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <div className="flex gap-4">
                                <input name="qty" type="number" placeholder="Antal" defaultValue="1" className="w-1/3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                                <input name="price" type="number" placeholder="Pris (st)" required className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            </div>
                            <select name="channel" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-gray-500 dark:text-gray-400">
                                <option value="FAIR">Mässa</option>
                                <option value="WEB">Webbshop</option>
                                <option value="INSTAGRAM">Instagram</option>
                                <option value="OTHER">Annat</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest mt-4">Spara Sälj</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DEAL MODAL (B2B) */}
            {showDealModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative">
                        <button onClick={() => setShowDealModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">Ny Affärsmöjlighet (B2B)</h2>
                        <form onSubmit={handleAddDeal} className="space-y-4">
                            <input name="title" placeholder="Affärens namn (t.ex. Sponsoravtal)" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="company" placeholder="Företag / Motpart" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="value" type="number" placeholder="Estimerat värde (kr)" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <select name="stage" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-gray-500 dark:text-gray-400">
                                <option value="QUALIFY">Kvalificering</option>
                                <option value="PROPOSAL">Förslag skickat</option>
                                <option value="NEGOTIATION">Förhandling</option>
                                <option value="WON">Vunnen</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest mt-4">Skapa Affär</button>
                        </form>
                    </div>
                </div>
            )}

            {/* EVENT MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative">
                        <button onClick={() => setShowEventModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">Lägg till Händelse</h2>
                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <input name="title" placeholder="Vad händer?" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="date" type="date" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white text-gray-500 dark:text-gray-400"/>
                            <select name="type" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-gray-500 dark:text-gray-400">
                                <option value="UF_FAIR">UF-mässa</option>
                                <option value="DEADLINE">Deadline</option>
                                <option value="COMPETITION">Tävling</option>
                                <option value="OTHER">Annat</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest mt-4">Spara i Kalender</button>
                        </form>
                    </div>
                </div>
            )}

            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 relative">
                        <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 text-gray-400"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">Ny Kontakt</h2>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <select name="type" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold dark:text-white">
                                <option value="PERSON">Person</option>
                                <option value="COMPANY">Företag</option>
                            </select>
                            <input name="name" placeholder="Namn" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="company" placeholder="Företag / Organisation" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="email" type="email" placeholder="E-post" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <button className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest">Spara</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
);

const TabButton = ({ id, label, icon, active, onClick }: { id: Tab, label: string, icon: any, active: boolean, onClick: (t: Tab) => void }) => (
    <button 
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    >
        {icon} {label}
    </button>
);

export default CRM;
