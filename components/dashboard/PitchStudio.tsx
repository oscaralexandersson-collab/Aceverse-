
import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Presentation, Download, ArrowRight, ArrowLeft, Sparkles, 
    Loader2, CheckCircle2, AlertCircle, Edit3, Trash2, History,
    Layout, Type, Palette, History as HistoryIcon, Layers, Info
} from 'lucide-react';
import { User, Pitch, DeckSpec, SlideSpec, ClarificationQuestion, DeckOutline } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { renderPptx } from '../../features/presentations/pptx/renderPptx';
import { 
    SYSTEMPROMPT_CLARIFICATIONS, 
    SYSTEMPROMPT_OUTLINE, 
    SYSTEMPROMPT_DECKSPEC, 
    SYSTEMPROMPT_QUALITY_PASS 
} from '../../features/presentations/ai/prompts';
import DeleteConfirmModal from './DeleteConfirmModal';

interface PitchStudioProps {
    user: User;
}

type GeneratorStep = 'brief' | 'clarify' | 'outline' | 'generate' | 'preview';

const PitchStudio: React.FC<PitchStudioProps> = ({ user }) => {
    // --- UI STATE ---
    const [view, setView] = useState<'history' | 'generator'>('history');
    const [step, setStep] = useState<GeneratorStep>('brief');
    const [savedPitches, setSavedPitches] = useState<Pitch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    
    // --- DELETE MODAL STATE ---
    const [pitchToDelete, setPitchToDelete] = useState<Pitch | null>(null);

    // --- FORM STATE ---
    const [brief, setBrief] = useState({
        topic: '',
        objective: 'sälja',
        audience: '',
        tone: 'professionell',
        slideCount: 10,
        sources: ''
    });

    const [brandKit, setBrandKit] = useState({
        primary: '#000000',
        background: '#F3F0E8',
        fontHeading: 'Playfair Display',
        fontBody: 'Inter'
    });

    // --- AI GENERATED DATA ---
    const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [outline, setOutline] = useState<DeckOutline | null>(null);
    const [currentDeck, setCurrentDeck] = useState<DeckSpec | null>(null);

    useEffect(() => { loadHistory(); }, [user.id]);

    const loadHistory = async () => {
        const data = await db.getUserData(user.id);
        setSavedPitches(data.pitches || []);
    };

    const handleCreateNew = () => {
        setStep('brief');
        setView('generator');
    };

    const confirmDelete = async () => {
        if (!pitchToDelete) return;
        
        const id = pitchToDelete.id;
        // Optimistic UI Update
        setSavedPitches(prev => prev.filter(p => p.id !== id));
        setPitchToDelete(null);

        try {
            await db.deletePitch(user.id, id);
            await loadHistory(); // Sync check
        } catch (err) {
            console.error(err);
            loadHistory();
        }
    };

    // --- STEP 1 -> 2: CLARIFICATIONS ---
    const generateClarifications = async () => {
        setIsLoading(true);
        setLoadingMsg('Analyserar brief och förbereder frågor...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Brief: ${JSON.stringify(brief)}`,
                config: { 
                    systemInstruction: SYSTEMPROMPT_CLARIFICATIONS,
                    responseMimeType: 'application/json' 
                }
            });
            const data = JSON.parse(response.text || '{}');
            setQuestions(data.questions || []);
            setStep('clarify');
        } catch (e) {
            alert("Kunde inte starta processen. Prova igen.");
        } finally { setIsLoading(false); }
    };

    // --- STEP 2 -> 3: OUTLINE ---
    const generateOutline = async () => {
        setIsLoading(true);
        setLoadingMsg('Skapar presentationens struktur...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const input = `Brief: ${JSON.stringify(brief)}. Svar på frågor: ${JSON.stringify(answers)}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: input,
                config: { 
                    systemInstruction: SYSTEMPROMPT_OUTLINE,
                    responseMimeType: 'application/json' 
                }
            });
            setOutline(JSON.parse(response.text || '{}'));
            setStep('outline');
        } catch (e) { alert("Fel vid generering av outline."); } finally { setIsLoading(false); }
    };

    // --- STEP 3 -> 4: FULL DECK ---
    const generateFullDeck = async () => {
        setIsLoading(true);
        setLoadingMsg('Designar och skriver innehåll för alla slides...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const input = `Outline: ${JSON.stringify(outline)}. Brand Kit: ${JSON.stringify(brandKit)}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: input,
                config: { 
                    systemInstruction: SYSTEMPROMPT_DECKSPEC,
                    responseMimeType: 'application/json' 
                }
            });
            
            let deckData = JSON.parse(response.text || '{}');
            
            deckData.theme = {
                palette: { primary: brandKit.primary, secondary: '#666666', accent: '#D24726', background: brandKit.background },
                fonts: { heading: brandKit.fontHeading, body: brandKit.fontBody }
            };

            setCurrentDeck(deckData);
            setStep('preview');

            // Fix: Changed type to pitch_type
            const newPitch = await db.addPitch(user.id, {
                pitch_type: 'deck',
                name: deckData.deck?.title || 'Okänd Pitch',
                content: JSON.stringify(deckData),
                context_score: 100
            });
            setSavedPitches(prev => [newPitch, ...prev]);

        } catch (e) { alert("Fel vid generering av presentationen."); } finally { setIsLoading(false); }
    };

    const handleExport = async () => {
        if (!currentDeck) return;
        const pptx = await renderPptx(currentDeck);
        pptx.writeFile({ fileName: `${(currentDeck.deck?.title || 'Pitch').replace(/\s/g, '_')}.pptx` });
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-fadeIn bg-white dark:bg-gray-950">
                <div className="w-20 h-20 mb-8 relative">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-black dark:border-white rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white" size={24} />
                </div>
                <h3 className="text-2xl font-serif-display mb-2 text-gray-900 dark:text-white">{loadingMsg}</h3>
                <p className="text-gray-400 text-sm animate-pulse">Detta kan ta upp till en minut för stora presentationer.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full">
            <DeleteConfirmModal 
                isOpen={!!pitchToDelete}
                onClose={() => setPitchToDelete(null)}
                onConfirm={confirmDelete}
                itemName={pitchToDelete?.name || ''}
            />

            <div className="flex justify-between items-end mb-8 no-print px-4">
                <div>
                    <h1 className="font-serif-display text-4xl mb-1 text-gray-900 dark:text-white">Pitch Studio PRO</h1>
                    <p className="text-gray-500 text-sm">Skywork-grade AI presentationsgenerator.</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setView('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'history' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Historik</button>
                    <button onClick={handleCreateNew} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'generator' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Ny Deck</button>
                </div>
            </div>

            {view === 'history' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    <div onClick={handleCreateNew} className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white cursor-pointer transition-all group">
                        <Plus size={32} className="mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Skapa ny presentation</span>
                    </div>
                    {savedPitches.map(p => (
                        <div key={p.id} onClick={() => { setCurrentDeck(JSON.parse(p.content)); setStep('preview'); setView('generator'); }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group border-b-4 border-b-black relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-black dark:text-white"><Presentation size={24}/></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</div>
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 line-clamp-2 pr-8">{p.name}</h3>
                            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-green-500">
                                <CheckCircle2 size={14}/> Redo för export
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPitchToDelete(p);
                                }}
                                className="absolute top-4 right-4 w-10 h-10 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-600 hover:text-white active:scale-90"
                                title="Ta bort"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 pb-20">
                    <div className="flex justify-center gap-2 mb-12">
                        {['brief', 'clarify', 'outline', 'preview'].map((s, idx) => (
                            <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${idx <= ['brief', 'clarify', 'outline', 'preview'].indexOf(step) ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`} />
                        ))}
                    </div>

                    {step === 'brief' && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-slideUp">
                            <div className="space-y-4">
                                <h2 className="text-3xl font-serif-display">Vad vill du bygga idag?</h2>
                                <p className="text-gray-500">Beskriv din idé, ditt företag eller ämnet för presentationen.</p>
                                <textarea 
                                    value={brief.topic}
                                    onChange={e => setBrief({...brief, topic: e.target.value})}
                                    placeholder="t.ex. En pitch för en ny hållbar app som hjälper UF-företag att hitta lokala leverantörer..."
                                    className="w-full h-40 p-6 bg-gray-50 dark:bg-gray-900 border-none rounded-3xl text-lg focus:ring-2 ring-black outline-none resize-none shadow-inner"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Målgrupp</label>
                                    <input value={brief.audience} onChange={e => setBrief({...brief, audience: e.target.value})} placeholder="Investerare, kunder..." className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-1 ring-black outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Slide Antal</label>
                                    <select value={brief.slideCount} onChange={e => setBrief({...brief, slideCount: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-1 ring-black outline-none">
                                        <option value={8}>8 slides (Snabb)</option>
                                        <option value={10}>10 slides (Standard)</option>
                                        <option value={15}>15 slides (Djupgående)</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={generateClarifications} disabled={!brief.topic} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                Nästa steg <ArrowRight size={24}/>
                            </button>
                        </div>
                    )}

                    {step === 'clarify' && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-slideUp">
                            <h2 className="text-3xl font-serif-display">Bara några frågor till...</h2>
                            <div className="space-y-6">
                                {(questions || []).map(q => (
                                    <div key={q.id} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                                        <label className="block font-bold mb-3">{q.question}</label>
                                        {q.type === 'text' ? (
                                            <input className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl outline-none" onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {(q.options || []).map(opt => (
                                                    <button 
                                                        key={opt} 
                                                        onClick={() => setAnswers({...answers, [q.id]: opt})}
                                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${answers[q.id] === opt ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={generateOutline} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xl flex items-center justify-center gap-3">
                                Skapa Outline <ArrowRight size={24}/>
                            </button>
                        </div>
                    )}

                    {step === 'outline' && outline && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-slideUp">
                            <h2 className="text-3xl font-serif-display">Presentationens ryggrad</h2>
                            <div className="space-y-4">
                                {(outline.sections || []).map((section, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 font-bold text-sm uppercase tracking-widest text-gray-400">{section.title}</div>
                                        <div className="p-2 space-y-1">
                                            {(section.slides || []).map((s, sidx) => (
                                                <div key={sidx} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">{(s.type || 'SL').substring(0,2).toUpperCase()}</div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm">{s.title}</div>
                                                        <div className="text-xs text-gray-500">{s.keyMessage}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={generateFullDeck} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xl flex items-center justify-center gap-3 shadow-2xl">
                                <Sparkles size={24}/> Generera Deck
                            </button>
                        </div>
                    )}

                    {step === 'preview' && currentDeck && (
                        <div className="animate-fadeIn">
                            <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50 dark:bg-gray-950 py-4 z-20">
                                <button onClick={() => setView('history')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><ArrowLeft size={18}/></button>
                                <div>
                                    <h2 className="text-2xl font-bold">{currentDeck.deck?.title || 'Pitch Deck'}</h2>
                                    <p className="text-sm text-gray-500">{(currentDeck.slides || []).length} slides • Designad för {currentDeck.deck?.audience || 'målgrupp'}</p>
                                </div>
                                <button onClick={handleExport} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                                    <Download size={20}/> Exportera till PPTX
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
                                {(currentDeck.slides || []).map((slide, idx) => (
                                    <div key={slide.id} className="group relative">
                                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-black opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                                        <div className="aspect-video bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-8 flex flex-col relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-black dark:bg-white"></div>
                                            <div className="flex justify-between mb-4">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Slide {idx+1} • {slide.type}</span>
                                                <button className="text-gray-300 hover:text-black"><Edit3 size={14}/></button>
                                            </div>
                                            <h3 className="text-xl font-bold mb-4 line-clamp-2">{slide.title}</h3>
                                            <div className="flex-1 space-y-2 overflow-hidden">
                                                {(slide.bullets || []).map((b, bidx) => (
                                                    <div key={bidx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-1.5 shrink-0" />
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PitchStudio;
