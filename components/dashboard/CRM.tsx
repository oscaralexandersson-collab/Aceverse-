
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Plus, Search, Mail, Phone, Calendar as CalendarIcon,
    ArrowRight, BarChart3, TrendingUp, DollarSign, CheckCircle2, 
    Target, Leaf, Award, Briefcase, Zap, Filter, MoreHorizontal,
    ShoppingBag, Trash2, Edit2, Loader2, X, GripVertical, Building2, Pencil,
    Globe, Linkedin, Copy, RefreshCw, Send, AlertCircle, Sparkles, Clock
} from 'lucide-react';
import { User, Contact, Deal, SalesEvent, SustainabilityLog, UfEvent, Recommendation, Badge, DealStage, MailRecipient, MailTemplateType, MailTone } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';

type Tab = 'dashboard' | 'sales' | 'deals' | 'contacts' | 'mail' | 'impact';

interface CRMProps {
    user: User;
}

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const { activeWorkspace, viewScope } = useWorkspace(); 
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

    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);

    const [editingSale, setEditingSale] = useState<SalesEvent | any>(null);
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    // Delete State
    const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'SALE' | 'DEAL', name: string} | null>(null);

    const [recipients, setRecipients] = useState<MailRecipient[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<MailRecipient | null>(null);
    const [mailTemplate, setMailTemplate] = useState<MailTemplateType>('COLD_INTRO');
    const [mailTone, setMailTone] = useState<MailTone>('FORMAL');
    const [mailContext, setMailContext] = useState('');
    const [meetingTime, setMeetingTime] = useState(''); 
    const [generatedSubject, setGeneratedSubject] = useState('');
    const [generatedBody, setGeneratedBody] = useState('');
    const [isGeneratingMail, setIsGeneratingMail] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [user.id, activeWorkspace?.id, viewScope]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            const filterScope = (item: any) => {
                const itemId = item.workspace_id;
                if (viewScope === 'personal') return itemId === null || itemId === undefined || itemId === '';
                return activeWorkspace?.id && itemId === activeWorkspace.id;
            };

            const filteredContacts = data.contacts.filter(filterScope);
            const filteredDeals = data.deals.filter(filterScope);
            const filteredSales = data.salesEvents.filter(filterScope);
            const filteredLogs = data.sustainabilityLogs.filter(filterScope);
            const filteredEvents = data.ufEvents.filter(filterScope);

            setContacts(filteredContacts);
            setDeals(filteredDeals);
            setSales(filteredSales);
            setLogs(filteredLogs);
            setUfEvents(filteredEvents);
            setPoints(data.points);
            setBadges(data.badges);
            
            const mailRecipients: MailRecipient[] = [
                ...filteredContacts.map(c => ({
                    id: c.id, origin: 'CONTACT' as const, name: c.name, email: c.email, company: c.company,
                    lastInteraction: c.last_interaction_at ? new Date(c.last_interaction_at).toLocaleDateString() : undefined
                })),
                ...filteredDeals.map(d => ({
                    id: d.id, origin: 'DEAL' as const, name: d.title, company: d.company, context: `Deal Stage: ${d.stage}, Value: ${d.value}`,
                }))
            ];
            setRecipients(mailRecipients);
            const newRecs = await db.getRecommendations(user.id);
            setRecs(newRecs);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedDealId(id); e.dataTransfer.setData('dealId', id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('opacity-50'); };
    const handleDragEnd = (e: React.DragEvent) => { setDraggedDealId(null); e.currentTarget.classList.remove('opacity-50'); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        const dealId = e.dataTransfer.getData('dealId');
        if (!dealId) return;
        setDeals(prevDeals => prevDeals.map(deal => deal.id === dealId ? { ...deal, stage: newStage } : deal));
        setDraggedDealId(null);
        try { await db.updateDeal(user.id, dealId, { stage: newStage }); } catch (err) { console.error("Failed to move deal", err); loadData(); }
    };

    const handleSaveSale = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const amount = Number(formData.get('price')) * Number(formData.get('qty'));
        
        const saleData = {
            product_name: formData.get('product') as string,
            quantity: Number(formData.get('qty')),
            amount: amount,
            customer_count: Number(formData.get('customers') || 1),
            channel: formData.get('channel') as string,
            workspace_id: viewScope === 'workspace' && activeWorkspace ? activeWorkspace.id : null
        };

        try {
            if (editingSale) { await db.updateSale(user.id, editingSale.id, saleData); } 
            else { await db.logSale(user.id, saleData); }
            setShowSaleModal(false); setEditingSale(null); loadData();
        } catch (error) { console.error("Save sale error:", error); alert("Kunde inte spara försäljningen."); }
    };

    const handleSaveDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const dealData = { title: formData.get('title') as string, company: formData.get('company') as string, value: Number(formData.get('value')), stage: formData.get('stage') as any, workspace_id: viewScope === 'workspace' && activeWorkspace ? activeWorkspace.id : null };
        try {
            if (editingDeal) { await db.updateDeal(user.id, editingDeal.id, dealData); } 
            else { await db.addDeal(user.id, dealData); }
            setShowDealModal(false); setEditingDeal(null); loadData();
        } catch (error) { console.error("Save deal error:", error); alert("Kunde inte spara affären."); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'SALE') {
                await db.deleteSale(itemToDelete.id);
                setSales(prev => prev.filter(s => s.id !== itemToDelete.id));
            } else if (itemToDelete.type === 'DEAL') {
                await db.deleteDeal(itemToDelete.id);
                setDeals(prev => prev.filter(d => d.id !== itemToDelete.id));
            }
        } catch (e) {
            console.error(e);
            alert("Kunde inte ta bort objektet.");
        } finally {
            setItemToDelete(null);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try { await db.addUfEvent(user.id, { title: formData.get('title') as string, date_at: new Date(formData.get('date') as string).toISOString(), type: formData.get('type') as any, workspace_id: viewScope === 'workspace' && activeWorkspace ? activeWorkspace.id : null }); setShowEventModal(false); loadData(); } 
        catch (error) { console.error("Save event error:", error); alert("Kunde inte spara händelsen."); }
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const contactData = { name: formData.get('name') as string, type: formData.get('type') as any, company: formData.get('company') as string, email: formData.get('email') as string, phone: formData.get('phone') as string, website: formData.get('website') as string, linkedin: formData.get('linkedin') as string, workspace_id: viewScope === 'workspace' && activeWorkspace ? activeWorkspace.id : null };
        try {
            if (editingContact) { await db.updateContact(user.id, editingContact.id, contactData); } 
            else { await db.addContact(user.id, contactData); }
            setShowContactModal(false); setEditingContact(null); loadData();
        } catch (error) { console.error("Save contact error:", error); alert("Kunde inte spara kontakten."); }
    };

    const handleGenerateMail = async () => {
        if (!selectedRecipient) return;
        setIsGeneratingMail(true);
        try {
            const response = await db.generateAiEmail({ recipient: selectedRecipient, template: mailTemplate, tone: mailTone, extraContext: mailContext, meetingTime: meetingTime, senderName: `${user.firstName} ${user.lastName}`, senderCompany: user.company || 'Vårt UF-företag' });
            setGeneratedSubject(response.subject); setGeneratedBody(response.body);
        } catch (e) { console.error(e); alert("Kunde inte generera mailet."); } finally { setIsGeneratingMail(false); }
    };

    // Improved Send Mail Handler using Hidden Anchor Tag
    const handleSendMail = () => {
        if (!selectedRecipient?.email || !generatedBody) return;
        
        const subject = encodeURIComponent(generatedSubject || '');
        const body = encodeURIComponent(generatedBody || '');
        const fullLink = `mailto:${selectedRecipient.email}?subject=${subject}&body=${body}`;
        
        // Browsers/Clients have URL limits. If too long, copy to clipboard.
        // Limit is around 2000 chars for safety across most clients.
        if (fullLink.length > 1900) {
            navigator.clipboard.writeText(generatedBody || '');
            alert("Mailet är för långt för att öppnas direkt. Texten har kopierats till urklipp. Klistra in den i ditt mailprogram (Ctrl+V).");
            
            // Open with just recipient and subject
            const shortLink = `mailto:${selectedRecipient.email}?subject=${subject}`;
            const link = document.createElement('a');
            link.href = shortLink;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Create hidden link and click it to bypass some browser popup blocker logic
            const link = document.createElement('a');
            link.href = fullLink;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredRecipients = useMemo(() => {
        if (!searchTerm) return recipients;
        return recipients.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || (r.company && r.company.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [recipients, searchTerm]);

    const openEditSale = (sale: SalesEvent) => { setEditingSale(sale); setShowSaleModal(true); };
    const openEditDeal = (deal: Deal) => { setEditingDeal(deal); setShowDealModal(true); };
    const openEditContact = (contact: Contact) => { setEditingContact(contact); setShowContactModal(true); };

    const getMainAction = () => {
        if (activeTab === 'deals') return { label: 'Ny Affär (B2B)', action: () => { setEditingDeal(null); setShowDealModal(true); }, icon: <Briefcase size={16}/> };
        return { label: 'Ny Försäljning (B2C)', action: () => { setEditingSale(null); setShowSaleModal(true); }, icon: <Plus size={16}/> };
    };

    const mainAction = getMainAction();

    const getB2BStats = () => {
        const wonDeals = deals.filter(d => d.stage === 'WON');
        const activeDeals = deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST');
        const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;
        return { wonRevenue, pipelineValue, winRate, activeCount: activeDeals.length };
    };

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex flex-col h-full gap-6 animate-fadeIn pb-20">
            <DeleteConfirmModal 
                isOpen={!!itemToDelete} 
                onClose={() => setItemToDelete(null)} 
                onConfirm={handleDelete} 
                itemName={itemToDelete?.name || ''} 
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <h1 className="font-serif-display text-4xl text-gray-900 dark:text-white mb-2">CRM & Sälj</h1>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <TabButton id="dashboard" label="Fokus" icon={<Target size={14}/>} active={activeTab === 'dashboard'} onClick={setActiveTab} />
                        <TabButton id="sales" label="Sälj (B2C)" icon={<ShoppingBag size={14}/>} active={activeTab === 'sales'} onClick={setActiveTab} />
                        <TabButton id="deals" label="Affärer (B2B)" icon={<Briefcase size={14}/>} active={activeTab === 'deals'} onClick={setActiveTab} />
                        <TabButton id="contacts" label="Kontakter" icon={<Users size={14}/>} active={activeTab === 'contacts'} onClick={setActiveTab} />
                        <TabButton id="mail" label="E-post" icon={<Mail size={14}/>} active={activeTab === 'mail'} onClick={setActiveTab} />
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

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
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

                {activeTab === 'sales' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="Omsättning idag" value={`${sales.filter(s => new Date(s.occurred_at).toDateString() === new Date().toDateString()).reduce((acc,s) => acc+s.amount, 0)} kr`} />
                            <StatBox label="Totalt sålt" value={`${sales.reduce((acc,s) => acc+s.amount, 0)} kr`} />
                            <StatBox label="Antal kunder" value={sales.reduce((acc,s) => acc+(s.customer_count || 1), 0).toString()} />
                            <StatBox label="Snittorder" value={`${Math.round(sales.length ? sales.reduce((acc,s) => acc+s.amount, 0)/sales.length : 0)} kr`} />
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Säljhierarki</h3>
                                <button onClick={() => { setEditingSale(null); setShowSaleModal(true); }} className="text-xs font-bold uppercase underline">Logga ny</button>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-black text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Produkt</th>
                                        <th className="px-6 py-4">Kanal</th>
                                        <th className="px-6 py-4">Kunder</th>
                                        <th className="px-6 py-4">Datum</th>
                                        <th className="px-6 py-4 text-right">Belopp</th>
                                        <th className="px-6 py-4 text-right">Åtgärd</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {sales.map(s => (
                                        <tr key={s.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 font-bold">{s.product_name} <span className="text-gray-400 text-xs font-normal">x{s.quantity}</span></td>
                                            <td className="px-6 py-4"><span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-[10px] font-bold uppercase">{s.channel}</span></td>
                                            <td className="px-6 py-4 font-bold">{s.customer_count || 1}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(s.occurred_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold">{s.amount} kr</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEditSale(s)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => setItemToDelete({ id: s.id, type: 'SALE', name: `${s.product_name} (${s.amount} kr)` })} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'deals' && (
                    <div className="h-full flex flex-col">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatBox label="Total Pipeline" value={`${getB2BStats().pipelineValue} kr`} />
                            <StatBox label="Vunna Affärer" value={`${getB2BStats().wonRevenue} kr`} />
                            <StatBox label="Aktiva Affärer" value={getB2BStats().activeCount.toString()} />
                            <StatBox label="Vinstfrekvens" value={`${getB2BStats().winRate}%`} />
                        </div>
                        <div className="flex justify-between mb-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Säljpipeline</h3>
                            <button onClick={() => { setEditingDeal(null); setShowDealModal(true); }} className="flex items-center gap-2 text-xs font-bold uppercase hover:underline"><Plus size={14}/> Ny affär</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                            {(['QUALIFY', 'PROPOSAL', 'NEGOTIATION', 'WON'] as DealStage[]).map(stage => (
                                <div key={stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage)} className="min-w-[280px] bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 flex flex-col transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-800">
                                    <div className="mb-4 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stage}</span>
                                        <span className="bg-white dark:bg-gray-800 px-2 rounded-full text-xs font-bold">{deals.filter(d => d.stage === stage).length}</span>
                                    </div>
                                    <div className="space-y-3 overflow-y-auto flex-1">
                                        {deals.filter(d => d.stage === stage).map(d => (
                                            <div key={d.id} draggable onDragStart={(e) => handleDragStart(e, d.id)} onDragEnd={handleDragEnd} onClick={() => openEditDeal(d)} className={`bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing hover:border-black dark:hover:border-white transition-all group relative ${draggedDealId === d.id ? 'opacity-50 border-black dark:border-white' : ''}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-sm pr-6">{d.title}</h4>
                                                    <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                                                </div>
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: d.id, type: 'DEAL', name: d.title }); }} 
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <Building2 size={12} />
                                                    <span className="truncate font-medium">{d.company || 'Företag saknas'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-50 dark:border-gray-800 pt-2 mt-2">
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{d.value} kr</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.probability > 70 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.probability}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="relative max-w-xs w-full">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input placeholder="Sök kontakter..." className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl pl-10 py-3 text-sm outline-none focus:ring-1 focus:ring-black"/>
                            </div>
                            <button onClick={() => { setEditingContact(null); setShowContactModal(true); }} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2">
                                <Plus size={14}/> Ny Kontakt
                            </button>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {contacts.map(c => (
                                <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow group relative flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-lg font-bold font-serif">{c.name[0]}</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">{c.type}</span>
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">{c.name}</h4>
                                    <p className="text-xs text-gray-500 mb-4">{c.company || 'Privatperson'}</p>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6 flex-1">
                                        {c.email && <div className="flex items-center gap-2 truncate"><Mail size={14}/> {c.email}</div>}
                                        {c.phone && <div className="flex items-center gap-2 truncate"><Phone size={14}/> {c.phone}</div>}
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-50 dark:border-gray-800 items-center">
                                        {c.website && <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="Webbplats"><Globe size={14} /></a>}
                                        {c.linkedin && <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:text-[#0077b5] transition-colors" title="LinkedIn"><Linkedin size={14} /></a>}
                                        <button onClick={() => openEditContact(c)} className="ml-auto p-2 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700" title="Redigera kontakt"><Edit2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'mail' && (
                    <div className="grid lg:grid-cols-2 gap-8 h-full">
                        <div className="space-y-6 overflow-y-auto pr-2">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">{t('dashboard.crmContent.mail.recipient')}</h3>
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    <input type="text" placeholder={t('dashboard.crmContent.mail.recipientPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 pl-12 pr-4 py-3 rounded-xl border border-transparent focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-sm"/>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar border border-gray-100 dark:border-gray-800 rounded-xl p-2 bg-gray-50/50 dark:bg-gray-900/50">
                                    {filteredRecipients.map(r => (
                                        <button key={r.id} onClick={() => setSelectedRecipient(r)} className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-all ${selectedRecipient?.id === r.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-white dark:hover:bg-gray-800'}`}>
                                            <div>
                                                <div className="font-bold text-sm">{r.name}</div>
                                                <div className={`text-xs ${selectedRecipient?.id === r.id ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}`}>{r.company || 'Okänt företag'}</div>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${selectedRecipient?.id === r.id ? 'bg-white/20 text-white dark:text-black' : r.origin === 'DEAL' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'}`}>{r.origin === 'DEAL' ? t('dashboard.crmContent.mail.originB2B') : t('dashboard.crmContent.mail.originContact')}</span>
                                        </button>
                                    ))}
                                </div>
                                {selectedRecipient && !selectedRecipient.email && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start gap-3 mb-6 border border-red-100 dark:border-red-900">
                                        <AlertCircle size={18} className="text-red-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-red-700 dark:text-red-300">{t('dashboard.crmContent.mail.noEmailWarning')}</p>
                                            <button onClick={() => { if (selectedRecipient.origin === 'CONTACT') { const c = contacts.find(x => x.id === selectedRecipient.id); if (c) openEditContact(c); } else { const d = deals.find(x => x.id === selectedRecipient.id); if (d) openEditDeal(d); } }} className="text-xs underline text-red-600 dark:text-red-400 mt-1">Lägg till nu</button>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">{t('dashboard.crmContent.mail.templates.label')}</label>
                                        <select value={mailTemplate} onChange={(e) => setMailTemplate(e.target.value as MailTemplateType)} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:text-white">
                                            <option value="COLD_INTRO">{t('dashboard.crmContent.mail.templates.COLD_INTRO')}</option>
                                            <option value="THANK_MEETING">{t('dashboard.crmContent.mail.templates.THANK_MEETING')}</option>
                                            <option value="PARTNERSHIP_REQUEST">{t('dashboard.crmContent.mail.templates.PARTNERSHIP_REQUEST')}</option>
                                            <option value="FOLLOW_UP">{t('dashboard.crmContent.mail.templates.FOLLOW_UP')}</option>
                                            <option value="BOOK_MEETING">{t('dashboard.crmContent.mail.templates.BOOK_MEETING')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">{t('dashboard.crmContent.mail.tone.label')}</label>
                                        <select value={mailTone} onChange={(e) => setMailTone(e.target.value as MailTone)} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:text-white">
                                            <option value="FORMAL">{t('dashboard.crmContent.mail.tone.FORMAL')}</option>
                                            <option value="FRIENDLY">{t('dashboard.crmContent.mail.tone.FRIENDLY')}</option>
                                            <option value="ENTHUSIASTIC">{t('dashboard.crmContent.mail.tone.ENTHUSIASTIC')}</option>
                                            <option value="SHORT">{t('dashboard.crmContent.mail.tone.SHORT')}</option>
                                        </select>
                                    </div>
                                </div>
                                {(mailTemplate === 'BOOK_MEETING' || mailTemplate === 'THANK_MEETING') && (
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase flex items-center gap-2"><Clock size={12} /> {mailTemplate === 'BOOK_MEETING' ? 'Förslag på tid' : 'När sågs vi?'}</label>
                                        <input type="datetime-local" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:text-white"/>
                                    </div>
                                )}
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">{t('dashboard.crmContent.mail.context')}</label>
                                    <textarea value={mailContext} onChange={(e) => setMailContext(e.target.value)} placeholder={t('dashboard.crmContent.mail.contextPlaceholder')} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm h-24 resize-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white dark:text-white"/>
                                </div>
                                <button onClick={handleGenerateMail} disabled={!selectedRecipient || isGeneratingMail} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                                    {isGeneratingMail ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                    {isGeneratingMail ? t('dashboard.crmContent.mail.btnGenerating') : t('dashboard.crmContent.mail.btnGenerate')}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <input value={generatedSubject} onChange={(e) => setGeneratedSubject(e.target.value)} placeholder="Ämne..." className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-gray-400 dark:text-white"/>
                            </div>
                            <textarea value={generatedBody} onChange={(e) => setGeneratedBody(e.target.value)} placeholder="Ditt mail visas här..." className="flex-1 w-full p-6 bg-transparent resize-none outline-none text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium"/>
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="text-xs text-gray-400">{generatedBody.length > 0 ? `${generatedBody.length} tecken` : ''}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => { navigator.clipboard.writeText(`${generatedSubject}\n\n${generatedBody}`); alert(t('dashboard.crmContent.mail.copied')); }} disabled={!generatedBody} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 disabled:opacity-50"><Copy size={14} /> {t('dashboard.crmContent.mail.copy')}</button>
                                    <button 
                                        onClick={handleSendMail} 
                                        disabled={!selectedRecipient?.email || !generatedBody}
                                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={14} /> Maila
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'impact' && (
                    <div className="space-y-8">
                        <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[3rem] border border-green-100 dark:border-green-800 relative overflow-hidden">
                            <Leaf size={120} className="absolute -right-10 -bottom-10 text-green-200 dark:text-green-900/40 rotate-12"/>
                            <div className="relative z-10">
                                <h3 className="text-sm font-black uppercase tracking-widest text-green-700 dark:text-green-400 mb-2">Vår Hållbarhetsimpact</h3>
                                <p className="text-3xl font-serif-display text-gray-900 dark:text-white mb-6">Ni har gjort <span className="text-green-600">{logs.length}</span> aktiva val för miljön.</p>
                                <button onClick={async () => { const story = await db.generateUfStory(user.id); navigator.clipboard.writeText(story); alert("Rapporttext kopierad till urklipp!"); }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-green-700 transition-colors">Generera Rapporttext</button>
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

            {showSaleModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative">
                        <button onClick={() => setShowSaleModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">{editingSale ? 'Redigera Försäljning' : 'Logga Försäljning (B2C)'}</h2>
                        <form onSubmit={handleSaveSale} className="space-y-4">
                            <input name="product" defaultValue={editingSale?.product_name} placeholder="Produktnamn" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2">Antal varor</label>
                                    <input name="qty" type="number" placeholder="Antal varor" defaultValue={editingSale?.quantity || 1} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2">Antal kunder</label>
                                    <input name="customers" type="number" placeholder="Antal kunder" defaultValue={editingSale?.customer_count || 1} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                                </div>
                            </div>
                            <input name="price" type="number" placeholder="Pris (per vara)" defaultValue={editingSale ? editingSale.amount / editingSale.quantity : ''} required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <select name="channel" defaultValue={editingSale?.channel} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-gray-500 dark:text-gray-400">
                                <option value="FAIR">Mässa</option>
                                <option value="WEB">Webbshop</option>
                                <option value="INSTAGRAM">Instagram</option>
                                <option value="OTHER">Annat</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest mt-4">{editingSale ? 'Spara ändringar' : 'Spara Sälj'}</button>
                        </form>
                    </div>
                </div>
            )}
            {showDealModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative">
                        <button onClick={() => setShowDealModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">{editingDeal ? 'Redigera Affär' : 'Ny Affärsmöjlighet (B2B)'}</h2>
                        <form onSubmit={handleSaveDeal} className="space-y-4">
                            <input name="title" defaultValue={editingDeal?.title} placeholder="Affärens namn (t.ex. Sponsoravtal)" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="company" defaultValue={editingDeal?.company} placeholder="Företag / Motpart" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="value" type="number" defaultValue={editingDeal?.value} placeholder="Estimerat värde (kr)" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <select name="stage" defaultValue={editingDeal?.stage || 'QUALIFY'} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-gray-500 dark:text-gray-400">
                                <option value="QUALIFY">Kvalificering</option>
                                <option value="PROPOSAL">Förslag skickat</option>
                                <option value="NEGOTIATION">Förhandling</option>
                                <option value="WON">Vunnen</option>
                            </select>
                            <button className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest mt-4">{editingDeal ? 'Uppdatera Affär' : 'Skapa Affär'}</button>
                        </form>
                    </div>
                </div>
            )}
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
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 relative animate-slideUp overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 text-gray-400"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6">{editingContact ? 'Redigera Kontakt' : 'Ny Kontakt'}</h2>
                        <form onSubmit={handleSaveContact} className="space-y-4">
                            <select name="type" defaultValue={editingContact?.type || 'PERSON'} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold dark:text-white">
                                <option value="PERSON">Person</option>
                                <option value="COMPANY">Företag</option>
                            </select>
                            <input name="name" defaultValue={editingContact?.name} placeholder="Namn" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="company" defaultValue={editingContact?.company} placeholder="Företag / Organisation" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="email" defaultValue={editingContact?.email} type="email" placeholder="E-post" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <input name="phone" defaultValue={editingContact?.phone} type="tel" placeholder="Telefon" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            <div className="grid grid-cols-2 gap-4">
                                <input name="website" defaultValue={editingContact?.website} placeholder="Webbplats" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                                <input name="linkedin" defaultValue={editingContact?.linkedin} placeholder="LinkedIn URL" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold dark:text-white"/>
                            </div>
                            <button className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest mt-2">{editingContact ? 'Spara ändringar' : 'Spara'}</button>
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
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{icon} {label}</button>
);

export default CRM;
