
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Send, Sparkles, Layout, Database, CheckCircle2, 
    AlertCircle, Search, History, Plus, X, ArrowRight,
    ZoomIn, ZoomOut, Maximize2, Layers, Briefcase, 
    Users, Target, Zap, TrendingUp, Shield, HelpCircle,
    ChevronRight, ChevronDown, ListChecks, FileText, Loader2,
    GripVertical, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { User, Idea, ChatMessage, IdeaPhaseId, IdeaNode, IdeaEdge, IdeaCard, IdeaTask, IdeaEvidence } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";

// --- SYSTEM PROMPT ---
const COFOUNDER_SYSTEM_PROMPT = `
DU ÄR: “AI Cofounder” i en krypterad produktutvecklingsworkspace.
GUIDA ANVÄNDAREN genom 9 faser: 
1) Identify Problem 2) Problem Scale 3) Problem Impact 4) Current Solutions 
5) Audience & Persona 6) Define Product 7) Verify Demand 8) Business Strategy 9) Build MVP.

VAR SKEPTISK, praktisk och evidensdriven. 
Prioritera att de-risk:a: vad måste vara sant för att detta ska fungera?

OBLIGATORISK OUTPUT:
A) Kort, konkret chatt-svar.
B) En JSON PATCH i ett kodblock enligt schema "COFOUNDER_PATCH".
`;

const PHASES = [
    { id: '1', name: 'Problem', icon: <Target size={14}/> },
    { id: '2', name: 'Scale', icon: <Search size={14}/> },
    { id: '3', name: 'Impact', icon: <AlertCircle size={14}/> },
    { id: '4', name: 'Solutions', icon: <Layers size={14}/> },
    { id: '5', name: 'Persona', icon: <Users size={14}/> },
    { id: '6', name: 'Product', icon: <Zap size={14}/> },
    { id: '7', name: 'Demand', icon: <TrendingUp size={14}/> },
    { id: '8', name: 'Strategy', icon: <Briefcase size={14}/> },
    { id: '9', name: 'MVP', icon: <Layout size={14}/> },
];

const IdeaLab: React.FC<{ user: User, isSidebarOpen?: boolean, toggleSidebar?: () => void }> = ({ user, isSidebarOpen, toggleSidebar }) => {
    // --- UI State ---
    const [view, setView] = useState<'list' | 'workspace'>('list');
    const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [activeTab, setActiveTab] = useState<'canvas' | 'cards' | 'tasks' | 'evidence'>('canvas');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    // --- Resizable States ---
    const [chatWidth, setChatWidth] = useState(35); // Procent
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [canvasZoom, setCanvasZoom] = useState(1);

    // --- Resizing Logic ---
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Begränsningar: Chatten får vara mellan 20% och 60%
        if (newWidth > 20 && newWidth < 60) {
            setChatWidth(newWidth);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'col-resize';
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'default';
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    // --- Load Data ---
    useEffect(() => { loadIdeas(); }, [user.id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const loadIdeas = async () => {
        const data = await db.getUserData(user.id);
        setIdeas(data.ideas || []);
    };

    const handleCreateNew = async () => {
        const newIdea: Idea = {
            id: Date.now().toString(),
            title: 'Ny Idé',
            description: '',
            score: 10,
            currentPhase: '1',
            dateCreated: new Date().toISOString(),
            chatSessionId: 'sess-' + Date.now(),
            snapshot: { one_pager: '', problem_statement: '', icp: '', persona_summary: '', solution_hypothesis: '', uvp: '', pricing_hypothesis: '', mvp_definition: '', open_questions: [] },
            nodes: [{ id: 'root', node_type: 'problem', label: 'Din Idé', parent_id: null, details: { text: 'Startpunkt för din resa', status: 'approved' }, x: 0, y: 0 }],
            edges: [],
            cards: [],
            tasks: [],
            evidence: [],
            privacy_mode: true
        };
        await db.addIdea(user.id, newIdea);
        setIdeas([newIdea, ...ideas]);
        setActiveIdea(newIdea);
        setView('workspace');
        setMessages([{ id: 'init', role: 'ai', text: "Välkommen till din Workspace. 👋 Jag är din AI Cofounder. För att börja: vad är det för problem du har identifierat som du vill lösa?", timestamp: Date.now() }]);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isThinking || !activeIdea) return;

        const text = chatInput;
        setChatInput('');
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const contextPack = {
                project: { phase: activeIdea.currentPhase, privacy: activeIdea.privacy_mode },
                snapshot: activeIdea.snapshot || {},
                artifactsCount: activeIdea.cards?.length || 0,
                canvasNodes: (activeIdea.nodes || []).map(n => ({ id: n.id, label: n.label, type: n.node_type })),
                tasks: (activeIdea.tasks || []).filter(t => !t.completed)
            };

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { 
                    systemInstruction: COFOUNDER_SYSTEM_PROMPT,
                    temperature: 0.7 
                },
                history: (messages || []).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessage({ message: `CONTEXT_PACK: ${JSON.stringify(contextPack)}\n\nUSER_INPUT: ${text}` });
            const responseText = result.text || "";

            const patchMatch = responseText.match(/```json\s*(COFOUNDER_PATCH[\s\S]*?|[\s\S]*?)\s*```/);
            let cleanResponse = responseText.replace(/```json[\s\S]*?```/g, '').trim();
            
            if (patchMatch) {
                try {
                    const patchStr = patchMatch[1].replace('COFOUNDER_PATCH', '').trim();
                    const patch = JSON.parse(patchStr);
                    applyPatch(patch);
                } catch (err) { console.error("Patch parse failed", err); }
            }

            setMessages(prev => [...prev, { id: 'ai-' + Date.now(), role: 'ai', text: cleanResponse, timestamp: Date.now() }]);

        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const applyPatch = (patch: any) => {
        if (!activeIdea) return;
        let updated = { ...activeIdea };
        if (patch.snapshot_patch) updated.snapshot = { ...(updated.snapshot || {}), ...patch.snapshot_patch };
        if (patch.ui?.right_panel?.active_tab) setActiveTab(patch.ui.right_panel.active_tab);
        if (patch.ui?.right_panel?.cards) updated.cards = [...patch.ui.right_panel.cards];
        if (patch.canvas_ops) {
            const currentNodes = [...(updated.nodes || [])];
            patch.canvas_ops.forEach((op: any) => {
                if (op.op === 'upsert_node') {
                    const existingIdx = currentNodes.findIndex(n => n.id === op.id);
                    if (existingIdx >= 0) currentNodes[existingIdx] = { ...currentNodes[existingIdx], ...op };
                    else currentNodes.push({ ...op, x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 });
                }
            });
            updated.nodes = currentNodes;
        }
        if (patch.evidence_add) {
            const currentEvidence = [...(updated.evidence || [])];
            patch.evidence_add.forEach((e: any) => {
                currentEvidence.push({ id: 'ev-' + Date.now() + Math.random(), ...e });
            });
            updated.evidence = currentEvidence;
        }
        setActiveIdea(updated);
        db.updateIdeaState(user.id, updated.id, updated);
    };

    if (view === 'list') {
        return (
            <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">Idélabbet</h1>
                        <p className="text-gray-500 dark:text-gray-400">Dina strukturerade produktresor.</p>
                    </div>
                    <button onClick={handleCreateNew} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg">
                        <Plus size={20} /> Starta ny resa
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ideas.map(idea => (
                        <div key={idea.id} onClick={() => { setActiveIdea(idea); setView('workspace'); }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group border-b-4 border-b-black">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-10 h-10 bg-[#F3F0E8] rounded-xl flex items-center justify-center text-black"><Database size={20}/></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fas {idea.currentPhase}/9</div>
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{idea.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-6">{idea.snapshot?.problem_statement || 'Ingen problembeskrivning än.'}</p>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(idea.dateCreated).toLocaleDateString()}</span>
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white dark:border-gray-900"></div>
                                    <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white dark:border-gray-900"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#F3F0E8] dark:bg-black transition-colors overflow-hidden animate-fadeIn" ref={containerRef}>
            {/* Top Navigation - Phase Tracker */}
            <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => toggleSidebar?.()} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
                        title={isSidebarOpen ? "Dölj meny" : "Visa meny"}
                    >
                        {isSidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"><X size={20}/></button>
                    <h2 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{activeIdea?.title}</h2>
                </div>
                <div className="hidden md:flex items-center gap-1">
                    {PHASES.map((p, idx) => (
                        <React.Fragment key={p.id}>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${activeIdea?.currentPhase === p.id ? 'bg-black text-white' : idx < PHASES.findIndex(f => f.id === activeIdea?.currentPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                                {idx < PHASES.findIndex(f => f.id === activeIdea?.currentPhase) ? <CheckCircle2 size={12}/> : p.icon}
                                <span className="hidden lg:inline">{p.name}</span>
                            </div>
                            {idx < PHASES.length - 1 && <ChevronRight size={12} className="text-gray-200"/>}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <Shield size={12} className="text-green-500"/> Privacy
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* LEFT: CHAT */}
                <div 
                    style={{ width: `${chatWidth}%` }}
                    className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl z-20 transition-[width] duration-0"
                >
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {(messages || []).map(msg => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {msg.role === 'ai' ? <Sparkles size={16}/> : <Users size={16}/>}
                                </div>
                                <div className={`max-w-[90%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-none text-gray-800 dark:text-gray-200'}`}>
                                    {(msg.text || '').split('\n').map((line, i) => <p key={i} className={line.trim() === '' ? 'h-2' : 'mb-2'}>{line}</p>)}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex gap-4 items-center animate-pulse">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><Loader2 size={16} className="animate-spin text-gray-400"/></div>
                                <span className="text-xs text-gray-400 font-medium">Analyse...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                            <input 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Skriv svar..." 
                                className="flex-1 h-11 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 text-sm focus:ring-1 ring-black transition-all outline-none"
                            />
                            <button type="submit" disabled={!chatInput.trim() || isThinking} className="w-11 h-11 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow hover:opacity-80 disabled:opacity-50 transition-all">
                                <Send size={18}/>
                            </button>
                        </form>
                    </div>
                </div>

                {/* RESIZE HANDLE */}
                <div 
                    onMouseDown={startResizing}
                    className={`w-1.5 hover:w-2 hover:bg-black/10 dark:hover:bg-white/10 cursor-col-resize z-30 flex items-center justify-center transition-all ${isResizing ? 'bg-black/20 dark:bg-white/20' : ''}`}
                >
                    <div className="h-8 w-0.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* RIGHT: WORKSPACE */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[#F3F0E8] dark:bg-black/20">
                    <div className="p-3 flex gap-2 no-print overflow-x-auto">
                        {[
                            { id: 'canvas', label: 'Canvas', icon: <Layers size={14}/> },
                            { id: 'cards', label: 'Cards', icon: <FileText size={14}/> },
                            { id: 'tasks', label: 'Tasks', icon: <ListChecks size={14}/> },
                            { id: 'evidence', label: 'Evidence', icon: <Database size={14}/> },
                        ].map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setActiveTab(t.id as any)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${activeTab === t.id ? 'bg-black text-white shadow-lg' : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur hover:bg-white text-gray-500'}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        {activeTab === 'canvas' && (
                            <div className="h-full relative overflow-hidden bg-slate-50 dark:bg-transparent rounded-tl-3xl border-t border-l border-gray-200 dark:border-gray-800 shadow-inner">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center p-20 overflow-visible">
                                    <div className="relative" style={{ transform: `scale(${canvasZoom})` }}>
                                        {(activeIdea?.nodes || []).map(node => (
                                            <div key={node.id} className="absolute bg-white dark:bg-gray-900 border-2 border-black rounded-xl p-4 shadow-xl min-w-[180px] group transition-all hover:scale-105" style={{ left: node.x, top: node.y }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-2 h-2 rounded-full ${node.details?.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{node.node_type}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{node.label}</h4>
                                                <p className="text-[10px] text-gray-500 mt-2 line-clamp-3">{node.details?.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute bottom-6 right-6 flex gap-2">
                                    <button onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors"><ZoomOut size={18}/></button>
                                    <button onClick={() => setCanvasZoom(z => Math.min(2, z + 0.1))} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors"><ZoomIn size={18}/></button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cards' && (
                            <div className="h-full overflow-y-auto p-6 space-y-6">
                                {(activeIdea?.cards || []).length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-40">
                                        <FileText size={48} className="mb-4"/>
                                        <p className="font-bold uppercase tracking-widest text-xs">Inga artefakter än</p>
                                    </div>
                                )}
                                {(activeIdea?.cards || []).map(card => (
                                    <div key={card.card_id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="font-serif-display text-2xl font-bold uppercase tracking-tighter text-black dark:text-white">{card.title}</h3>
                                            <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">Verifierad</div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {(card.sections || []).map((sec, i) => (
                                                <div key={i}>
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{sec.heading}</h4>
                                                    <ul className="space-y-2">
                                                        {(sec.bullets || []).map((b, j) => (
                                                            <li key={j} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-1.5 shrink-0"></div>
                                                                {b}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="h-full overflow-y-auto p-6">
                                <div className="max-w-md mx-auto space-y-4">
                                    <h3 className="font-serif-display text-2xl mb-6 text-gray-900 dark:text-white">Definition of Done</h3>
                                    {(activeIdea?.tasks || []).map(task => (
                                        <div key={task.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:translate-x-1">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200'}`}>
                                                {task.completed && <CheckCircle2 size={14}/>}
                                            </div>
                                            <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'evidence' && (
                            <div className="h-full overflow-y-auto p-6 space-y-4">
                                {(activeIdea?.evidence || []).map(ev => (
                                    <div key={ev.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase text-gray-400">{ev.source_type}</span>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span className="text-[10px] font-bold text-blue-600">Verifierad</span>
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400">Match: {Math.round(ev.confidence * 100)}%</div>
                                        </div>
                                        <p className="text-sm italic text-gray-600 dark:text-gray-400 border-l-4 border-black dark:border-white pl-4 mb-4">"{ev.quote}"</p>
                                        <p className="text-sm text-gray-900 dark:text-white font-medium mb-4">{ev.summary}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(ev.tags || []).map(t => <span key={t} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-[9px] font-bold uppercase text-gray-500">#{t}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdeaLab;
