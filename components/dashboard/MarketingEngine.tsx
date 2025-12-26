import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Palette, Type, Globe, Megaphone, Instagram, Linkedin, Mail, 
    Loader2, ArrowRight, Layers, Copy, Wand2, Plus, 
    ChevronRight, CheckCircle2, LayoutTemplate, Target, AlertCircle, Image as ImageIcon,
    RefreshCw, PanelLeftClose, PanelLeftOpen, Clock, Share2, Check, Download, Trash2
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

    // History & Projects
    const [dnas, setDnas] = useState<BrandDNA[]>([]);
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Campaign State
    const [campaignGoal, setCampaignGoal] = useState('');
    const [campaignAudience, setCampaignAudience] = useState('');
    const [campaignTimeframe, setCampaignTimeframe] = useState('Kommande 4 veckor');
    const [campaignIdeas, setCampaignIdeas] = useState<CampaignIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<CampaignIdea | null>(null);
    
    // Asset State
    const [assets, setAssets] = useState<CampaignAsset[]>([]);
    const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

    // Deletion Modal
    const [itemToDelete, setItemToDelete] = useState<{type: 'dna' | 'campaign', id: string, name: string} | null>(null);

    // Attach/Share State
    const [attachStatus, setAttachStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [showToast, setShowToast] = useState<{message: string, subMessage?: string, visible: boolean}>({ message: '', visible: false });

    useEffect(() => {
        loadHistory();
    }, [user.id]);

    const loadHistory = async () => {
        const data = await db.getUserData(user.id);
        if (data.brandDNAs) {
            setDnas(data.brandDNAs.sort((a,b) => new Date(b.meta.generatedAt).getTime() - new Date(a.meta.generatedAt).getTime()));
        }
        if (data.marketingCampaigns) {
            setCampaigns(data.marketingCampaigns);
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'dna') {
                await db.deleteBrandDNA(user.id, itemToDelete.id);
                setDnas(prev => prev.filter(d => d.id !== itemToDelete.id));
                if (dna?.id === itemToDelete.id) handleNewAnalysis();
            } else {
                await db.deleteMarketingCampaign(user.id, itemToDelete.id);
                setCampaigns(prev => prev.filter(c => c.id !== itemToDelete.id));
                if (selectedIdea?.name === itemToDelete.name) handleNewAnalysis();
            }
        } catch (e) { console.error(e); }
        finally { setItemToDelete(null); }
    };

    const handleNewAnalysis = () => {
        setDna(null);
        setBrandUrl('');
        setStep('onboarding');
        setCampaignIdeas([]);
        setAssets([]);
        if(window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const handleLoadDna = (loadedDna: BrandDNA) => {
        setDna(loadedDna);
        setStep('dna_review');
        setBrandUrl(loadedDna.meta?.siteUrl || '');
        setCampaignIdeas([]);
        setAssets([]);
        if(window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const handleLoadCampaign = (campaign: MarketingCampaign) => {
        const parentDna = dnas.find(d => d.id === campaign.brandDnaId);
        if (parentDna) {
            setDna(parentDna);
            setBrandUrl(parentDna.meta?.siteUrl || '');
        }
        setSelectedIdea(campaign.selectedIdea);
        setAssets(campaign.assets || []);
        if (campaign.assets && campaign.assets.length > 0) setActiveAssetId(campaign.assets[0].id);
        setStep('asset_generation');
        if(window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const analyzeBrandDNA = async () => {
        if (!brandUrl) return;
        setIsProcessing(true);
        setLoadingMessage('Skannar webbplatsstruktur & design...');
        setStep('analyzing');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const analysisPrompt = `ACT AS A SENIOR BRAND STRATEGIST. TARGET URL: ${brandUrl}... MISSION: Visual and textual audit. OUTPUT: strictly Valid JSON.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: analysisPrompt,
                config: { tools: [{googleSearch: {}}] }
            });

            let jsonText = response.text || '{}';
            const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
            if (match) jsonText = match[1];

            const resultJSON = JSON.parse(jsonText);
            resultJSON.id = crypto.randomUUID();
            resultJSON.meta.generatedAt = new Date().toISOString();

            await db.addBrandDNA(user.id, resultJSON);
            setDna(resultJSON);
            setDnas(prev => [resultJSON, ...prev]);
            setStep('dna_review');
        } catch (e) {
            console.error(e);
            setStep('onboarding');
        } finally {
            setIsProcessing(false);
        }
    };

    const generateCampaignIdeas = async () => {
        if (!dna || !campaignGoal) return;
        setIsProcessing(true);
        setLoadingMessage('Genererar strategiska koncept...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `ACT AS A SENIOR MARKETING STRATEGIST. DNA: ${JSON.stringify(dna)}. GOAL: ${campaignGoal}. OUTPUT: JSON Array of ideas.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const ideas = JSON.parse(response.text || '[]');
            setCampaignIdeas(ideas);
            setStep('campaign_selection');
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const generateAssets = async (idea: CampaignIdea, isAppending = false) => {
        setIsProcessing(true);
        setLoadingMessage(isAppending ? 'Genererar fler varianter...' : 'Skapar copy och design för alla kanaler...');
        if (!isAppending) setSelectedIdea(idea);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const textPrompt = `Generate marketing assets for channels: Instagram, LinkedIn, Email. OUTPUT: JSON array.`;
            const textResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: textPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const textAssets: CampaignAsset[] = JSON.parse(textResponse.text || '[]');
            
            if (isAppending) setAssets(prev => [...prev, ...textAssets]);
            else {
                setAssets(textAssets);
                if (textAssets.length > 0) setActiveAssetId(textAssets[0].id);
                setStep('asset_generation');
            }
            
            setIsProcessing(false);
            textAssets.forEach(asset => { if (asset.channel !== 'email_intro') generateImageForAsset(asset); });

            if (!isAppending) {
                const campaignRecord: MarketingCampaign = {
                    id: crypto.randomUUID(),
                    brandDnaId: dna?.id,
                    name: idea.name,
                    brief: { goal: campaignGoal, audience: campaignAudience, timeframe: campaignTimeframe, constraints: '' },
                    selectedIdea: idea,
                    assets: textAssets,
                    dateCreated: new Date().toISOString()
                };
                await db.addMarketingCampaign(user.id, campaignRecord);
                setCampaigns(prev => [campaignRecord, ...prev]);
            }
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
        }
    };

    const generateImageForAsset = async (asset: CampaignAsset) => {
        setGeneratingImages(prev => ({ ...prev, [asset.id]: true }));
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const promptRes = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Create image prompt for: ${asset.content?.body}` });
            const imagePrompt = promptRes.text?.trim() || "";
            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { imageConfig: { aspectRatio: asset.channel === 'instagram_feed' ? '1:1' : '4:3' } }
            });
            let imgData = '';
            if (imgRes.candidates && imgRes.candidates[0].content?.parts) {
                for (const part of imgRes.candidates[0].content.parts) {
                    if (part.inlineData) { imgData = part.inlineData.data; break; }
                }
            }
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, image: { prompt: imagePrompt, url: imgData ? `data:image/jpeg;base64,${imgData}` : undefined } } : a));
        } catch (err) { }
        finally { setGeneratingImages(prev => ({ ...prev, [asset.id]: false })); }
    };

    const handleAttachToPlatform = async (asset: CampaignAsset) => {
        setAttachStatus('loading');
        const textToCopy = `${asset.content?.headline || ''}\n\n${asset.content?.body || ''}\n\n${asset.content?.hashtags?.map(h => `#${h}`).join(' ') || ''}`;
        try { await navigator.clipboard.writeText(textToCopy); } catch (err) { }

        if (asset.image?.url) {
            const link = document.createElement('a');
            link.href = asset.image.url;
            link.download = `aceverse_${asset.channel}.png`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        }

        await new Promise(r => setTimeout(r, 800));
        if (asset.channel === 'instagram_feed') window.open('https://www.instagram.com/', '_blank'); 
        else if (asset.channel === 'linkedin_post') window.open('https://www.linkedin.com/feed/', '_blank');
        
        setAttachStatus('success');
        setShowToast({ message: "Bifogat och kopierat!", subMessage: "Klistra in på plattformen nu.", visible: true });
        setTimeout(() => { setAttachStatus('idle'); setShowToast({ message: '', visible: false }); }, 4000);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 relative">
            <DeleteConfirmModal 
                isOpen={!!itemToDelete} 
                onClose={() => setItemToDelete(null)} 
                onConfirm={handleDeleteItem} 
                itemName={itemToDelete?.name || ''} 
            />

            {showToast.visible && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-xl shadow-2xl flex items-start gap-3 animate-slideUp max-w-sm">
                    <Check size={20} className="text-green-500 shrink-0 mt-1" />
                    <div><p className="text-sm font-bold">{showToast.message}</p><p className="text-xs opacity-80 mt-1">{showToast.subMessage}</p></div>
                </div>
            )}

            <div className={`bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg text-gray-900 dark:text-white">Marknadsföring</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-black"><PanelLeftClose size={16} /></button>
                </div>
                
                <div className="p-2 overflow-y-auto flex-1 space-y-4">
                    <button onClick={handleNewAnalysis} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow-sm"><Plus size={16} /> Ny Analys</button>
                    {dnas.map(d => {
                        const dnaCampaigns = campaigns.filter(c => c.brandDnaId === d.id);
                        return (
                            <div key={d.id} className={`rounded-xl border group transition-all ${dna?.id === d.id ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                                <div className="p-3 cursor-pointer flex items-center justify-between">
                                    <div onClick={() => handleLoadDna(d)} className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{d.meta?.brandName || 'Namnlöst'}</h3>
                                        <p className="text-xs text-gray-500 truncate">{d.meta?.siteUrl}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete({type: 'dna', id: d.id, name: d.meta?.brandName || 'DNA'}); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                </div>
                                {dnaCampaigns.map(c => (
                                    <div key={c.id} className="px-3 pb-2 flex items-center justify-between group/camp">
                                        <button onClick={() => handleLoadCampaign(c)} className={`text-left text-xs py-1 px-2 rounded-lg flex items-center gap-2 truncate flex-1 ${selectedIdea?.name === c.name ? 'bg-black text-white' : 'text-gray-500'}`}><Layers size={10} />{c.name}</button>
                                        <button onClick={(e) => { e.stopPropagation(); setItemToDelete({type: 'campaign', id: c.id, name: c.name}); }} className="opacity-0 group-hover/camp:opacity-100 p-1 text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md"><PanelLeftOpen size={18} /></button>
                )}

                {step === 'onboarding' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn">
                        <div className="max-w-2xl text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black dark:bg-white text-white dark:text-black mb-6 shadow-xl transform rotate-3"><Globe size={32} /></div>
                            <h1 className="font-serif-display text-4xl md:text-5xl text-gray-900 dark:text-white mb-6">Business Marketing Engine</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">Ange din webbadress. Vi skapar kompletta marknadsföringskampanjer baserat på din unika stil.</p>
                            <div className="flex flex-col md:flex-row gap-2 max-w-lg mx-auto">
                                <input type="url" placeholder="https://dittföretag.se" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} className="flex-1 h-14 pl-6 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-full text-lg outline-none focus:border-black dark:text-white" />
                                <button onClick={analyzeBrandDNA} disabled={!brandUrl} className="h-14 px-8 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50">Analysera</button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'dna_review' && dna && (
                    <div className="flex flex-col max-w-5xl mx-auto p-8 w-full animate-fadeIn">
                        <div className="flex justify-between items-end mb-8">
                            <div><span className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2 block">Analys Klar</span><h2 className="font-serif-display text-4xl text-gray-900 dark:text-white">{dna.meta?.brandName} DNA</h2></div>
                            <button onClick={() => setStep('campaign_brief')} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">Starta Kampanj <ArrowRight size={18} /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Palette className="text-purple-600" /> Visuell Identitet</h3>
                                <div className="space-y-6">
                                    <div><span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Färgpalett</span><div className="flex gap-3">{(dna.visual?.primaryColors || []).map((c, i) => <div key={i} className="w-12 h-12 rounded-full border border-gray-100" style={{ backgroundColor: c.hex }}></div>)}</div></div>
                                    <div className="grid grid-cols-2 gap-4"><div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"><span className="text-xs font-bold text-gray-400 mb-1 block">Rubriktypsnitt</span><p className="text-lg font-serif-display">{dna.visual?.typography?.primaryFont?.name}</p></div><div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"><span className="text-xs font-bold text-gray-400 mb-1 block">Brödtext</span><p className="text-lg">{dna.visual?.typography?.secondaryFont?.name}</p></div></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Megaphone className="text-blue-600" /> Röst & Tonalitet</h3>
                                <div className="flex flex-wrap gap-2 mb-6">{(dna.voice?.toneDescriptors || []).map((tone, i) => <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-sm font-medium rounded-lg border">{tone}</span>)}</div>
                                <div className="grid grid-cols-2 gap-4"><div className="p-3 border bg-green-50/10 rounded-xl"><span className="text-xs font-bold text-green-700 uppercase mb-1 block">Gör detta</span><ul className="text-xs space-y-1 list-disc pl-3">{(dna.voice?.doUse || []).slice(0,3).map((item, i) => <li key={i}>{item}</li>)}</ul></div><div className="p-3 border bg-red-50/10 rounded-xl"><span className="text-xs font-bold text-red-700 uppercase mb-1 block">Undvik</span><ul className="text-xs space-y-1 list-disc pl-3">{(dna.voice?.dontUse || []).slice(0,3).map((item, i) => <li key={i}>{item}</li>)}</ul></div></div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'campaign_brief' && (
                    <div className="h-full flex items-center justify-center p-6 animate-fadeIn">
                        <div className="max-w-xl w-full bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
                            <h2 className="font-serif-display text-3xl mb-8">Ny Kampanj</h2>
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold uppercase mb-2">Vad är målet?</label><input className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-transparent focus:border-black outline-none" placeholder="t.ex. Lansera vår nya tjänst" value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} /></div>
                                <div><label className="block text-xs font-bold uppercase mb-2">Målgrupp</label><input className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-transparent focus:border-black outline-none" placeholder="t.ex. Småföretagare" value={campaignAudience} onChange={e => setCampaignAudience(e.target.value)} /></div>
                                <button onClick={generateCampaignIdeas} disabled={!campaignGoal} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-4"><Sparkles size={20} /> Generera Idéer</button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'campaign_selection' && (
                    <div className="h-full max-w-6xl mx-auto p-6 animate-fadeIn overflow-y-auto">
                        <h2 className="font-serif-display text-4xl text-center mb-12">Välj din strategi</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {(campaignIdeas || []).map((idea) => (
                                <div key={idea.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 hover:shadow-xl transition-all flex flex-col">
                                    <h3 className="font-serif-display text-2xl mb-2">{idea.name}</h3>
                                    <p className="text-sm text-gray-500 mb-6 flex-1">{idea.angle}</p>
                                    <button onClick={() => generateAssets(idea)} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-full font-bold">Välj denna</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'asset_generation' && (
                    <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 animate-fadeIn overflow-hidden">
                        <div className="w-full md:w-80 bg-white dark:bg-gray-900 border-r flex flex-col h-full">
                            <div className="p-6 border-b"><h3 className="font-serif-display text-xl">{selectedIdea?.name}</h3></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {(assets || []).map(asset => (
                                    <button key={asset.id} onClick={() => setActiveAssetId(asset.id)} className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${activeAssetId === asset.id ? 'bg-black dark:bg-white text-white dark:text-black border-black shadow-md' : 'bg-white dark:bg-gray-800'}`}>
                                        {asset.channel === 'instagram_feed' && <Instagram size={18} />}
                                        {asset.channel === 'linkedin_post' && <Linkedin size={18} />}
                                        {asset.channel === 'email_intro' && <Mail size={18} />}
                                        <div className="flex-1 min-w-0"><span className="block text-sm font-bold capitalize">{asset.channel.replace('_', ' ')}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-12">
                            {activeAssetId && assets.find(a => a.id === activeAssetId) && (
                                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Rubrik</label><input className="w-full bg-transparent border-b-2 py-2 text-xl font-serif-display dark:text-white" value={assets.find(a => a.id === activeAssetId)?.content?.headline || ''} readOnly /></div>
                                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Text</label><textarea className="w-full bg-white dark:bg-gray-900 border rounded-xl p-4 text-sm leading-relaxed h-64 resize-none outline-none dark:text-white" value={assets.find(a => a.id === activeAssetId)?.content?.body || ''} readOnly /></div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-4">Förhandsgranskning</label>
                                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border overflow-hidden">
                                            {assets.find(a => a.id === activeAssetId)?.image && (
                                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    {assets.find(a => a.id === activeAssetId)?.image?.url ? <img src={assets.find(a => a.id === activeAssetId)?.image?.url} className="w-full h-full object-cover" /> : <Loader2 className="animate-spin text-gray-400" size={32} />}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => handleAttachToPlatform(assets.find(a => a.id === activeAssetId)!)} disabled={attachStatus === 'loading'} className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${attachStatus === 'success' ? 'bg-green-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>{attachStatus === 'loading' ? <Loader2 className="animate-spin" /> : <Share2 />} Bifoga & Kopiera</button>
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