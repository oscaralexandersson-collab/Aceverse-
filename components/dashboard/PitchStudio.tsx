import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Presentation, Download, ArrowLeft, Sparkles, 
    Loader2, Trash2, Zap, ArrowUp, Monitor, LayoutPanelTop,
    ChevronRight, CheckCircle2, Target, BarChart3, PieChart as PieIcon,
    Users, Mail, Globe, MapPin, Phone
} from 'lucide-react';
import { User, Pitch, DeckSpec, ChatMessage, SlideSpec } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { renderPptx } from '../../features/presentations/pptx/renderPptx';
import { SYSTEMPROMPT_DECKSPEC } from '../../features/presentations/ai/prompts';
import DeleteConfirmModal from './DeleteConfirmModal';

interface PitchStudioProps {
    user: User;
}

const SalfordGlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
    <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl overflow-hidden ${className}`}>
        {children}
    </div>
);

const PitchStudio: React.FC<PitchStudioProps> = ({ user }) => {
    const [view, setView] = useState<'history' | 'chat' | 'preview'>('history');
    const [savedPitches, setSavedPitches] = useState<Pitch[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentDeck, setCurrentDeck] = useState<DeckSpec | null>(null);
    const [activePitchId, setActivePitchId] = useState<string | null>(null);
    const [pitchToDelete, setPitchToDelete] = useState<Pitch | null>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadHistory(); }, [user.id]);
    useEffect(() => { if (view === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking, view]);

    const loadHistory = async () => {
        const data = await db.getUserData(user.id);
        setSavedPitches(data.pitches || []);
    };

    const startNewPitch = () => {
        setMessages([{
            id: 'init',
            role: 'ai',
            text: `Välkommen till Salford Pitch Studio. Berätta om din idé så skapar jag en proffsig presentation i vårt moderna "Blue Glass" tema.`,
            timestamp: Date.now(),
            session_id: 'temp-pitch',
            user_id: user.id,
            created_at: new Date().toISOString()
        }]);
        setView('chat');
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isThinking) return;

        const text = chatInput;
        setChatInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: Date.now(), session_id: 'temp-pitch', user_id: user.id, created_at: new Date().toISOString() }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                config: { 
                    systemInstruction: SYSTEMPROMPT_DECKSPEC, 
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingBudget: 16000 }
                },
                contents: messages.concat({ id: 't', role: 'user', text, timestamp: 0, session_id: '', user_id: '', created_at: '' }).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }))
            });

            const rawJson = response.text?.match(/\{[\s\S]*\}/)?.[0] || '{}';
            const deckData: DeckSpec = JSON.parse(rawJson);
            
            if (deckData.slides && deckData.slides.length > 0) {
                const newPitch = await db.addPitch(user.id, {
                    pitch_type: 'deck',
                    name: deckData.deck_title || `Pitch: ${new Date().toLocaleDateString()}`,
                    content: JSON.stringify(deckData),
                    context_score: 100
                });
                setSavedPitches(prev => [newPitch, ...prev]);
                setCurrentDeck(deckData);
                setActivePitchId(newPitch.id);
                setView('preview');
            }
        } catch (error) { 
            console.error(error);
            alert("Ett fel uppstod vid generering. Prova att vara mer specifik."); 
        } finally { 
            setIsThinking(false); 
        }
    };

    const deleteCurrentPitch = () => {
        const pitch = savedPitches.find(p => p.id === activePitchId);
        if (pitch) {
            setPitchToDelete(pitch);
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col animate-fadeIn bg-slate-950 overflow-hidden relative">
            <DeleteConfirmModal isOpen={!!pitchToDelete} onClose={() => setPitchToDelete(null)} onConfirm={async () => {
                if (!pitchToDelete) return;
                const idToDelete = pitchToDelete.id;
                setSavedPitches(prev => prev.filter(p => p.id !== idToDelete));
                await db.deletePitch(user.id, idToDelete);
                setPitchToDelete(null);
                if (activePitchId === idToDelete) {
                    setView('history');
                    setCurrentDeck(null);
                    setActivePitchId(null);
                }
            }} itemName={pitchToDelete?.name || ''} />

            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 blur-[100px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center bg-black/40 backdrop-blur-xl px-8 py-6 border-b border-white/5 z-30 shadow-2xl gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                        <Monitor size={24} />
                    </div>
                    <div>
                        <h1 className="font-serif-display text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Salford Studio</h1>
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-1 italic">Blue Glass Engine v4.0</p>
                    </div>
                </div>
                
                <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-inner">
                    <button 
                        onClick={() => setView('history')} 
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/40 hover:text-white'}`}
                    >
                        Arkiv
                    </button>
                    <button 
                        onClick={startNewPitch} 
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view !== 'history' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/40 hover:text-white'}`}
                    >
                        Ny Pitch
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col z-10">
                {view === 'history' && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 max-w-7xl mx-auto">
                            <div onClick={startNewPitch} className="cursor-pointer">
                                <SalfordGlassCard className="aspect-video flex flex-col items-center justify-center border-dashed border-white/20 group hover:bg-white/20 transition-all shadow-none" >
                                    <Plus size={54} strokeWidth={1} className="text-blue-400 group-hover:rotate-90 transition-transform mb-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">Skapa Ny Pitch</span>
                                </SalfordGlassCard>
                            </div>
                            {savedPitches.map(p => {
                                const data = JSON.parse(p.content);
                                return (
                                    <SalfordGlassCard key={p.id} className="aspect-video p-10 flex flex-col group relative">
                                        <div className="flex justify-between items-start mb-auto cursor-pointer" onClick={() => { setCurrentDeck(data); setActivePitchId(p.id); setView('preview'); }}>
                                            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-all"><LayoutPanelTop size={24}/></div>
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="mt-8 cursor-pointer" onClick={() => { setCurrentDeck(data); setActivePitchId(p.id); setView('preview'); }}>
                                            <h3 className="font-serif-display text-3xl text-white font-black uppercase italic tracking-tighter leading-none mb-6 truncate">{p.name}</h3>
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Salford Blue Edition</span>
                                        </div>
                                        <div className="pt-6 border-t border-white/5 flex justify-end">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPitchToDelete(p); }} 
                                                className="p-3 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Radera presentation"
                                            >
                                                <Trash2 size={20}/>
                                            </button>
                                        </div>
                                    </SalfordGlassCard>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'chat' && (
                    <div className="h-full flex flex-col bg-transparent overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                            <div className="max-w-3xl mx-auto space-y-12">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex gap-8 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[12px] shadow-2xl shrink-0 border ${m.role === 'ai' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                            {m.role === 'ai' ? <Sparkles size={24}/> : 'DU'}
                                        </div>
                                        <SalfordGlassCard className={`p-8 text-sm leading-[1.8] font-medium max-w-[85%] ${m.role === 'user' ? 'bg-white/20 text-white rounded-tr-none font-bold' : 'bg-white/5 text-white/80 rounded-tl-none italic'}`}>
                                            {m.text}
                                        </SalfordGlassCard>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="flex gap-8 animate-pulse">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                        <SalfordGlassCard className="p-8 text-[11px] font-black uppercase tracking-[0.4em] italic text-white/40 flex items-center gap-4">
                                            Salford AI beräknar layout...
                                        </SalfordGlassCard>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                        <div className="p-10 bg-black/20 backdrop-blur-2xl border-t border-white/5">
                            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-6 bg-white/5 p-3 rounded-[3rem] border border-white/10 shadow-2xl focus-within:ring-4 ring-blue-500/20 transition-all">
                                <textarea 
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)} 
                                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} 
                                    placeholder="Beskriv din pitch..." 
                                    className="flex-1 bg-transparent border-none focus:ring-0 py-4 px-8 text-lg font-bold italic text-white placeholder:text-white/20" 
                                    rows={1}
                                />
                                <button type="submit" disabled={!chatInput.trim() || isThinking} className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
                                    <ArrowUp size={32} strokeWidth={3} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'preview' && currentDeck && (
                    <div className="h-full flex flex-col animate-fadeIn bg-slate-950 overflow-hidden">
                        <div className="px-10 py-8 bg-black/40 backdrop-blur-3xl border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 z-30 shadow-2xl">
                            <div className="flex items-center gap-8">
                                <button onClick={() => setView('history')} className="p-5 bg-white/5 hover:bg-blue-600 hover:text-white rounded-2xl text-white/40 transition-all active:scale-90 border border-white/10">
                                    <ArrowLeft size={28}/>
                                </button>
                                <div className="h-12 w-px bg-white/10" />
                                <div>
                                    <h2 className="text-3xl font-serif-display font-black uppercase italic tracking-tighter text-white leading-none">
                                        {currentDeck.deck_title}
                                    </h2>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mt-3 italic flex items-center gap-3">
                                        <Sparkles size={12} /> Salford Blue Glass • Pixel Perfect
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={deleteCurrentPitch}
                                    className="p-5 bg-white/5 hover:bg-red-600 hover:text-white rounded-2xl text-white/40 transition-all active:scale-90 border border-white/10"
                                    title="Radera presentation"
                                >
                                    <Trash2 size={24}/>
                                </button>
                                <button 
                                    onClick={() => { renderPptx(currentDeck!).then(pptx => pptx.writeFile({ fileName: `Salford_Pitch_${Date.now()}.pptx` })); }} 
                                    className="bg-blue-600 text-white px-12 py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.5em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-5"
                                >
                                    EXPORTERA TILL PPTX <Download size={22}/>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-20 space-y-40 custom-scrollbar">
                            <div className="max-w-6xl mx-auto space-y-60 pb-80">
                                {currentDeck.slides.map((slide, idx) => (
                                    <SalfordSlide key={idx} slide={slide} idx={idx} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SalfordSlide: React.FC<{ slide: SlideSpec, idx: number }> = ({ slide, idx }) => {
    // Safety check for slide and layout_id to prevent TypeError
    const id = (slide?.layout_id || '').toUpperCase();

    return (
        <div className="aspect-video w-full rounded-[4rem] bg-gradient-to-br from-blue-700 to-indigo-900 shadow-[0_100px_200px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-1000 border border-white/10 p-16 md:p-24 flex flex-col text-white">
            
            {/* --- LAYOUTS --- */}
            
            {/* 1. TITLE */}
            {id === 'SALFORD_TITLE' && (
                <div className="h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-[12px] font-black uppercase tracking-[1em] text-white/40">SALFORD</span>
                        <div className="text-right">
                            <div className="text-[11px] font-black uppercase tracking-[0.4em] mb-2">{slide.presenter_name}</div>
                            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 italic">{slide.presenter_role}</div>
                        </div>
                    </div>
                    <div className="relative">
                        <h1 className="text-8xl md:text-[11rem] font-serif-display font-black uppercase tracking-tighter leading-[0.8] mb-8 drop-shadow-2xl">
                            {slide.title}
                        </h1>
                        <div className="h-2 w-48 bg-white/20 rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-[12px] font-black uppercase tracking-[0.8em] text-blue-300 italic">{slide.subtitle || 'PITCH DECK'}</span>
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 flex items-center justify-center rotate-12"><Zap size={32} /></div>
                    </div>
                </div>
            )}

            {/* 2. AGENDA */}
            {id === 'SALFORD_AGENDA' && (
                <div className="h-full flex flex-col">
                    <h2 className="text-7xl font-serif-display font-black uppercase tracking-tighter mb-20 italic">Agenda</h2>
                    <div className="grid grid-cols-2 gap-x-20 gap-y-8 flex-1 max-w-4xl">
                        {slide.agenda_items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-8 group">
                                <span className="text-4xl font-serif-display font-black text-blue-400 italic">0{i+1}</span>
                                <div className="text-xl font-black uppercase tracking-widest border-b-2 border-white/10 group-hover:border-blue-400 transition-all pb-2 truncate">{item}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. INTRO */}
            {id === 'SALFORD_INTRO' && (
                <div className="h-full flex flex-col justify-center">
                    <h2 className="text-7xl font-serif-display font-black uppercase tracking-tighter mb-16 max-w-4xl leading-tight">{slide.title}</h2>
                    <div className="grid grid-cols-2 gap-20">
                        <div className="text-xl leading-relaxed text-white/60 font-medium italic">{slide.col_left}</div>
                        <div className="text-xl leading-relaxed text-white/60 font-medium italic">{slide.col_right}</div>
                    </div>
                </div>
            )}

            {/* 4. PROBLEM_3 */}
            {id === 'SALFORD_PROBLEM_3' && (
                <div className="h-full flex flex-col">
                    <h2 className="text-6xl font-serif-display font-black uppercase tracking-tighter mb-16 italic">The Challenge</h2>
                    <div className="grid grid-cols-3 gap-8 flex-1">
                        {slide.problems?.map((p, i) => (
                            <SalfordGlassCard key={i} className="p-10 flex flex-col border-white/5 h-full">
                                <div className="text-blue-400 font-black mb-6">0{i+1}</div>
                                <h3 className="text-2xl font-bold uppercase tracking-tight mb-4 italic leading-none">{p.title}</h3>
                                <p className="text-sm text-white/60 leading-relaxed font-medium">{p.body}</p>
                            </SalfordGlassCard>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. SOLUTIONS_3 */}
            {id === 'SALFORD_SOLUTIONS_3' && (
                <div className="h-full flex flex-col">
                    <h2 className="text-6xl font-serif-display font-black uppercase tracking-tighter mb-16 italic text-blue-400">Our Solution</h2>
                    <div className="grid grid-cols-3 gap-8 flex-1">
                        {slide.solutions?.map((s, i) => (
                            <div key={i} className="flex flex-col">
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-blue-600 mb-8 shadow-2xl">
                                    <Sparkles size={28}/>
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">Solution 0{i+1}</h3>
                                <p className="text-lg text-white/60 font-medium leading-relaxed italic">{s.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 7. MARKET SIZE */}
            {id === 'SALFORD_MARKET_SIZE' && (
                <div className="h-full grid grid-cols-12 gap-20 items-center">
                    <div className="col-span-7">
                        <h2 className="text-7xl font-serif-display font-black uppercase tracking-tighter mb-10 italic">Market Opportunity</h2>
                        <p className="text-2xl leading-relaxed text-white/60 italic">{slide.narrative}</p>
                    </div>
                    <div className="col-span-5 space-y-8">
                        <SalfordGlassCard className="p-12 text-center border-blue-500/20">
                            <div className="text-8xl font-serif-display font-black text-blue-400 mb-2">{slide.kpi_primary_value}</div>
                            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">{slide.kpi_primary_caption}</div>
                        </SalfordGlassCard>
                        <div className="flex gap-8">
                            <SalfordGlassCard className="flex-1 p-8 text-center bg-white/5">
                                <div className="text-4xl font-black text-white mb-1">{slide.kpi_secondary_value}</div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-white/30">{slide.kpi_secondary_caption}</div>
                            </SalfordGlassCard>
                        </div>
                    </div>
                </div>
            )}

            {/* 13. TEAM_4 */}
            {id === 'SALFORD_TEAM_4' && (
                <div className="h-full flex flex-col">
                    <h2 className="text-6xl font-serif-display font-black uppercase tracking-tighter mb-16 italic">Core Team</h2>
                    <div className="grid grid-cols-4 gap-6 flex-1">
                        {slide.team?.map((m, i) => (
                            <div key={i} className="flex flex-col">
                                <div className="aspect-[4/5] bg-white/5 rounded-3xl mb-6 overflow-hidden border border-white/10 relative">
                                    <img src={`https://i.pravatar.cc/300?u=${m.name}`} className="w-full h-full object-cover grayscale opacity-60" />
                                    <div className="absolute inset-0 bg-blue-600/10"></div>
                                </div>
                                <h4 className="text-xl font-black uppercase italic truncate">{m.name}</h4>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3 italic">{m.role}</p>
                                <p className="text-[11px] text-white/40 leading-relaxed font-medium">{m.bio}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 14. THANK YOU */}
            {id === 'SALFORD_THANK_YOU' && (
                <div className="h-full flex flex-col justify-center items-center text-center">
                    <h2 className="text-[12rem] font-serif-display font-black uppercase tracking-tighter leading-none mb-12 drop-shadow-2xl">
                        Thank You
                    </h2>
                    <div className="flex gap-16 items-center">
                        <div className="text-left space-y-4">
                            <div className="flex items-center gap-3 text-white/60"><Mail size={16}/><span className="text-sm font-bold">{slide.email}</span></div>
                            <div className="flex items-center gap-3 text-white/60"><Globe size={16}/><span className="text-sm font-bold">{slide.website}</span></div>
                        </div>
                        <div className="w-px h-16 bg-white/10"></div>
                        <div className="text-left space-y-4">
                            <div className="flex items-center gap-3 text-white/60"><Phone size={16}/><span className="text-sm font-bold">{slide.phone}</span></div>
                            <div className="flex items-center gap-3 text-white/60"><MapPin size={16}/><span className="text-sm font-bold">{slide.address}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Corner ID */}
            <div className="absolute bottom-10 right-10 text-[9px] font-black text-white/10 uppercase tracking-[1em]">{idx + 1} / {id}</div>
        </div>
    );
};

export default PitchStudio;