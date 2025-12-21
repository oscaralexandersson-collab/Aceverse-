
import React, { useState, useEffect, useRef } from 'react';
import { 
    Mic, FileText, Send, Check, Copy, ArrowRight, ArrowLeft, 
    Presentation, Plus, Play, Sparkles, User as UserIcon, Settings, BarChart3, AlertCircle, Loader2, Briefcase, Smile, Command, X, Tag, Image as ImageIcon, Quote,
    Target, ThumbsUp, BrainCircuit, Lightbulb, TrendingUp, MessageSquare, Gauge, Download, History, ChevronRight, Trash2, Clock
} from 'lucide-react';
import { User, Pitch, Coach, PitchAnalysis, ChatMessage } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import PptxGenJS from 'pptxgenjs';
import { useLanguage } from '../../contexts/LanguageContext';

interface PitchStudioProps {
    user: User;
}

type Tab = 'generator' | 'dojo' | 'coaches';

// --- ACEVERSE KRUNCH KEEPER DESIGN SYSTEM ---
const KK_DESIGN = {
    colors: {
        background: 'F3F0E8', 
        text: '000000',
        accent: 'D24726', 
    },
    fonts: {
        header: 'Inter', 
        body: 'Inter'
    }
};

// --- RICH TEXT RENDERER FOR AI MESSAGES ---
const RichTextResponse: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // Remove tags if they exist
    let cleanText = text.replace(/<SCORE>.*?<\/SCORE>/gs, '').trim();

    // Split into blocks
    const blocks = cleanText.split(/\n\n+/);

    return (
        <div className="space-y-4 text-gray-800 dark:text-gray-200">
            {blocks.map((block, index) => {
                // H1/H2 style (using Playfair)
                if (block.startsWith('##')) {
                    return (
                        <h3 key={index} className="font-serif-display text-xl font-bold text-black dark:text-white mt-4 mb-2">
                            {block.replace(/^##\s*/, '')}
                        </h3>
                    );
                }
                // Bullet points
                if (block.match(/^[\-*]\s/m)) {
                    const items = block.split(/\n/).filter(line => line.trim().length > 0);
                    return (
                        <ul key={index} className="space-y-2 my-2">
                            {items.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-1.5 shrink-0 opacity-50"></div>
                                    <span dangerouslySetInnerHTML={{ 
                                        __html: item.replace(/^[\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                                    }} />
                                </li>
                            ))}
                        </ul>
                    );
                }
                // Paragraph
                return (
                    <p key={index} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ 
                        __html: block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    }} />
                );
            })}
        </div>
    );
};

interface AdvancedSlide {
    slide_number: number;
    type: 'cover' | 'problem' | 'solution' | 'timeline' | 'audience' | 'market' | 'future' | 'closing';
    content: {
        headline: string;
        subheadline?: string;
        points?: string[];
        team?: string[];
        images?: string[]; 
        metadata?: any;
    };
}

const SlidePreview: React.FC<{ slide: AdvancedSlide, companyName: string }> = ({ slide, companyName }) => {
    return (
        <div className="aspect-video bg-[#F3F0E8] shadow-lg rounded-sm border border-gray-200 overflow-hidden flex flex-col relative group transition-transform hover:scale-[1.02]">
            <div className="absolute top-4 left-4 w-6 h-6 bg-black opacity-20 flex items-center justify-center">
                <span className="text-[6px] text-white font-bold italic">A</span>
            </div>
            
            <div className="flex-1 p-8 flex flex-col justify-center">
                {slide.type === 'cover' && (
                    <>
                        <h3 className="font-serif-display text-2xl font-black uppercase tracking-tighter text-black mb-2">{companyName}</h3>
                        <p className="text-[10px] font-bold text-black opacity-80">{slide.content.subheadline}</p>
                        <div className="absolute bottom-4 left-4 flex gap-2">
                             {slide.content.team?.map((m, i) => <span key={i} className="text-[6px] font-bold uppercase opacity-40">{m}</span>)}
                        </div>
                    </>
                )}

                {slide.type === 'problem' && (
                    <div className="flex justify-between items-center h-full">
                         <div className="w-1/3 space-y-2">
                            {slide.content.points?.map((p, i) => (
                                <div key={i} className="text-[8px] font-bold flex gap-2">
                                    <span className="opacity-40">0{i+1}</span>
                                    <span className="uppercase">{p}</span>
                                </div>
                            ))}
                         </div>
                         <div className="w-1/3 text-right">
                            <h4 className="font-serif-display text-xl font-black uppercase">{slide.content.headline}</h4>
                            <p className="text-[8px] opacity-60">Mjukt bröd efter minuter</p>
                         </div>
                    </div>
                )}

                {slide.type !== 'cover' && slide.type !== 'problem' && (
                    <>
                        <h4 className="font-serif-display text-xl font-black uppercase mb-4">{slide.content.headline}</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="aspect-square bg-white/50 border border-black/5 rounded-sm flex items-center justify-center">
                                    <ImageIcon size={12} className="text-black/10" />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="absolute bottom-2 right-4 text-[6px] text-black/20 font-bold uppercase tracking-widest">
                {companyName} • 0{slide.slide_number}
            </div>
        </div>
    );
};

const PitchStudio: React.FC<PitchStudioProps> = ({ user }) => {
    const { t } = useLanguage();
    
    // --- STATE ---
    const [step, setStep] = useState<'history' | 'chat' | 'preview'>('history');
    const [savedPitches, setSavedPitches] = useState<Pitch[]>([]);
    const [currentPitchId, setCurrentPitchId] = useState<string | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [contextScore, setContextScore] = useState(0);
    const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
    const [generatedData, setGeneratedData] = useState<{ metadata: any, slides: AdvancedSlide[] } | null>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadPitches(); }, [user.id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    const loadPitches = async () => {
        const data = await db.getUserData(user.id);
        setSavedPitches(data.pitches || []);
    };

    const handleDeletePitch = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Är du säker på att du vill radera denna presentation? Detta går inte att ångra.")) {
            try {
                await db.deletePitch(user.id, id);
                setSavedPitches(prev => prev.filter(p => p.id !== id));
                if (currentPitchId === id) setStep('history');
            } catch (err) {
                console.error("Failed to delete pitch", err);
                alert("Kunde inte radera presentationen.");
            }
        }
    };

    const handleCreateNewPitch = async () => {
        const sessionId = 'ps-' + Date.now();
        const newPitch = await db.addPitch(user.id, {
            type: 'deck',
            name: `Projekt: ${new Date().toLocaleDateString()}`,
            content: '',
            chatSessionId: sessionId,
            contextScore: 10
        });

        setCurrentPitchId(newPitch.id);
        setCurrentSessionId(sessionId);
        setMessages([{
            id: 'init',
            role: 'ai',
            text: `## Välkommen till din Pitch Architect 👋\n\nVi kommer att bygga din presentation baserat på Aceverse "Krunch Keeper"-mall (Beige/Modern). Berätta: Vad vill du presentera idag?`,
            timestamp: Date.now()
        }]);
        setContextScore(10);
        setGeneratedData(null);
        setStep('chat');
        loadPitches();
    };

    const handleLoadPitch = async (pitch: Pitch) => {
        setCurrentPitchId(pitch.id);
        setCurrentSessionId(pitch.chatSessionId || null);
        setContextScore(pitch.contextScore || 0);

        if (pitch.chatSessionId) {
            const data = await db.getUserData(user.id);
            const history = data.chatHistory.filter(m => m.sessionId === pitch.chatSessionId).sort((a,b) => a.timestamp - b.timestamp);
            setMessages(history.length > 0 ? history : [{ id: 'init', role: 'ai', text: "## Fortsätt bygga din pitch\n\nVad vill du justera idag?", timestamp: Date.now() }]);
        }

        if (pitch.content) {
            try {
                setGeneratedData(JSON.parse(pitch.content));
                setStep('preview');
            } catch (e) { setStep('chat'); }
        } else {
            setStep('chat');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isThinking || !currentSessionId) return;

        const userText = chatInput;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now(), sessionId: currentSessionId }]);
        setChatInput('');
        setIsThinking(true);

        try {
            await db.addMessage(user.id, { role: 'user', text: userText, sessionId: currentSessionId });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: `
                        Du är en senior Pitch Strategist. Du bygger presentationer i "Krunch Keeper"-stil (minimalistisk, beige, svart fet text).
                        Använd Markdown för att strukturera dina svar. Använd ## för rubriker.
                        Grilla användaren för att få fram: Bolagsnamn, Problem (3 punkter), Lösning, Team-medlemmar, Målgrupp, Framtidsplan.
                        Inkludera alltid <SCORE>antal</SCORE> (0-100).
                    `
                },
                history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessage({ message: userText });
            const responseText = result.text || "";

            const scoreMatch = responseText.match(/<SCORE>(\d+)<\/SCORE>/);
            if (scoreMatch) {
                const newScore = parseInt(scoreMatch[1]);
                setContextScore(newScore);
                if (currentPitchId) db.updatePitch(user.id, currentPitchId, { contextScore: newScore });
            }

            setMessages(prev => [...prev, { id: 'ai-' + Date.now(), role: 'ai', text: responseText, timestamp: Date.now(), sessionId: currentSessionId }]);
            await db.addMessage(user.id, { role: 'ai', text: responseText, sessionId: currentSessionId });

        } catch (e) { console.error(e); } finally { setIsThinking(false); }
    };

    const generateFinalDeck = async () => {
        setIsGeneratingDeck(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const contextPrompt = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
            const prompt = `
                KONVERSATION: ${contextPrompt}
                SKAPA EN PITCH DECK SPECIFIKATION I KRUNCH KEEPER-STIL (10 slides).
                Använd dessa typer: cover, problem, solution, timeline, audience, market, future, closing.
                
                FORMAT (JSON enbart):
                {
                    "metadata": { "company_name": "...", "tagline": "...", "team": ["Namn1", "Namn2"] },
                    "slides": [
                        { "slide_number": 1, "type": "cover", "content": { "headline": "...", "subheadline": "...", "team": ["..."] } },
                        { "slide_number": 2, "type": "problem", "content": { "headline": "Problemet", "points": ["P1", "P2", "P3"] } },
                        ...
                    ]
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = JSON.parse(response.text || '{}');
            setGeneratedData(data);
            
            if (currentPitchId) {
                await db.updatePitch(user.id, currentPitchId, { 
                    content: JSON.stringify(data),
                    name: data.metadata?.company_name || 'Pitch Deck'
                });
            }
            setStep('preview');
        } catch (e) { console.error(e); alert("Kunde inte generera presentationen."); } finally { setIsGeneratingDeck(false); }
    };

    const exportToPPT = () => {
        if (!generatedData) return;
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        
        const bgColor = KK_DESIGN.colors.background;
        const textColor = KK_DESIGN.colors.text;
        const brandName = generatedData.metadata.company_name;

        // --- MASTER DEFINITIONS BASED ON KRUNCH KEEPER PDF ---

        // 1. KK_COVER (Page 1)
        pptx.defineSlideMaster({
            title: 'KK_COVER',
            background: { color: bgColor },
            objects: [
                { rect: { x: 0.4, y: 0.4, w: 0.3, h: 0.3, fill: { color: '000000' } } }, 
                { placeholder: { name: 'title', type: 'title', x: 0.5, y: 2.2, w: '90%', h: 1.5, fontSize: 64, bold: true, color: textColor, align: 'center', fontFace: 'Arial Black' } },
                { placeholder: { name: 'tagline', type: 'body', x: 1, y: 3.8, w: '80%', h: 0.5, fontSize: 24, color: textColor, align: 'right' } },
                { placeholder: { name: 'team', type: 'body', x: 0.5, y: 5, w: '50%', h: 0.5, fontSize: 10, bold: true, color: textColor, align: 'left' } }
            ]
        });

        // 2. KK_PROBLEM (Page 2)
        pptx.defineSlideMaster({
            title: 'KK_PROBLEM',
            background: { color: bgColor },
            objects: [
                { line: { x: '50%', y: 0, w: 0, h: '100%', line: { color: '000000', width: 0.5, transparency: 80 } } }, 
                { placeholder: { name: 'points', type: 'body', x: 0.5, y: 1, w: 4, h: 4, fontSize: 18, bold: true, color: textColor, bullet: { type: 'number' } } },
                { placeholder: { name: 'title', type: 'title', x: 5, y: 2, w: 4, h: 1, fontSize: 44, bold: true, color: textColor, align: 'right' } }
            ]
        });

        // 3. KK_CONTENT
        pptx.defineSlideMaster({
            title: 'KK_CONTENT',
            background: { color: bgColor },
            objects: [
                { placeholder: { name: 'title', type: 'title', x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 42, bold: true, color: textColor } },
                { placeholder: { name: 'body', type: 'body', x: 0.5, y: 1.8, w: 9, h: 3.5, fontSize: 20, color: textColor } },
                { text: { text: brandName, options: { x: 8, y: 5.2, w: 1.5, fontSize: 8, bold: true, align: 'right', color: textColor, transparency: 70 } } }
            ]
        });

        generatedData.slides.forEach(slide => {
            let master = 'KK_CONTENT';
            if (slide.type === 'cover') master = 'KK_COVER';
            if (slide.type === 'problem') master = 'KK_PROBLEM';

            const s = pptx.addSlide({ masterName: master });
            
            if (slide.type === 'cover') {
                s.addText(slide.content.headline, { placeholder: 'title' });
                s.addText(slide.content.subheadline || '', { placeholder: 'tagline' });
                s.addText(slide.content.team?.join('   ') || '', { placeholder: 'team' });
            } else if (slide.type === 'problem') {
                s.addText(slide.content.headline, { placeholder: 'title' });
                s.addText(slide.content.points?.join('\n') || '', { placeholder: 'points' });
            } else {
                s.addText(slide.content.headline, { placeholder: 'title' });
                if (slide.content.points) s.addText(slide.content.points.join('\n'), { placeholder: 'body', bullet: true });
            }
        });

        pptx.writeFile({ fileName: `${brandName.replace(/\s+/g, '_')}_Deck.pptx` });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end no-print">
                <div>
                    <h1 className="font-serif-display text-4xl mb-1 text-gray-900 dark:text-white">Pitch Studio</h1>
                    <p className="text-gray-500 text-sm">Designa presentationer baserat på Krunch Keeper-stilen.</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button onClick={() => setStep('history')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${step === 'history' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Mina Decks</button>
                    <button onClick={() => setStep('chat')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${step === 'chat' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Editor</button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {step === 'history' && (
                    <div className="flex-1 animate-fadeIn overflow-y-auto pb-20">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button onClick={handleCreateNewPitch} className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all group min-h-[200px]">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors"><Plus size={24}/></div>
                                <h3 className="font-bold">Skapa ny pitch</h3>
                            </button>
                            {savedPitches.map(pitch => (
                                <div key={pitch.id} onClick={() => handleLoadPitch(pitch)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group border-b-4 border-b-black relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-[#F3F0E8] rounded-xl flex items-center justify-center text-black"><Presentation size={20}/></div>
                                        <button 
                                            onClick={(e) => handleDeletePitch(pitch.id, e)} 
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Radera"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 truncate">{pitch.name}</h3>
                                    <div className="mt-auto flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Clock size={10}/> {new Date(pitch.dateCreated).toLocaleDateString()}</span>
                                        <span className={pitch.content ? 'text-green-500' : 'text-orange-400'}>{pitch.content ? 'Klar' : 'Utkast'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'chat' && (
                    <>
                        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-slideUp">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>{msg.role === 'ai' ? <BrainCircuit size={16} /> : <UserIcon size={16} />}</div>
                                        <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-none'}`}>
                                            {msg.role === 'ai' ? <RichTextResponse text={msg.text} /> : <p>{msg.text}</p>}
                                        </div>
                                    </div>
                                ))}
                                {isThinking && <div className="text-xs text-gray-400 animate-pulse">Arkitekten bygger...</div>}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                <form onSubmit={handleSendMessage} className="relative flex gap-2">
                                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Svara arkitekten..." className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-5 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                    <button type="submit" className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-opacity"><Send size={18} /></button>
                                </form>
                            </div>
                        </div>
                        <div className="w-80 space-y-4">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Gauge size={18} /> Pitch Context</h3>
                                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2"><div className="h-full bg-black dark:bg-white transition-all duration-1000" style={{ width: `${contextScore}%` }}></div></div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase"><span>0%</span><span>{contextScore}%</span><span>Redo</span></div>
                                <button onClick={generateFinalDeck} disabled={contextScore < 25 || isGeneratingDeck} className="w-full mt-10 bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-transform">{isGeneratingDeck ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Generera Deck</>}</button>
                                <p className="text-[10px] text-gray-400 text-center mt-3 italic">Designas i "Krunch Keeper"-stil.</p>
                            </div>
                        </div>
                    </>
                )}

                {step === 'preview' && (
                    <div className="flex-1 flex flex-col animate-slideUp">
                        <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setStep('chat')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{generatedData?.metadata.company_name}</h3>
                                    <p className="text-xs text-gray-500">Mallen: Krunch Keeper Minimalist</p>
                                </div>
                            </div>
                            <button onClick={exportToPPT} className="bg-[#D24726] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 shadow-md"><Download size={16} /> Ladda ned PPTX</button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pb-20 overflow-y-auto">
                            {generatedData?.slides.map(slide => (
                                <SlidePreview key={slide.slide_number} slide={slide} companyName={generatedData.metadata.company_name} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PitchStudio;
