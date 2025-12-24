
import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Palette, Type, Globe, Megaphone, Instagram, Linkedin, Mail, 
    Loader2, ArrowRight, Layers, Copy, Wand2, Plus, 
    ChevronRight, CheckCircle2, LayoutTemplate, Target, AlertCircle, Image as ImageIcon,
    RefreshCw, PanelLeftClose, PanelLeftOpen, Clock, Share2, Check, Download
} from 'lucide-react';
import { User, BrandDNA, MarketingCampaign, CampaignIdea, CampaignAsset } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

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
    
    // Track individual image generation status
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

    // Attach/Share State
    const [attachStatus, setAttachStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [showToast, setShowToast] = useState<{message: string, subMessage?: string, visible: boolean}>({ message: '', visible: false });

    // Initial Load
    useEffect(() => {
        loadHistory();
    }, [user.id]);

    const loadHistory = async () => {
        const data = await db.getUserData(user.id);
        if (data.brandDNAs && data.brandDNAs.length > 0) {
            setDnas(data.brandDNAs.sort((a,b) => new Date(b.meta.generatedAt).getTime() - new Date(a.meta.generatedAt).getTime()));
        }
        if (data.marketingCampaigns) {
            setCampaigns(data.marketingCampaigns);
        }
    };

    // --- NAVIGATION HANDLERS ---

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
        // Find parent DNA
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

    // --- 1. DNA EXTRACTION ENGINE ---
    const analyzeBrandDNA = async () => {
        if (!brandUrl) return;
        setIsProcessing(true);
        setLoadingMessage('Skannar webbplatsstruktur & design...');
        setStep('analyzing');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const analysisPrompt = `
                ACT AS A SENIOR BRAND STRATEGIST.
                TARGET URL: ${brandUrl}
                
                MISSION: Perform a visual and textual audit using Google Search grounding.
                
                ANALYZE:
                1. Visuals: Find logo description, primary brand colors (hex), font styles.
                2. Voice: Tone (Formal/Casual), sentence length, "Do's and Don'ts".
                3. Messaging: Taglines, Value Props, Target Audience.

                OUTPUT FORMAT: Strictly Valid JSON matching this schema:
                {
                    "meta": { "brandName": "string", "siteUrl": "${brandUrl}", "language": "sv-SE", "generatedAt": "${new Date().toISOString()}" },
                    "visual": {
                        "primaryColors": [{ "hex": "#...", "role": "primary", "usageHint": "string" }],
                        "secondaryColors": [{ "hex": "#...", "role": "accent", "usageHint": "string" }],
                        "neutralColors": [{ "hex": "#...", "role": "background" }],
                        "typography": {
                            "primaryFont": { "name": "string", "family": "sans-serif/serif", "usage": "headers" },
                            "secondaryFont": { "name": "string", "family": "sans-serif/serif", "usage": "body" }
                        },
                        "layoutStyle": { "density": "airy/compact", "shapeStyle": "rounded/sharp", "photoStyle": "string", "notes": "string" }
                    },
                    "voice": {
                        "toneDescriptors": ["string", "string"],
                        "formality": "casual/formal",
                        "sentenceLength": { "averageWords": 10, "style": "concise/mixed" },
                        "doUse": ["string"],
                        "dontUse": ["string"]
                    },
                    "messaging": {
                        "tagline": "string",
                        "valueProps": [{ "label": "string", "description": "string" }],
                        "targetAudiences": [{ "name": "string", "painPoints": ["string"] }]
                    }
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: analysisPrompt,
                config: { 
                    tools: [{googleSearch: {}}]
                }
            });

            let jsonText = response.text || '{}';
            
            const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }

            const resultJSON = JSON.parse(jsonText);
            
            if (!resultJSON.visual?.primaryColors?.length) {
                resultJSON.visual = {
                    primaryColors: [{ hex: '#000000', role: 'primary', usageHint: 'Fallback' }],
                    secondaryColors: [{ hex: '#666666', role: 'accent', usageHint: 'Fallback' }],
                    neutralColors: [{ hex: '#FFFFFF', role: 'background' }],
                    typography: { primaryFont: { name: 'Inter', family: 'sans-serif' }, secondaryFont: { name: 'Inter', family: 'sans-serif' } },
                    layoutStyle: { density: 'balanced', shapeStyle: 'rounded', photoStyle: 'modern', notes: 'Standard clean layout' }
                };
            }

            resultJSON.id = Date.now().toString();

            await db.addBrandDNA(user.id, resultJSON);
            setDna(resultJSON);
            setDnas(prev => [resultJSON, ...prev]);
            setStep('dna_review');

        } catch (e) {
            console.error("DNA Analysis Failed:", e);
            alert("Kunde inte analysera webbplatsen. Kontrollera URL:en.");
            setStep('onboarding');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 2. CAMPAIGN IDEATION ---
    const generateCampaignIdeas = async () => {
        if (!dna || !campaignGoal) return;
        setIsProcessing(true);
        setLoadingMessage('Genererar strategiska koncept...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                ACT AS A SENIOR MARKETING STRATEGIST.
                
                INPUT DNA: ${JSON.stringify(dna)}
                CAMPAIGN BRIEF:
                - Goal: ${campaignGoal}
                - Audience: ${campaignAudience}
                - Timeframe: ${campaignTimeframe}

                TASK: Create 3 distinct campaign concepts that perfectly match the brand voice.
                
                OUTPUT: JSON Array of objects:
                [
                    {
                        "id": "short-id",
                        "name": "Creative Campaign Name",
                        "angle": "Strategic Angle (1 sentence)",
                        "primaryGoal": "The specific KPI",
                        "suggestedChannels": ["instagram", "linkedin", "email"],
                        "coreMessage": "Main marketing hook",
                        "exampleHeadline": "Catchy headline example"
                    }
                ]
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const ideas = JSON.parse(response.text || '[]');
            setCampaignIdeas(ideas);
            setStep('campaign_selection');

        } catch (e) {
            console.error("Campaign Generation Failed", e);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 3. ASSET GENERATION ---
    const generateAssets = async (idea: CampaignIdea, isAppending = false) => {
        setIsProcessing(true);
        setLoadingMessage(isAppending ? 'Genererar fler varianter...' : 'Skapar copy och design för alla kanaler...');
        if (!isAppending) setSelectedIdea(idea);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const textPrompt = `
                ACT AS A SENIOR COPYWRITER.
                DNA VOICE: ${JSON.stringify(dna?.voice)}
                CAMPAIGN: ${JSON.stringify(idea)}
                ${isAppending ? 'TASK: Generate 3 NEW unique variations.' : ''}
                
                TASK: Generate content for the following channels:
                1. Instagram Feed (Casual, emoji-friendly, visual focus)
                2. LinkedIn Post (Professional, thought leadership, clear value)
                3. Email Intro (Direct, personal, conversion focused)

                OUTPUT: JSON Array of objects with structure:
                { 
                    "id": "unique_id_${Date.now()}_index", 
                    "channel": "instagram_feed" | "linkedin_post" | "email_intro",
                    "content": { "headline": "...", "body": "...", "cta": "...", "hashtags": ["..."], "notes": "Visual direction..." }
                }
            `;

            const textResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: textPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const textAssets: CampaignAsset[] = JSON.parse(textResponse.text || '[]');
            
            if (isAppending) {
                setAssets(prev => [...prev, ...textAssets]);
            } else {
                setAssets(textAssets);
                if (textAssets.length > 0) setActiveAssetId(textAssets[0].id);
                setStep('asset_generation');
            }
            
            setIsProcessing(false);

            textAssets.forEach(asset => {
                if (asset.channel !== 'email_intro') {
                    generateImageForAsset(asset);
                }
            });

            if (!isAppending) {
                const campaignRecord: MarketingCampaign = {
                    id: Date.now().toString(),
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
            console.error("Asset Generation Failed", e);
            setIsProcessing(false);
        }
    };

    const generateImageForAsset = async (asset: CampaignAsset) => {
        setGeneratingImages(prev => ({ ...prev, [asset.id]: true }));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const promptGenPrompt = `
                Create a text-to-image prompt for this campaign asset.
                Context: ${asset.content?.body || 'Marketing image'}
                Visual Style: ${dna?.visual?.layoutStyle?.photoStyle || 'modern'}, ${dna?.visual?.primaryColors?.map(c => c.hex).join(', ') || '#000000'}
                Requirement: High quality, photorealistic or 3D render, minimalist.
                Output: Just the prompt string.
            `;
            
            const promptRes = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptGenPrompt });
            const imagePrompt = promptRes.text?.trim() || "";

            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { imageConfig: { aspectRatio: asset.channel === 'instagram_feed' ? '1:1' : '4:3' } }
            });
            
            let imgData = '';
            // Robust part extraction according to docs
            if (imgRes.candidates && imgRes.candidates[0].content?.parts) {
                for (const part of imgRes.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imgData = part.inlineData.data;
                        break;
                    }
                }
            }

            setAssets(prev => prev.map(a => 
                a.id === asset.id 
                ? { ...a, image: { prompt: imagePrompt, url: imgData ? `data:image/jpeg;base64,${imgData}` : undefined } }
                : a
            ));

        } catch (err) {
            console.warn("Image generation failed for asset", asset.id);
        } finally {
            setGeneratingImages(prev => ({ ...prev, [asset.id]: false }));
        }
    };

    const handleRegenerateImage = async (asset: CampaignAsset) => {
        if (!asset) return;
        await generateImageForAsset(asset);
    };

    const handleGenerateMore = async () => {
        if (selectedIdea) {
            await generateAssets(selectedIdea, true);
        }
    };

    const downloadImage = (base64Data: string, filename: string) => {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAttachToPlatform = async (asset: CampaignAsset) => {
        setAttachStatus('loading');
        
        const textToCopy = `${asset.content?.headline || ''}\n\n${asset.content?.body || ''}\n\n${asset.content?.hashtags?.map(h => `#${h}`).join(' ') || ''}`;
        try {
            await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
            console.error("Clipboard failed", err);
        }

        let imageAction = '';
        if (asset.image?.url) {
            downloadImage(asset.image.url, `aceverse_${asset.channel}_${Date.now()}.png`);
            imageAction = 'Bild nedladdad';
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        let platformName = '';
        
        if (asset.channel === 'instagram_feed') {
            platformName = 'Instagram';
            window.open('https://www.instagram.com/', '_blank'); 
        } else if (asset.channel === 'linkedin_post') {
            platformName = 'LinkedIn';
            window.open('https://www.linkedin.com/feed/', '_blank');
        } else if (asset.channel === 'email_intro') {
            platformName = 'Mail';
            const subject = encodeURIComponent(asset.content?.headline || 'Hej');
            const body = encodeURIComponent(asset.content?.body || '');
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }

        setAttachStatus('success');
        
        const toastMsg = imageAction ? `${imageAction} & text kopierad!` : `Text kopierad!`;
        const subMsg = `Klistra in på ${platformName} (öppnas nu)`;

        setShowToast({ message: toastMsg, subMessage: subMsg, visible: true });
        
        setTimeout(() => {
            setAttachStatus('idle');
            setShowToast({ message: '', visible: false });
        }, 5000);
    };

    if (isProcessing) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 animate-fadeIn">
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-black dark:border-white rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white" />
                </div>
                <h3 className="font-serif-display text-2xl text-gray-900 dark:text-white mb-2">{loadingMessage}</h3>
                <p className="text-gray-500 text-sm">Aceverse AI arbetar med din strategi...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 relative">
            
            {showToast.visible && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-xl shadow-2xl flex items-start gap-3 animate-[slideUp_0.5s_ease-out_forwards] max-w-sm">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">{showToast.message}</p>
                        {showToast.subMessage && <p className="text-xs opacity-80 mt-1">{showToast.subMessage}</p>}
                    </div>
                </div>
            )}

            <div className={`bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg text-gray-900 dark:text-white">Mina Varumärken</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white"><PanelLeftClose size={16} /></button>
                </div>
                
                <div className="p-2 overflow-y-auto flex-1 space-y-4">
                    <button 
                        onClick={handleNewAnalysis}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow-sm"
                    >
                        <Plus size={16} /> Ny Analys
                    </button>

                    {dnas.length === 0 && <div className="text-center text-xs text-gray-400 mt-4">Inga analyser sparade än.</div>}

                    {dnas.map(d => {
                        const dnaCampaigns = campaigns.filter(c => c.brandDnaId === d.id);
                        const isActive = dna?.id === d.id;

                        return (
                            <div key={d.id} className={`rounded-xl border transition-all ${isActive ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 shadow-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-900'}`}>
                                <div 
                                    onClick={() => handleLoadDna(d)}
                                    className="p-3 cursor-pointer flex items-center justify-between"
                                >
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{d.meta?.brandName || 'Namnlöst'}</h3>
                                        <p className="text-xs text-gray-500 truncate w-40">{d.meta?.siteUrl || ''}</p>
                                    </div>
                                    {isActive && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                                </div>

                                {dnaCampaigns.length > 0 && (
                                    <div className="px-3 pb-3 space-y-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kampanjer</div>
                                        {dnaCampaigns.map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => handleLoadCampaign(c)}
                                                className={`w-full text-left text-xs py-1.5 px-2 rounded-lg flex items-center gap-2 truncate ${selectedIdea?.name === c.name ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            >
                                                <Layers size={10} />
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
                {!isSidebarOpen && (
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <PanelLeftOpen size={18} />
                    </button>
                )}

                {step === 'onboarding' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fadeIn">
                        <div className="max-w-2xl text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black dark:bg-white text-white dark:text-black mb-6 shadow-xl transform rotate-3">
                                <Globe size={32} />
                            </div>
                            <h1 className="font-serif-display text-4xl md:text-5xl text-gray-900 dark:text-white mb-6">One-URL Marketing Engine</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
                                Klistra in din webbadress. Vår AI skannar automatiskt ditt varumärkes "DNA" (färger, röst, stil) och skapar kompletta marknadsföringskampanjer på sekunder.
                            </p>
                            
                            <div className="flex flex-col md:flex-row gap-2 max-w-lg mx-auto relative">
                                <div className="flex-1 relative">
                                    <input 
                                        type="url" 
                                        placeholder="https://dittföretag.se"
                                        value={brandUrl}
                                        onChange={(e) => setBrandUrl(e.target.value)}
                                        className="w-full h-14 pl-6 pr-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-full text-lg outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <button 
                                    onClick={analyzeBrandDNA}
                                    disabled={!brandUrl}
                                    className="h-14 px-8 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
                                >
                                    Analysera
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-gray-400 font-medium tracking-wide uppercase">Powered by Google Gemini 3</p>
                        </div>
                    </div>
                )}

                {step === 'dna_review' && dna && (
                    <div className="flex flex-col max-w-5xl mx-auto p-8 w-full animate-fadeIn">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                    <CheckCircle2 size={14} /> Analys Klar
                                </span>
                                <h2 className="font-serif-display text-4xl text-gray-900 dark:text-white">{dna.meta?.brandName || 'Varumärke'} DNA</h2>
                            </div>
                            <button 
                                onClick={() => setStep('campaign_brief')}
                                className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                Starta Kampanj <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><Palette size={20} /></div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Visuell Identitet</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Färgpalett</span>
                                        <div className="flex gap-3">
                                            {(dna.visual?.primaryColors || []).map((c, i) => (
                                                <div key={i} className="group relative">
                                                    <div className="w-12 h-12 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer transition-transform hover:scale-110" style={{ backgroundColor: c.hex }}></div>
                                                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c.hex}</span>
                                                </div>
                                            ))}
                                            {(dna.visual?.secondaryColors || []).map((c, i) => (
                                                <div key={`s-${i}`} className="w-8 h-8 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 mt-2" style={{ backgroundColor: c.hex }}></div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Rubriktypsnitt</span>
                                            <p className="text-lg font-serif-display text-gray-900 dark:text-white">{dna.visual?.typography?.primaryFont?.name || 'Standard'}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Brödtext</span>
                                            <p className="text-lg font-sans text-gray-900 dark:text-white">{dna.visual?.typography?.secondaryFont?.name || 'Standard'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Designstil</span>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{dna.visual?.layoutStyle?.notes || 'Modern och ren layout.'}"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><Megaphone size={20} /></div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Röst & Tonalitet</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-2">
                                        {(dna.voice?.toneDescriptors || []).map((tone, i) => (
                                            <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700">
                                                {tone}
                                            </span>
                                        ))}
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Formellhetsgrad</span>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-1/2 rounded-full relative"></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 uppercase font-bold">
                                            <span>Casual</span>
                                            <span>Formell</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 border border-green-100 dark:border-green-900 bg-green-50 dark:bg-green-900/10 rounded-xl">
                                            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1 block">Gör detta</span>
                                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-3">
                                                {(dna.voice?.doUse || []).slice(0,3).map((item, i) => <li key={i}>{item}</li>)}
                                            </ul>
                                        </div>
                                        <div className="p-3 border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/10 rounded-xl">
                                            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-1 block">Undvik</span>
                                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-3">
                                                {(dna.voice?.dontUse || []).slice(0,3).map((item, i) => <li key={i}>{item}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'campaign_brief' && (
                    <div className="h-full flex items-center justify-center p-6 animate-fadeIn">
                        <div className="max-w-xl w-full bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
                            <button onClick={() => setStep('dna_review')} className="text-gray-400 hover:text-black dark:hover:text-white mb-6 flex items-center gap-1 text-sm font-medium"><ChevronRight className="rotate-180" size={16} /> Tillbaka</button>
                            <h2 className="font-serif-display text-3xl mb-2 text-gray-900 dark:text-white">Ny Kampanj</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Berätta vad du vill uppnå, så tar AI fram strategin.</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase mb-2">Vad är målet?</label>
                                    <input 
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-transparent focus:border-black dark:focus:border-white focus:ring-0 border-2 transition-all dark:text-white outline-none"
                                        placeholder="t.ex. Lansera vår nya vårkollektion"
                                        value={campaignGoal}
                                        onChange={e => setCampaignGoal(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase mb-2">Målgrupp</label>
                                    <input 
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-transparent focus:border-black dark:focus:border-white focus:ring-0 border-2 transition-all dark:text-white outline-none"
                                        placeholder="t.ex. Studenter i Stockholm"
                                        value={campaignAudience}
                                        onChange={e => setCampaignAudience(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase mb-2">Tidsperiod</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-transparent focus:border-black dark:focus:border-white focus:ring-0 border-2 transition-all dark:text-white outline-none cursor-pointer"
                                        value={campaignTimeframe}
                                        onChange={e => setCampaignTimeframe(e.target.value)}
                                    >
                                        <option>Kommande 4 veckor</option>
                                        <option>Next kvartal</option>
                                        <option>Inför helgen</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={generateCampaignIdeas}
                                    disabled={!campaignGoal}
                                    className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={20} /> Generera Idéer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'campaign_selection' && (
                    <div className="h-full max-w-6xl mx-auto p-6 animate-fadeIn overflow-y-auto">
                        <div className="text-center mb-12">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">AI Strategy</span>
                            <h2 className="font-serif-display text-4xl text-gray-900 dark:text-white">Välj din strategi</h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {(campaignIdeas || []).map((idea) => (
                                <div key={idea.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                                    <div className="mb-6">
                                        <h3 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">{idea.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{idea.angle}</p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-8 flex-1">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Huvudbudskap</span>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">"{idea.coreMessage}"</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(idea.suggestedChannels || []).map(c => (
                                                <span key={c} className="text-[10px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded uppercase font-bold text-gray-500">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => generateAssets(idea)}
                                        className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Välj denna
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'asset_generation' && (
                    <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 animate-fadeIn overflow-hidden">
                        <div className="w-full md:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <button onClick={() => setStep('campaign_selection')} className="text-xs font-bold text-gray-400 hover:text-black dark:hover:text-white mb-2 flex items-center gap-1"><ChevronRight className="rotate-180" size={12} /> Tillbaka</button>
                                <h3 className="font-serif-display text-xl text-gray-900 dark:text-white">{selectedIdea?.name || 'Kampanj'}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Genererade tillgångar</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {(assets || []).map(asset => (
                                    <button 
                                        key={asset.id}
                                        onClick={() => setActiveAssetId(asset.id)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                                            activeAssetId === asset.id 
                                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md' 
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {asset.channel === 'instagram_feed' && <Instagram size={18} />}
                                        {asset.channel === 'linkedin_post' && <Linkedin size={18} />}
                                        {asset.channel === 'email_intro' && <Mail size={18} />}
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="block text-sm font-bold capitalize">{asset.channel.replace('_', ' ')}</span>
                                                {generatingImages[asset.id] && <Loader2 size={12} className="animate-spin text-gray-400" />}
                                            </div>
                                            <span className="text-[10px] opacity-70 truncate block">{asset.content?.headline || 'Utkast'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                                <button 
                                    onClick={handleGenerateMore}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
                                    Generera fler
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-12">
                            {activeAssetId && assets.find(a => a.id === activeAssetId) && (
                                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Rubrik</label>
                                            <input 
                                                className="w-full bg-transparent border-b-2 border-gray-200 dark:border-gray-700 py-2 text-xl font-serif-display text-gray-900 dark:text-white focus:border-black dark:focus:border-white outline-none transition-colors"
                                                value={assets.find(a => a.id === activeAssetId)?.content?.headline || ''}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Text</label>
                                            <textarea 
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 h-64 resize-none focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
                                                value={assets.find(a => a.id === activeAssetId)?.content?.body || ''}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Call to Action</label>
                                            <input 
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white"
                                                value={assets.find(a => a.id === activeAssetId)?.content?.cta || ''}
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-4">Förhandsgranskning</label>
                                        
                                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                                <div>
                                                    <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                                                    <div className="h-2 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                                </div>
                                            </div>

                                            {assets.find(a => a.id === activeAssetId)?.image && (
                                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden group">
                                                    {assets.find(a => a.id === activeAssetId)?.image?.url ? (
                                                        <img src={assets.find(a => a.id === activeAssetId)?.image?.url} alt="Generated" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                                            {generatingImages[activeAssetId!] ? (
                                                                <>
                                                                    <Loader2 size={32} className="mb-2 animate-spin" />
                                                                    <p className="text-xs">Genererar bild...</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ImageIcon size={32} className="mb-2" />
                                                                    <p className="text-xs">Väntar på bild...</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button 
                                                            onClick={() => handleRegenerateImage(assets.find(a => a.id === activeAssetId)!)}
                                                            className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform"
                                                        >
                                                            {generatingImages[activeAssetId!] ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} 
                                                            Regenerera Bild
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-4">
                                                <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                                                    <span className="font-bold mr-2">aceverse_demo</span>
                                                    {assets.find(a => a.id === activeAssetId)?.content?.headline} {(assets.find(a => a.id === activeAssetId)?.content?.body || '').substring(0, 80)}...
                                                </p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                                    {assets.find(a => a.id === activeAssetId)?.content?.hashtags?.map(h => `#${h} `)}
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleAttachToPlatform(assets.find(a => a.id === activeAssetId)!)}
                                            disabled={attachStatus === 'loading' || attachStatus === 'success'}
                                            className={`w-full mt-6 py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                attachStatus === 'success' 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-black dark:bg-white text-white dark:text-black'
                                            }`}
                                        >
                                            {attachStatus === 'loading' && <Loader2 size={18} className="animate-spin" />}
                                            {attachStatus === 'success' && <Check size={18} />}
                                            {attachStatus === 'idle' && <Share2 size={18} />}
                                            
                                            {attachStatus === 'loading' && `Ansluter till ${(assets.find(a => a.id === activeAssetId)?.channel || '').split('_')[0]}...`}
                                            {attachStatus === 'success' && 'Bifogat!'}
                                            {attachStatus === 'idle' && `Bifoga till ${(assets.find(a => a.id === activeAssetId)?.channel || '').split('_')[0].replace(/^\w/, c => c.toUpperCase())}`}
                                        </button>
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
