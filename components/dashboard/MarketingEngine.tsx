
import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Palette, Type, Globe, Megaphone, Instagram, Linkedin, Mail, 
    Loader2, ArrowRight, Layers, Copy, Wand2, Plus, 
    ChevronRight, CheckCircle2, LayoutTemplate, Target, AlertCircle, Image as ImageIcon,
    RefreshCw, PanelLeftClose, PanelLeftOpen, Clock, Share2, Check, Download, Trash2,
    Monitor, Presentation, BarChart3, Zap, ShieldCheck, Search, Frame, Maximize2, X, Eye
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
    const [fullscreenAsset, setFullscreenAsset] = useState<CampaignAsset | null>(null);

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

    const analyzeBrandDNA = async () => {
        if (!brandUrl) return;
        setIsProcessing(true);
        setStep('analyzing');
        setProgress(10);
        setLoadingMessage('Analyserar webbplats...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Gör en "Pomelli Business DNA Audit" för: ${brandUrl}. Identifiera HEX-färger, typsnitt och röst. Returnera JSON.`,
                config: { tools: [{googleSearch: {}}] }
            });

            setProgress(80);
            let jsonText = response.text || '{}';
            const match = jsonText.match(/\{[\s\S]*\}/);
            if (match) jsonText = match[0];
            const parsed = JSON.parse(jsonText);
            
            const finalDNA: BrandDNA = {
                id: crypto.randomUUID(),
                meta: { brandName: parsed?.meta?.brandName || 'Okänt', siteUrl: brandUrl, generatedAt: new Date().toISOString() },
                visual: {
                    primaryColors: parsed?.visual?.primaryColors || [{hex: '#000000'}],
                    typography: parsed?.visual?.typography || { primaryFont: { name: 'Inter' }, secondaryFont: { name: 'Inter' } },
                    aesthetic: parsed?.visual?.aesthetic || 'Modern Minimalist'
                },
                voice: { toneDescriptors: parsed?.voice?.toneDescriptors || ['Proffsig'], doUse: [], dontUse: [] },
                product: { description: parsed?.product?.description || '', uniqueValue: '' }
            };

            await db.addBrandDNA(user.id, finalDNA);
            setDna(finalDNA);
            setDnas(prev => [finalDNA, ...prev]);
            setProgress(100);
            setTimeout(() => setStep('dna_review'), 500);
        } catch (e) {
            console.error(e);
            setStep('onboarding');
        } finally {
            setIsProcessing(false);
        }
    };

    const generateCampaignIdeas = async () => {
        if (!dna) return;
        setIsProcessing(true);
        setLoadingMessage('Kreativ strategi pågår...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Skapa 3 kampanjkoncept för ${dna.meta.brandName} med målet: "${campaignGoal}". Returnera JSON array: {id, name, angle}.`,
                config: { responseMimeType: 'application/json' }
            });
            setCampaignIdeas(JSON.parse(res.text || '[]'));
            setStep('campaign_selection');
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const generateAssets = async (idea: CampaignIdea) => {
        setIsProcessing(true);
        setLoadingMessage('Renderar kampanjmaterial...');
        setSelectedIdea(idea);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Skapa 3 marknadsförings-assets (Instagram, LinkedIn, Email) för: "${idea.name}" baserat på ${dna?.meta.brandName}. Stil: Pomelli Minimalism. Returnera JSON array av CampaignAsset.`,
                config: { responseMimeType: 'application/json' }
            });

            const generatedAssets: any[] = JSON.parse(res.text || '[]');
            const finalAssets = generatedAssets.map(a => ({
                ...a,
                id: crypto.randomUUID(),
                channel: a.channel || 'social',
                content: { headline: a.content?.headline || 'Kampanj', body: a.content?.body || '', hashtags: a.content?.hashtags || [] }
            }));

            setAssets(finalAssets);
            if (finalAssets.length > 0) setActiveAssetId(finalAssets[0].id);
            setStep('asset_generation');
            finalAssets.forEach(a => generatePosterImage(a));
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const generatePosterImage = async (asset: CampaignAsset) => {
        setGeneratingImages(prev => ({ ...prev, [asset.id]: true }));
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imgPromptRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Beskriv en minimalistisk marknadsföringsplansch för ${dna?.meta?.brandName}. Fokus: ${asset.content?.headline}. Stil: Skandinavisk minimalism, mjukt ljus, redaktionell känsla. Ingen text i bilden.`
            });
            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imgPromptRes.text || 'Luxury minimalist poster' }] },
                config: { imageConfig: { aspectRatio: '3:4' } }
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

            {/* LIGHTBOX / FULLSCREEN PREVIEW */}
            {fullscreenAsset && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-fadeIn" onClick={() => setFullscreenAsset(null)}>
                    <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X size={40} /></button>
                    <div className="max-w-4xl w-full h-full flex flex-col md:flex-row gap-12 items-center justify-center" onClick={e => e.stopPropagation()}>
                        <div className="relative aspect-[3/4] h-full max-h-[85vh] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-[12px] border-white rounded-lg overflow-hidden shrink-0">
                            <img src={fullscreenAsset.image?.url} className="w-full h-full object-cover" alt="Fullscreen" />
                        </div>
                        <div className="text-white max-w-md space-y-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 italic">{fullscreenAsset.channel}</span>
                            <h2 className="text-4xl font-serif-display italic tracking-tighter uppercase leading-tight">{fullscreenAsset.content?.headline}</h2>
                            <p className="text-lg text-white/70 italic leading-relaxed">{fullscreenAsset.content?.body}</p>
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = fullscreenAsset.image?.url || '';
                                    link.download = `aceverse_plansch.png`;
                                    link.click();
                                }}
                                className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all"
                            >
                                <Download size={18} /> Ladda ner i HD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar: History */}
            <div className={`bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg">Bibliotek</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"><PanelLeftClose size={18} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <button onClick={() => setStep('onboarding')} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-all active:scale-95"><Plus size={16} /> Ny Analys</button>
                    {dnas.map(d => (
                        <div key={d.id} className={`p-4 rounded-xl border transition-all cursor-pointer ${dna?.id === d.id ? 'bg-white dark:bg-gray-800 border-gray-300' : 'border-transparent hover:bg-gray-100'}`} onClick={() => { setDna(d); setStep('dna_review'); }}>
                            <h3 className="font-bold text-xs truncate uppercase tracking-tight italic">{d.meta.brandName}</h3>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest truncate mt-1">{new URL(d.meta.siteUrl).hostname}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white dark:bg-gray-950">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="absolute top-6 left-6 z-50 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-110 transition-all"><PanelLeftOpen size={20} /></button>
                )}

                {/* STEP: Onboarding */}
                {step === 'onboarding' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn overflow-y-auto">
                        <div className="max-w-2xl w-full text-center py-10">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black mb-10 shadow-xl animate-float"><Globe size={32} /></div>
                            <h1 className="font-serif-display text-5xl md:text-7xl text-gray-950 dark:text-white mb-6 tracking-tighter italic">Marketing Engine</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-lg mx-auto">Världsklass marknadsföring för UF-företag. Skapa din visuella plansch på sekunder.</p>
                            <div className="flex flex-col md:flex-row gap-4 max-w-xl mx-auto bg-gray-50 dark:bg-gray-900 p-2 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-inner">
                                <input type="url" placeholder="https://ditt-foretag.se" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} className="flex-1 h-14 pl-6 bg-transparent text-lg outline-none font-bold italic dark:text-white" />
                                <button onClick={analyzeBrandDNA} disabled={!brandUrl || isProcessing} className="h-14 px-10 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-all shadow-xl active:scale-95">
                                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : "Analysera"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Analyzing */}
                {step === 'analyzing' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn">
                        <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-10 overflow-hidden shadow-inner">
                            <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                        <h2 className="text-2xl font-serif-display mb-4 italic uppercase tracking-tighter">{loadingMessage}</h2>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] animate-pulse">Pomelli AI Audit</div>
                    </div>
                )}

                {/* STEP: DNA Review */}
                {step === 'dna_review' && dna && (
                    <div className="max-w-6xl mx-auto p-8 md:p-16 w-full animate-fadeIn overflow-y-auto h-full custom-scrollbar">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8">
                            <div>
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.5em] mb-4 block flex items-center gap-2"><CheckCircle2 size={12} /> Brand DNA Vektoriserat</span>
                                <h1 className="font-serif-display text-6xl text-gray-950 dark:text-white tracking-tighter italic uppercase leading-none">{dna.meta.brandName}</h1>
                            </div>
                            <button onClick={() => setStep('campaign_brief')} className="bg-black dark:bg-white text-white dark:text-black px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl flex items-center gap-4 hover:scale-105 transition-all">Starta Kampanj <ArrowRight size={20} /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-12">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-inner">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 mb-8 italic">Visuell Profil</h3>
                                <div className="flex gap-4 mb-10">
                                    {dna.visual.primaryColors.map((c, i) => (
                                        <div key={i} className="w-16 h-16 rounded-2xl border border-white/20 shadow-lg" style={{ backgroundColor: c.hex }}></div>
                                    ))}
                                </div>
                                <p className="text-3xl font-serif-display mb-2">{dna.visual.typography.primaryFont.name}</p>
                                <p className="text-xs font-bold text-gray-400 italic uppercase tracking-widest">{dna.visual.aesthetic}</p>
                            </div>
                            <div className="bg-black text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-8 italic">Tone of Voice</h3>
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {dna.voice.toneDescriptors.map((t, i) => (
                                        <span key={i} className="px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest italic border border-white/10">{t}</span>
                                    ))}
                                </div>
                                <p className="text-xl font-serif-display italic">"{dna.product.description || 'Högkvalitativt UF-företag med fokus på framtiden.'}"</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Campaign Selection */}
                {step === 'campaign_selection' && (
                    <div className="max-w-7xl mx-auto p-12 w-full animate-fadeIn overflow-y-auto h-full custom-scrollbar">
                        <div className="text-center mb-16">
                            <h2 className="font-serif-display text-5xl md:text-6xl italic uppercase tracking-tighter">Välj kampanjväg</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {campaignIdeas.map(idea => (
                                <div key={idea.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-10 transition-all hover:shadow-2xl hover:-translate-y-1 group flex flex-col">
                                    <h3 className="font-serif-display text-3xl mb-4 italic uppercase tracking-tighter leading-none">{idea.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium italic mb-10 flex-1 leading-relaxed">{idea.angle}</p>
                                    <button onClick={() => generateAssets(idea)} className="w-full bg-gray-50 dark:bg-gray-800 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-sm">Välj Koncept</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP: Asset Generation (The Studio) - UI REWORKED FOR VISIBILITY */}
                {step === 'asset_generation' && (
                    <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 animate-fadeIn overflow-hidden">
                        {/* Compact Left Menu */}
                        <div className="w-full md:w-20 lg:w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full shrink-0 shadow-lg z-10 transition-all">
                            <div className="p-6 border-b border-gray-50 dark:border-gray-800 hidden lg:block">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Aktiv Kampanj</span>
                                <h3 className="font-serif-display text-xl italic tracking-tighter uppercase truncate">{selectedIdea?.name}</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex md:flex-col items-center md:items-stretch overflow-x-auto md:overflow-x-hidden">
                                {assets.map(a => (
                                    <button 
                                        key={a.id} 
                                        onClick={() => setActiveAssetId(a.id)} 
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all border shrink-0 md:shrink ${activeAssetId === a.id ? 'bg-black text-white border-black shadow-xl' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeAssetId === a.id ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-900 text-gray-400'}`}>
                                            {(a.channel || '').toLowerCase().includes('instagram') ? <Instagram size={18} /> : (a.channel || '').toLowerCase().includes('linkedin') ? <Linkedin size={18} /> : <Mail size={18} />}
                                        </div>
                                        <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest truncate">{(a.channel || '').replace('_', ' ')}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-50 dark:border-gray-800 hidden lg:block">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Est. CTR</span>
                                        <span className="text-sm font-serif-display text-green-500">1.4%</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">ROAS</span>
                                        <span className="text-sm font-serif-display text-blue-500">3.2x</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Central Stage: The Poster Focus */}
                        <div className="flex-1 flex flex-col overflow-hidden relative">
                            {/* Toolbar Top */}
                            <div className="h-16 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 bg-black text-white rounded-md text-[9px] font-black uppercase tracking-[0.2em] italic">Stage View</div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">{assets.find(a => a.id === activeAssetId)?.channel.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setFullscreenAsset(assets.find(a => a.id === activeAssetId) || null)} className="p-2 hover:bg-black hover:text-white rounded-lg transition-all" title="Fullskärm"><Maximize2 size={20} /></button>
                                    <button 
                                        onClick={() => {
                                            const asset = assets.find(a => a.id === activeAssetId);
                                            if (asset?.image?.url) {
                                                const link = document.createElement('a');
                                                link.href = asset.image.url;
                                                link.download = `plansch_${activeAssetId}.png`;
                                                link.click();
                                            }
                                        }} 
                                        className="p-2 hover:bg-black hover:text-white rounded-lg transition-all" title="Ladda ner"><Download size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Center Canvas */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 flex flex-col items-center custom-scrollbar">
                                {activeAssetId && assets.find(a => a.id === activeAssetId) && (
                                    <div className="max-w-4xl w-full flex flex-col gap-12">
                                        
                                        {/* THE POSTER (Centerpiece) */}
                                        <div className="relative group self-center w-full max-w-[500px]">
                                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-[0_60px_150px_rgba(0,0,0,0.18)] border-[16px] border-white dark:border-gray-800 overflow-hidden relative aspect-[3/4] transition-all duration-700 hover:scale-[1.02] cursor-zoom-in" onClick={() => setFullscreenAsset(assets.find(a => a.id === activeAssetId) || null)}>
                                                {generatingImages[activeAssetId] ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 animate-pulse">
                                                        <Loader2 className="animate-spin text-black dark:text-white mb-6" size={48} />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 italic">Renderar Plansch...</span>
                                                    </div>
                                                ) : assets.find(a => a.id === activeAssetId)?.image?.url ? (
                                                    <>
                                                        <img src={assets.find(a => a.id === activeAssetId)?.image?.url} className="w-full h-full object-cover animate-fadeIn" alt="Campaign Poster" />
                                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <div className="bg-white/20 backdrop-blur-xl p-4 rounded-full border border-white/20"><Maximize2 className="text-white" size={32} /></div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                                                        <ImageIcon className="text-gray-200 mb-6" size={80} strokeWidth={1} />
                                                        <button onClick={() => generatePosterImage(assets.find(a => a.id === activeAssetId)!)} className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Generera Plansch</button>
                                                    </div>
                                                )}
                                                
                                                <div className="absolute bottom-10 left-10 right-10 bg-white/30 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/30 flex justify-between items-center transform translate-y-32 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><BarChart3 size={20}/></div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-white leading-none">AI Optimized<br/>High Fidelity</div>
                                                    </div>
                                                    <div className="text-2xl font-serif-display text-white">96.8%</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* COPYWRITING (Under the poster, elegant) */}
                                        <div className="grid md:grid-cols-2 gap-10 bg-white dark:bg-gray-900 p-10 md:p-16 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                                            <div className="space-y-6">
                                                <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] block italic">Editorial Copy</label>
                                                <h2 className="text-3xl font-serif-display italic tracking-tighter uppercase leading-tight">{assets.find(a => a.id === activeAssetId)?.content?.headline}</h2>
                                                <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed font-bold italic whitespace-pre-wrap">{assets.find(a => a.id === activeAssetId)?.content?.body}</p>
                                                <div className="flex flex-wrap gap-2 pt-4">
                                                    {assets.find(a => a.id === activeAssetId)?.content?.hashtags?.map((h, i) => (
                                                        <span key={i} className="text-[9px] font-black uppercase tracking-widest text-gray-400">#{h}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-center space-y-4">
                                                <button className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4"><Share2 size={18} /> Publicera Kampanj</button>
                                                <button onClick={() => generatePosterImage(assets.find(a => a.id === activeAssetId)!)} className="w-full py-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-400 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-gray-50 transition-all flex items-center justify-center gap-4"><RefreshCw size={18} /> Ny Vinkel</button>
                                                <button className="w-full py-4 text-gray-300 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest">Radera Asset</button>
                                            </div>
                                        </div>
                                        
                                        <div className="h-20" /> {/* Extra spacing at bottom */}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: Campaign Brief Modal/Overlay */}
                {step === 'campaign_brief' && (
                    <div className="h-full flex items-center justify-center p-6 animate-fadeIn bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="max-w-xl w-full bg-white dark:bg-gray-900 p-12 md:p-16 rounded-[4rem] shadow-[0_40px_120px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 relative">
                            <h2 className="font-serif-display text-5xl mb-12 italic uppercase tracking-tighter">Kampanj-Brief</h2>
                            <div className="space-y-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] block italic">Mål & Syfte</label>
                                    <input className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-none outline-none focus:ring-2 ring-black font-bold italic text-lg shadow-inner dark:text-white" placeholder="t.ex. Lansera UF-butiken..." value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] block italic">Målgrupp</label>
                                    <input className="w-full p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border-none outline-none focus:ring-2 ring-black font-bold italic text-lg shadow-inner dark:text-white" placeholder="t.ex. Miljömedvetna i Stockholm" value={campaignAudience} onChange={e => setCampaignAudience(e.target.value)} />
                                </div>
                                <button onClick={generateCampaignIdeas} disabled={!campaignGoal || isProcessing} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.5em] shadow-2xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-4">
                                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : "Generera Idéer"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketingEngine;
