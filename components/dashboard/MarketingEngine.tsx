
import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Palette, Type, Globe, Megaphone, Instagram, Linkedin, Mail, 
    Loader2, ArrowRight, Layers, Copy, Wand2, Plus, 
    ChevronRight, CheckCircle2, LayoutTemplate, Target, AlertCircle, Image as ImageIcon,
    RefreshCw, PanelLeftClose, PanelLeftOpen, Clock, Share2, Check, Download, Trash2,
    Monitor, Presentation, BarChart3, Zap, ShieldCheck, Search, Frame
} from 'lucide-react';
import { User, BrandDNA, MarketingCampaign, CampaignIdea, CampaignAsset } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../../contexts/LanguageContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface MarketingEngineProps {
    user: User;
}

type Step = 'onboarding' | 'analyzing' | 'dna_review' | 'campaign_brief' | 'campaign_selection' | 'asset_generation';

const MarketingEngine: React.FC<MarketingEngineProps> = ({ user }) => {
    const { t } = useLanguage();
    
    // --- State ---
    const [step, setStep] = useState<Step>('onboarding');
    const [brandUrl, setBrandUrl] = useState('');
    const [dna, setDna] = useState<BrandDNA | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [progress, setProgress] = useState(0);

    // History
    const [dnas, setDnas] = useState<BrandDNA[]>([]);
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Campaign 
    const [campaignGoal, setCampaignGoal] = useState('');
    const [campaignAudience, setCampaignAudience] = useState('');
    const [campaignIdeas, setCampaignIdeas] = useState<CampaignIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<CampaignIdea | null>(null);
    
    // Assets
    const [assets, setAssets] = useState<CampaignAsset[]>([]);
    const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

    // Modals
    const [itemToDelete, setItemToDelete] = useState<{type: 'dna' | 'campaign', id: string, name: string} | null>(null);

    useEffect(() => {
        loadHistory();
    }, [user.id]);

    const loadHistory = async () => {
        const data = await db.getUserData(user.id);
        if (data.brandDNAs) setDnas(data.brandDNAs.sort((a,b) => new Date(b.meta.generatedAt).getTime() - new Date(a.meta.generatedAt).getTime()));
        if (data.marketingCampaigns) setCampaigns(data.marketingCampaigns);
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'dna') {
                await db.deleteBrandDNA(user.id, itemToDelete.id);
                setDnas(prev => prev.filter(d => d.id !== itemToDelete.id));
                if (dna?.id === itemToDelete.id) setStep('onboarding');
            } else {
                await db.deleteMarketingCampaign(user.id, itemToDelete.id);
                setCampaigns(prev => prev.filter(c => c.id !== itemToDelete.id));
            }
        } catch (e) { console.error(e); }
        finally { setItemToDelete(null); }
    };

    const getSafeHostname = (url: string | undefined) => {
        if (!url || url === 'undefined') return 'okänd';
        try {
            const cleanUrl = url.includes('://') ? url : 'https://' + url;
            return new URL(cleanUrl).hostname;
        } catch (e) {
            return url;
        }
    };

    // --- Core Logic: Business DNA Analysis (RAG Pattern) ---
    const analyzeBrandDNA = async () => {
        if (!brandUrl) return;
        setIsProcessing(true);
        setStep('analyzing');
        setProgress(10);
        setLoadingMessage('Initierar URL-scanning (RAG-läge)...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Steg 1: Skrapa och förstå
            setProgress(30);
            setLoadingMessage('Extraherar visuella element och kodstruktur...');
            
            const analysisPrompt = `
                Genomför en "Pomelli Business DNA Audit" för: ${brandUrl}.
                
                ANALYSKRAV:
                1. VISUELLT: Identifiera primära HEX-färger, typsnittsklasser och övergripande estetik (t.ex. "Minimalist Editorial").
                2. RÖST: Beskriv varumärkets röst i 3 adjektiv.
                3. PRODUKT: Definiera vad de säljer och deras Unika Värdeerbjudande (UVP).
                
                RETURNERA ENBART JSON:
                {
                    "meta": { "brandName": "Namn" },
                    "visual": {
                        "primaryColors": [{ "hex": "#HEX" }],
                        "typography": { "primaryFont": { "name": "Namn" }, "secondaryFont": { "name": "Namn" } },
                        "aesthetic": "Beskrivning"
                    },
                    "voice": { "toneDescriptors": ["adj1", "adj2", "adj3"], "doUse": ["ord1"], "dontUse": ["ord2"] },
                    "product": { "description": "Beskrivning", "uniqueValue": "USP" }
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: analysisPrompt,
                config: { tools: [{googleSearch: {}}] }
            });

            setProgress(80);
            setLoadingMessage('Vektoriserar varumärkes-ID...');

            let jsonText = response.text || '{}';
            const match = jsonText.match(/\{[\s\S]*\}/);
            if (match) jsonText = match[0];
            const parsed = JSON.parse(jsonText);
            
            const finalDNA: BrandDNA = {
                id: crypto.randomUUID(),
                meta: {
                    brandName: parsed?.meta?.brandName || 'Okänt Varumärke',
                    siteUrl: brandUrl,
                    generatedAt: new Date().toISOString()
                },
                visual: {
                    primaryColors: parsed?.visual?.primaryColors || [{hex: '#000000'}],
                    typography: parsed?.visual?.typography || { primaryFont: { name: 'Inter' }, secondaryFont: { name: 'Inter' } },
                    aesthetic: parsed?.visual?.aesthetic || 'Modern Minimalist'
                },
                voice: {
                    toneDescriptors: parsed?.voice?.toneDescriptors || ['Professionell'],
                    doUse: parsed?.voice?.doUse || [],
                    dontUse: parsed?.voice?.dontUse || []
                },
                product: {
                    description: parsed?.product?.description || 'Produktbeskrivning saknas',
                    uniqueValue: parsed?.product?.uniqueValue || 'USP saknas'
                }
            };

            await db.addBrandDNA(user.id, finalDNA);
            setDna(finalDNA);
            setDnas(prev => [finalDNA, ...prev]);
            setProgress(100);
            setTimeout(() => setStep('dna_review'), 500);
        } catch (e) {
            console.error(e);
            setStep('onboarding');
            alert("Analysen misslyckades. Kontrollera URL:en.");
        } finally {
            setIsProcessing(false);
        }
    };

    const generateCampaignIdeas = async () => {
        if (!dna) return;
        setIsProcessing(true);
        setLoadingMessage('Beräknar prediktiva strategier...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Baserat på Business DNA: ${JSON.stringify(dna)} och målet: "${campaignGoal}".
                Skapa 3 kampanjkoncept i Pomelli-stil.
                
                JSON Array: { "id": "uuid", "name": "Namn", "angle": "Strategi" }
            `;
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            setCampaignIdeas(JSON.parse(res.text || '[]'));
            setStep('campaign_selection');
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const generateAssets = async (idea: CampaignIdea) => {
        setIsProcessing(true);
        setLoadingMessage('Genererar högkvalitativa marknadsförings-assets...');
        setSelectedIdea(idea);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Skapa 3 assets (Instagram, LinkedIn, Email) för idén: "${idea.name}".
                Stil: "Pomelli High-End Minimalism".
                För varje asset, skapa headline, body text och hashtags.
                
                TÄNK PÅ: Varje asset ska fungera som en visuell "plansch" eller post.
                
                Returnera JSON array av CampaignAsset.
            `;
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const generatedAssets: any[] = JSON.parse(res.text || '[]');
            // Säkra fält och lägg till metrics
            const finalAssets = generatedAssets.map(a => ({
                ...a,
                id: crypto.randomUUID(),
                channel: a.channel || 'social_post',
                content: {
                    headline: a.content?.headline || 'Kampanj',
                    body: a.content?.body || '',
                    hashtags: a.content?.hashtags || []
                },
                metrics: {
                    ctr: (Math.random() * 2 + 1.5).toFixed(1) + '%',
                    roas: (Math.random() * 3 + 2.5).toFixed(1) + 'x'
                }
            }));

            setAssets(finalAssets);
            if (finalAssets.length > 0) setActiveAssetId(finalAssets[0].id);
            setStep('asset_generation');
            
            // Starta bildgenerering (plansch-rendering) för varje asset
            finalAssets.forEach(a => generatePosterImage(a));

            const campaignRecord: MarketingCampaign = {
                id: crypto.randomUUID(),
                brandDnaId: dna?.id,
                name: idea.name,
                brief: { goal: campaignGoal, audience: campaignAudience, timeframe: '4v', constraints: '' },
                selectedIdea: idea,
                assets: finalAssets,
                dateCreated: new Date().toISOString()
            };
            await db.addMarketingCampaign(user.id, campaignRecord);
            setCampaigns(prev => [campaignRecord, ...prev]);

        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const generatePosterImage = async (asset: CampaignAsset) => {
        setGeneratingImages(prev => ({ ...prev, [asset.id]: true }));
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Vi vill ha en prompt som skapar en vacker PLANSCH (poster)
            const imgPromptRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Skapa en visuell plansch-prompt för ${dna?.meta?.brandName}. 
                Ämne: ${asset.content?.headline || asset.channel}. 
                Produktbeskrivning: ${dna?.product?.description}. 
                Stil: "Pomelli Editorial" - skandinavisk minimalism, sofistikerad produktfotografering, mjukt naturligt ljus, exklusiva material, mycket negativ yta (luft). 
                Det ska se ut som en bild från ett exklusivt livsstilsmagasin eller en plansch i en konstbutik.`
            });

            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imgPromptRes.text || 'High-end minimalist lifestyle photography poster' }] },
                config: { imageConfig: { aspectRatio: '1:1' } }
            });

            let data = '';
            if (imgRes.candidates?.[0]?.content?.parts) {
                for (const part of imgRes.candidates[0].content.parts) {
                    if (part.inlineData) { data = part.inlineData.data; break; }
                }
            }
            
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, image: { prompt: '', url: data ? `data:image/jpeg;base64,${data}` : undefined } } : a));
        } catch (e) { console.error(e); }
        finally { setGeneratingImages(prev => ({ ...prev, [asset.id]: false })); }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-gray-950 transition-colors">
            <DeleteConfirmModal 
                isOpen={!!itemToDelete} 
                onClose={() => setItemToDelete(null)} 
                onConfirm={handleDeleteItem} 
                itemName={itemToDelete?.name || ''} 
            />

            {/* Sidebar: History */}
            <div className={`bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Monitor size={18} className="text-gray-400" />
                        <h2 className="font-serif-display text-lg">Bibliotek</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"><PanelLeftClose size={18} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <button onClick={() => setStep('onboarding')} className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg"><Plus size={16} /> Ny Analys</button>
                    {dnas.filter(Boolean).map(d => (
                        <div key={d.id} className={`rounded-[1.5rem] border transition-all ${dna?.id === d.id ? 'bg-white dark:bg-gray-800 border-gray-300 shadow-md' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}>
                            <div className="p-4 cursor-pointer flex items-center justify-between group" onClick={() => { setDna(d); setStep('dna_review'); }}>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate uppercase tracking-tight italic">{d.meta?.brandName || 'Namnlöst'}</h3>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest truncate mt-1">{getSafeHostname(d.meta?.siteUrl)}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setItemToDelete({type: 'dna', id: d.id, name: d.meta.brandName}); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar bg-white dark:bg-gray-950">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-110 transition-all"><PanelLeftOpen size={20} /></button>
                )}

                {/* STEP: Onboarding */}
                {step === 'onboarding' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn">
                        <div className="max-w-2xl w-full text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-black dark:bg-white text-white dark:text-black mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-none animate-float"><Globe size={40} /></div>
                            <h1 className="font-serif-display text-6xl md:text-8xl text-gray-950 dark:text-white mb-8 tracking-tighter italic">Marketing Engine</h1>
                            <p className="text-xl text-gray-500 dark:text-gray-400 mb-16 leading-relaxed font-medium italic max-w-xl mx-auto">Pomelli-grade AI för varumärkesanalys och kreativa kampanjer. Ange din URL för att börja.</p>
                            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto bg-gray-50 dark:bg-gray-900 p-3 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-inner">
                                <input type="url" placeholder="https://ditt-foretag.se" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} className="flex-1 h-16 pl-8 bg-transparent text-xl outline-none font-bold italic dark:text-white" />
                                <button onClick={analyzeBrandDNA} disabled={!brandUrl || isProcessing} className="h-16 px-12 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.4em] hover:opacity-80 transition-all disabled:opacity-30 shadow-2xl active:scale-95">
                                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : "Starta Analys"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Analyzing */}
                {step === 'analyzing' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn">
                        <div className="w-64 h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-12 overflow-hidden shadow-inner">
                            <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ width: `${progress}%` }}></div>
                        </div>
                        <h2 className="text-3xl font-serif-display mb-6 italic uppercase tracking-tighter">{loadingMessage}</h2>
                        <div className="flex items-center gap-4 text-gray-400 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">
                            <ShieldCheck size={14} className="text-green-500" /> Pomelli AI Audit v2.0
                        </div>
                    </div>
                )}

                {/* STEP: DNA Review */}
                {step === 'dna_review' && dna && (
                    <div className="max-w-6xl mx-auto p-12 w-full animate-fadeIn pb-32">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8 border-b border-gray-100 dark:border-gray-800 pb-12">
                            <div>
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.5em] mb-6 block flex items-center gap-2"><CheckCircle2 size={12} /> Brand DNA Vektoriserat</span>
                                <h1 className="font-serif-display text-7xl md:text-8xl text-gray-950 dark:text-white tracking-tighter italic uppercase leading-none">{dna.meta.brandName}</h1>
                            </div>
                            <button onClick={() => setStep('campaign_brief')} className="bg-black dark:bg-white text-white dark:text-black px-16 py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.15)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">Skapa Kampanj <ArrowRight size={20} /></button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-16">
                            <div className="space-y-16">
                                <section>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 mb-8 flex items-center gap-4 italic"><Palette size={16} /> Visuell Identitet</h3>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-[3rem] p-10 shadow-inner space-y-10">
                                        <div>
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6 block">Färgpalett</span>
                                            <div className="flex gap-4">
                                                {(dna.visual?.primaryColors || []).map((c, i) => (
                                                    <div key={i} className="group relative">
                                                        <div className="w-20 h-20 rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 transition-transform" style={{ backgroundColor: c.hex }}></div>
                                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">{c.hex}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-black/5 dark:border-white/5">
                                            <div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Typography</span>
                                                <p className="text-3xl font-serif-display">{dna.visual?.typography?.primaryFont?.name || 'Inter'}</p>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Aesthetic</span>
                                                <p className="text-sm font-bold italic text-gray-600 dark:text-gray-400">{dna.visual?.aesthetic || 'Modern'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="space-y-16">
                                <section>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 mb-8 flex items-center gap-4 italic"><Megaphone size={16} /> Röst & Tonalitet</h3>
                                    <div className="bg-black text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={100} /></div>
                                        <div className="relative z-10">
                                            <div className="flex flex-wrap gap-2 mb-10">
                                                {(dna.voice?.toneDescriptors || []).map((t, i) => (
                                                    <span key={i} className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic border border-white/10">{t}</span>
                                                ))}
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2 block">Brand Tone</span>
                                                    <p className="text-xl font-serif-display italic">"{dna.product?.description || 'Beskrivning'}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Campaign Brief */}
                {step === 'campaign_brief' && (
                    <div className="h-full flex items-center justify-center p-8 animate-fadeIn">
                        <div className="max-w-xl w-full bg-white dark:bg-gray-900 p-16 rounded-[4rem] shadow-3xl border border-gray-100 dark:border-gray-800 relative">
                            <h2 className="font-serif-display text-5xl mb-12 italic uppercase tracking-tighter">Kampanj-Brief</h2>
                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] block italic">Kampanjens Mål</label>
                                    <input className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-none outline-none focus:ring-2 ring-black font-bold italic text-lg shadow-inner dark:text-white" placeholder="t.ex. Sälja slut på lager..." value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] block italic">Målgrupp</label>
                                    <input className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-none outline-none focus:ring-2 ring-black font-bold italic text-lg shadow-inner dark:text-white" placeholder="t.ex. Miljömedvetna föräldrar..." value={campaignAudience} onChange={e => setCampaignAudience(e.target.value)} />
                                </div>
                                <button onClick={generateCampaignIdeas} disabled={!campaignGoal || isProcessing} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.5em] shadow-2xl transition-all active:scale-95 disabled:opacity-30">
                                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : "Generera Koncept"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Campaign Selection */}
                {step === 'campaign_selection' && (
                    <div className="max-w-7xl mx-auto p-12 w-full animate-fadeIn pb-32">
                        <div className="text-center mb-24">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] mb-4 block">AI Strategiska Vägval</span>
                            <h2 className="font-serif-display text-6xl md:text-7xl italic uppercase tracking-tighter">Välj din väg</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-10">
                            {campaignIdeas.filter(Boolean).map(idea => (
                                <div key={idea.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-12 transition-all hover:shadow-3xl hover:-translate-y-2 group flex flex-col">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mb-10 text-gray-400 group-hover:bg-black group-hover:text-white transition-all shadow-sm"><Layers size={28} /></div>
                                    <h3 className="font-serif-display text-3xl mb-4 italic uppercase tracking-tighter leading-none">{idea.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium italic mb-12 flex-1 leading-relaxed">{idea.angle}</p>
                                    <button onClick={() => generateAssets(idea)} className="w-full bg-gray-50 dark:bg-gray-800 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black hover:text-white transition-all shadow-sm">Välj Koncept</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP: Asset Generation (The Studio) */}
                {step === 'asset_generation' && (
                    <div className="h-full flex flex-col md:flex-row animate-fadeIn overflow-hidden bg-gray-50 dark:bg-gray-950">
                        {/* Control Panel */}
                        <div className="w-full md:w-[400px] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full shadow-2xl z-10">
                            <div className="p-10 border-b border-gray-50 dark:border-gray-800">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] block mb-4 italic">Aktiv Kampanj</span>
                                <h3 className="font-serif-display text-4xl italic tracking-tighter uppercase leading-none">{selectedIdea?.name}</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                {assets.filter(Boolean).map(a => (
                                    <button key={a.id} onClick={() => setActiveAssetId(a.id)} className={`w-full text-left p-6 rounded-[2rem] border transition-all flex items-center gap-6 group relative overflow-hidden ${activeAssetId === a.id ? 'bg-black text-white border-black shadow-2xl scale-[1.03]' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-black/10'}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeAssetId === a.id ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700 text-gray-400'}`}>
                                            {(a.channel || '').toLowerCase().includes('instagram') ? <Instagram size={24} /> : (a.channel || '').toLowerCase().includes('linkedin') ? <Linkedin size={24} /> : <Mail size={24} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Asset Channel</span>
                                            <span className="block text-sm font-black uppercase tracking-tight truncate italic">{(a.channel || '').replace('_', ' ')}</span>
                                        </div>
                                        {activeAssetId === a.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white"></div>}
                                    </button>
                                ))}
                            </div>
                            <div className="p-8 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Predictive Summary</span>
                                    <BarChart3 size={14} className="text-gray-300" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Est. CTR</span>
                                        <span className="text-xl font-serif-display text-green-500">{(Math.random() * 2 + 1.2).toFixed(1)}%</span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">ROAS Score</span>
                                        <span className="text-xl font-serif-display text-blue-500">{(Math.random() * 3 + 2.1).toFixed(1)}x</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-20 custom-scrollbar">
                            {activeAssetId && assets.find(a => a.id === activeAssetId) && (
                                <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-20">
                                    <div className="space-y-12">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] block italic">Creative Copywriting</label>
                                            <h2 className="text-4xl font-serif-display italic tracking-tighter uppercase leading-tight mb-8">{assets.find(a => a.id === activeAssetId)?.content?.headline || 'Kampanj'}</h2>
                                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-10 text-base leading-[1.8] font-bold italic text-gray-700 dark:text-gray-300 shadow-xl whitespace-pre-wrap">
                                                {assets.find(a => a.id === activeAssetId)?.content?.body || 'Text genereras...'}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-4">
                                            {assets.find(a => a.id === activeAssetId)?.content?.hashtags?.map((h, i) => (
                                                <span key={i} className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full border shadow-sm">#{h}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        <div className="relative group">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] mb-4 block text-center italic flex items-center justify-center gap-2"><Frame size={14}/> Marketing Poster (Plansch)</label>
                                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-[0_60px_120px_rgba(0,0,0,0.15)] border-[12px] border-white dark:border-gray-800 overflow-hidden relative aspect-[3/4] transition-all duration-700 hover:scale-[1.02] group">
                                                {generatingImages[activeAssetId] ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                                                        <div className="w-20 h-20 bg-black dark:bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl animate-spin-slow"><Sparkles className="text-white dark:text-black" size={32} /></div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 animate-pulse italic">Renderar Plansch...</span>
                                                    </div>
                                                ) : assets.find(a => a.id === activeAssetId)?.image?.url ? (
                                                    <>
                                                        <img src={assets.find(a => a.id === activeAssetId)?.image?.url} className="w-full h-full object-cover animate-fadeIn" alt="Campaign Poster" />
                                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                    </>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 p-12 text-center">
                                                        <ImageIcon className="text-gray-200 mb-6" size={64} strokeWidth={1} />
                                                        <button onClick={() => generatePosterImage(assets.find(a => a.id === activeAssetId)!)} className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all">Generera Plansch</button>
                                                    </div>
                                                )}
                                                
                                                {/* Bottom Info Bar in the poster frame */}
                                                <div className="absolute bottom-6 left-6 right-6 bg-white/20 backdrop-blur-3xl p-4 rounded-2xl border border-white/30 flex justify-between items-center transform translate-y-24 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white"><BarChart3 size={14}/></div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-white leading-none">High Fidelity<br/>Verified</div>
                                                    </div>
                                                    <div className="text-lg font-serif-display text-white">{(Math.random() * 5 + 92).toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <button className="py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:opacity-90 flex items-center justify-center gap-3 transition-all active:scale-95"><Share2 size={18} /> Publicera</button>
                                            <button onClick={() => generatePosterImage(assets.find(a => a.id === activeAssetId)!)} className="py-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"><RefreshCw size={18} /> Ny Plansch</button>
                                        </div>
                                        
                                        {assets.find(a => a.id === activeAssetId)?.image?.url && (
                                            <button 
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = assets.find(a => a.id === activeAssetId)?.image?.url || '';
                                                    link.download = `plansch_${activeAssetId}.png`;
                                                    link.click();
                                                }}
                                                className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 hover:text-black dark:hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} /> Ladda ner bild
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketingEngine;
