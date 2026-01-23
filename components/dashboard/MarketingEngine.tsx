
import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Linkedin, Instagram, Mail, 
    Loader2, ArrowRight, Wand2, Plus, 
    CheckCircle2, Target, Image as ImageIcon,
    PanelLeftClose, PanelLeftOpen, Trash2, 
    Zap, Search, Frame, ArrowLeft, Trophy, Newspaper,
    ShoppingBag, Calendar, ArrowRightCircle, Check, Send
} from 'lucide-react';
import { User, MarketingCampaign, CampaignAsset, Deal, SalesEvent, UfEvent } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface MarketingEngineProps {
    user: User;
    initialContext?: any;
}

type WizardStep = 'choice' | 'results' | 'generating' | 'editor';
type ContentCategory = 'DEAL' | 'SALES_MILESTONE' | 'EVENT';

const MarketingEngine: React.FC<MarketingEngineProps> = ({ user, initialContext }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    
    // --- State ---
    const [step, setStep] = useState<WizardStep>('choice');
    const [category, setCategory] = useState<ContentCategory | null>(null);
    const [foundItems, setFoundItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [activeCampaign, setActiveCampaign] = useState<MarketingCampaign | null>(null);
    const [activeAsset, setActiveAsset] = useState<CampaignAsset | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MarketingCampaign | null>(null);

    useEffect(() => {
        loadCampaigns();
    }, [user.id, activeWorkspace?.id, viewScope]);

    const loadCampaigns = async () => {
        try {
            const data = await db.getUserData(user.id);
            const filterScope = (item: any) => {
                const itemId = item.workspace_id;
                if (viewScope === 'personal') return !itemId;
                return activeWorkspace?.id && itemId === activeWorkspace.id;
            };
            if (data.marketingCampaigns) {
                setCampaigns(data.marketingCampaigns
                    .filter(filterScope)
                    .sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
                );
            }
        } catch (e) {
            console.error("Failed to load campaigns", e);
        }
    };

    const handleSelectCampaign = (c: MarketingCampaign) => {
        setActiveCampaign(c);
        setActiveAsset(c.assets[0]);
        setStep('editor');
    };

    const toggleStatus = async () => {
        if (!activeCampaign) return;
        const nextStatus = activeCampaign.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
        try {
            await db.updateMarketingCampaignStatus(activeCampaign.id, nextStatus);
            setActiveCampaign({ ...activeCampaign, status: nextStatus });
            setCampaigns(prev => prev.map(c => c.id === activeCampaign.id ? { ...c, status: nextStatus } : c));
        } catch (e) {
            console.error(e);
        }
    };

    // --- STEP 1: Scan for data ---
    const scanSystem = async (cat: ContentCategory) => {
        setCategory(cat);
        setStep('results');
        const data = await db.getUserData(user.id);
        const filterScope = (item: any) => {
            const itemId = item.workspace_id;
            if (viewScope === 'personal') return !itemId;
            return activeWorkspace?.id && itemId === activeWorkspace.id;
        };

        if (cat === 'DEAL') {
            const targetDeals = (data.deals || []).filter(filterScope).filter(d => d.stage === 'WON' || d.stage === 'NEGOTIATION');
            setFoundItems(targetDeals.map(d => ({ 
                ...d, 
                displayTitle: d.stage === 'WON' ? `Vunnen affär: ${d.company}` : `I förhandling: ${d.company}`, 
                detail: d.stage === 'WON' ? `En stor seger för teamet!` : `Stora saker är på gång...`,
                isTeaser: d.stage === 'NEGOTIATION',
                type: 'DEAL'
            })));
        } else if (cat === 'SALES_MILESTONE') {
            const sales = (data.salesEvents || []).filter(filterScope);
            const totalRevenue = sales.reduce((acc, s) => acc + s.amount, 0);
            const totalCustomers = sales.reduce((acc, s) => acc + (s.customer_count || 1), 0);
            
            setFoundItems([
                { id: 'm1', type: 'MILESTONE', milestone_type: 'REVENUE', value: totalRevenue, displayTitle: `Milstolpe: Omsättning`, detail: `Ni har sålt för totalt ${totalRevenue} kr!` },
                { id: 'm2', type: 'MILESTONE', milestone_type: 'CUSTOMERS', value: totalCustomers, displayTitle: `Milstolpe: Antal kunder`, detail: `Ni har nu betjänat ${totalCustomers} kunder!` }
            ]);
        } else if (cat === 'EVENT') {
            const events = (data.ufEvents || []).filter(filterScope).filter(e => new Date(e.date_at) > new Date());
            setFoundItems(events.map(e => ({ ...e, displayTitle: `Kommande: ${e.title}`, detail: new Date(e.date_at).toLocaleDateString(), type: 'EVENT' })));
        }
    };

    // --- STEP 2: Generate Content ---
    const generateContent = async (item: any) => {
        setSelectedItem(item);
        setStep('generating');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Du är en principfast, analytisk och värderingsdriven LinkedIn-skribent med hög integritet. Du skriver korta, skarpa inlägg som tar tydlig ställning och som ofta får högt engagemang.

            UPPGIFT:
            Skriv ett LinkedIn-inlägg om följande ämne baserat på data från vårt UF-företag (${user.company}).
            ÄMNE: ${item.displayTitle}. 
            DETALJER: ${item.detail}.
            BRANSCH: ${user.industry || 'Entreprenörskap'}.

            STIL OCH STRUKTUR (OBLIGATORISKT):
            1. Börja med en rak, friktionsskapande mening som tydligt signalerar ställning.
            2. Undvik fluff, emojis och marknadsföringsspråk.
            3. Ta en tydlig värdeposition tidigt.
            4. Använd informationen i ÄMNE som ett konkret exempel, scenario eller beslut.
            5. Lyft sedan perspektivet till ett större system-, etik- eller samhällsplan.
            6. AVSLUTA MED EN TYDLIG CTA (Call to Action). Uppmana läsaren till en specifik tanke eller handling relaterad till era värderingar (t.ex. "Följ vår resa mot en mer hållbar bransch" eller "Hör av dig om du delar vår vision för lokalt hantverk").
            7. Avsluta med en kompromisslös slutsats efter CTA:n.
            8. Längd: 4–8 korta stycken. Max ~150 ord.
            9. Avsluta med 3–5 korta hashtags som speglar värderingar, inte trender.

            VIKTIGA REGLER (STRÄNGA):
            - NÄMNA ALDRIG kronor, belopp eller exakta monetära värden i texten.
            - Språk: Svenska.

            Returnera JSON:
            {
              "headline": "En slagkraftig rubrik",
              "body": "Själva texten med korrekt formatering",
              "hashtags": ["värdering1", "värdering2", "..."],
              "cta": "Själva CTA-texten (om den inte redan är inbakad i body)",
              "image_suggestion": "Beskrivning av bild"
            }`;

            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(res.text || '{}');
            
            const newAsset: CampaignAsset = {
                id: crypto.randomUUID(),
                channel: 'LinkedIn',
                content: {
                    headline: result.headline,
                    body: result.body,
                    hashtags: result.hashtags || [],
                    cta: result.cta
                },
                image: { prompt: result.image_suggestion }
            };

            const campaign: MarketingCampaign = {
                id: crypto.randomUUID(),
                name: item.displayTitle,
                brief: { 
                    goal: 'Principfast kommunikation', 
                    audience: 'Nätverk/Värderingsdrivna följare', 
                    timeframe: 'Nu', 
                    constraints: 'Inga emojis, inga belopp' 
                },
                assets: [newAsset],
                status: 'DRAFT',
                dateCreated: new Date().toISOString(),
                workspace_id: viewScope === 'workspace' ? (activeWorkspace?.id || null) : null
            };

            await db.addMarketingCampaign(user.id, campaign);
            
            setCampaigns([campaign, ...campaigns]);
            setActiveCampaign(campaign);
            setActiveAsset(newAsset);
            setStep('editor');

        } catch (e) {
            console.error("Generation failed:", e);
            alert("Något gick fel vid genereringen.");
            setStep('choice');
        }
    };

    const handleDeleteCampaign = async () => {
        if (!itemToDelete) return;
        try {
            await db.deleteMarketingCampaign(user.id, itemToDelete.id);
            setCampaigns(prev => prev.filter(c => c.id !== itemToDelete.id));
            if (activeCampaign && activeCampaign.id === itemToDelete.id) {
                setStep('choice');
                setActiveCampaign(null);
                setActiveAsset(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setItemToDelete(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-gray-950">
            <DeleteConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={handleDeleteCampaign} itemName={itemToDelete?.name || ''} />
            
            {/* Sidebar: History */}
            <div className={`bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Newspaper size={18} className="text-gray-400" /><h2 className="font-serif-display text-lg">Mina Inlägg</h2></div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"><PanelLeftClose size={18} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                    <button onClick={() => { setStep('choice'); setActiveAsset(null); setActiveCampaign(null); }} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-4">
                        <Plus size={16} /> Nytt Inlägg
                    </button>
                    {campaigns.map(c => (
                        <div key={c.id} className="group relative">
                            <button 
                                onClick={() => handleSelectCampaign(c)} 
                                className={`w-full text-left p-4 rounded-xl border transition-all ${activeCampaign?.id === c.id ? 'bg-white dark:bg-gray-800 border-black dark:border-white' : 'border-transparent hover:bg-white dark:hover:bg-gray-800'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="block text-xs font-bold truncate uppercase flex-1 mr-2">{c.name}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${c.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{c.status}</span>
                                </div>
                                <span className="block text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">{new Date(c.dateCreated).toLocaleDateString()}</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setItemToDelete(c); }} className="absolute right-2 bottom-4 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-y-auto custom-scrollbar relative">
                {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700"><PanelLeftOpen size={20} /></button>}

                {/* --- STEP: CHOICE --- */}
                {step === 'choice' && (
                    <div className="p-8 md:p-20 max-w-5xl mx-auto w-full animate-fadeIn">
                        <div className="mb-16">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4 block">Marketing Engine</span>
                            <h1 className="font-serif-display text-6xl mb-4 text-gray-900 dark:text-white leading-tight">Vad vill ni lägga upp <br/>för något idag?</h1>
                            <p className="text-gray-500 text-lg max-w-xl">Välj en kategori så letar jag igenom ert CRM efter de bästa nyheterna att dela med ert nätverk.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <ChoiceCard 
                                icon={<Trophy size={32}/>} 
                                title="Ny Affär / Samarbete" 
                                desc="Berätta om en kund ni precis signat eller något spännande på gång." 
                                onClick={() => scanSystem('DEAL')}
                                color="blue"
                            />
                            <ChoiceCard 
                                icon={<ShoppingBag size={32}/>} 
                                title="Sälj-milstolpe" 
                                desc="Fira att ni nått en milstolpe i antal kunder eller total omsättning." 
                                onClick={() => scanSystem('SALES_MILESTONE')}
                                color="green"
                            />
                            <ChoiceCard 
                                icon={<Calendar size={32}/>} 
                                title="Kommande Händelse" 
                                desc="Peppa inför en mässa, pitch-tävling eller produktlansering." 
                                onClick={() => scanSystem('EVENT')}
                                color="purple"
                            />
                        </div>
                    </div>
                )}

                {/* --- STEP: RESULTS --- */}
                {step === 'results' && (
                    <div className="p-8 md:p-20 max-w-4xl mx-auto w-full animate-fadeIn">
                        <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400 mb-8 hover:text-black dark:hover:text-white transition-colors">
                            <ArrowLeft size={16}/> Tillbaka
                        </button>
                        <h2 className="font-serif-display text-4xl mb-8">Här är vad jag hittade:</h2>
                        
                        <div className="space-y-4">
                            {foundItems.length > 0 ? foundItems.map((item, idx) => (
                                <button 
                                    key={item.id || idx} 
                                    onClick={() => generateContent(item)}
                                    className="w-full text-left p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:border-black dark:hover:border-white hover:shadow-xl transition-all group flex items-center justify-between"
                                >
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">{item.displayTitle}</h4>
                                        <p className="text-sm text-gray-500">{item.detail}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {item.isTeaser && <span className="text-[9px] font-black uppercase tracking-widest text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">Teaser</span>}
                                        <ArrowRightCircle size={24} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                    </div>
                                </button>
                            )) : (
                                <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                                    <Search size={40} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-400 font-medium">Hittade ingen data i denna kategori än. Prova att logga något i CRM:et först!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- STEP: GENERATING --- */}
                {step === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 animate-fadeIn">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                            <Sparkles size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
                        </div>
                        <h2 className="font-serif-display text-3xl mt-8 mb-2">Skriver ert inlägg...</h2>
                        <p className="text-gray-500 uppercase text-[10px] font-black tracking-widest animate-pulse">Inkluderar värderingsdriven CTA</p>
                    </div>
                )}

                {/* --- STEP: EDITOR --- */}
                {step === 'editor' && activeAsset && activeCampaign && (
                    <div className="p-8 md:p-16 max-w-6xl mx-auto w-full animate-fadeIn">
                        <div className="flex items-center justify-between mb-12">
                            <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                <ArrowLeft size={16}/> Nytt inlägg
                            </button>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={toggleStatus}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeCampaign.status === 'PUBLISHED' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {activeCampaign.status === 'PUBLISHED' ? <Check size={12}/> : <div className="w-2 h-2 rounded-full bg-gray-400"></div>}
                                    {activeCampaign.status === 'PUBLISHED' ? 'Publicerat' : 'Markera som klar'}
                                </button>
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <Linkedin size={14} /> LinkedIn Redo
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Copy Area */}
                            <div className="space-y-8">
                                <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 text-sm">
                                            {user.firstName[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{user.firstName} {user.lastName}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">Grundare, {user.company}</div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold mb-4">{activeAsset.content.headline}</h3>
                                    <textarea 
                                        value={activeAsset.content.body} 
                                        onChange={(e) => setActiveAsset({...activeAsset, content: {...activeAsset.content, body: e.target.value}})}
                                        className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm leading-relaxed resize-none font-medium"
                                    />
                                    
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {activeAsset.content.hashtags.map((h, i) => (
                                            <span key={i} className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">#{h}</span>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(`${activeAsset.content.body}\n\n${activeAsset.content.hashtags.map(h => '#'+h).join(' ')}`); alert("Inlägg kopierat till urklipp!"); }}
                                    className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl"
                                >
                                    Kopiera text för LinkedIn
                                </button>
                            </div>

                            {/* Visuals Area */}
                            <div className="space-y-6">
                                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[3rem] border border-blue-100 dark:border-blue-900 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 text-blue-600 mb-4">
                                            <ImageIcon size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Bildrekommendation</span>
                                        </div>
                                        <p className="text-lg font-serif-display text-gray-900 dark:text-white leading-relaxed italic">
                                            "{activeAsset.image?.prompt}"
                                        </p>
                                    </div>
                                    <div className="absolute -right-8 -bottom-8 opacity-5 text-blue-600"><ImageIcon size={200} /></div>
                                </div>

                                <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Strategitips för hög räckvidd</h4>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                            <CheckCircle2 size={14} className="text-green-500" /> Svara på kommentarer inom 60 minuter.
                                        </li>
                                        <li className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                            <CheckCircle2 size={14} className="text-green-500" /> Markera som publicerad här för att din AI-lärare ska veta.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChoiceCard = ({ icon, title, desc, onClick, color }: any) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    };

    return (
        <button 
            onClick={onClick}
            className="p-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3.5rem] text-left hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden h-full"
        >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${colors[color]}`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-4 leading-tight">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Skanna systemet <ArrowRight size={14} />
            </div>
        </button>
    );
};

export default MarketingEngine;
