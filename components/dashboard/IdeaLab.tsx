
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Send, Sparkles, Layout, Database, CheckCircle2, 
    AlertCircle, Search, History, Plus, X, ArrowRight,
    ZoomIn, ZoomOut, Maximize2, Layers, Briefcase, 
    Users, Target, Zap, TrendingUp, Shield, HelpCircle,
    ChevronRight, ChevronDown, ListChecks, FileText, Loader2,
    GripVertical, PanelLeftClose, PanelLeftOpen, Trash2
} from 'lucide-react';
import { User, Idea, ChatMessage, IdeaPhaseId, IdeaNode, IdeaEdge, IdeaCard, IdeaTask, IdeaEvidence } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';

// --- FULL SYSTEM PROMPT ---
const COFOUNDER_SYSTEM_PROMPT = `
YOU ARE: “AI Co-Founder”
MISSION: Help entrepreneurs validate their startup ideas using a 9-phase framework.
BEHAVIOR:
- Ask deep, challenging questions.
- Maintain a highly structured snapshot of the project.
- Use JSON patches to update the UI workspace.
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
    
    // --- DELETE MODAL STATE ---
    const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);

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
        // Ensure we don't display items already removed in this session
        setIdeas(data.ideas || []);
    };

    const handleCreateNew = async () => {
        const newIdeaData: Omit<Idea, 'id' | 'dateCreated' | 'score'> = {
            title: 'Ny Idé',
            description: '',
            currentPhase: '1',
            snapshot: { one_pager: '', problem_statement: '', icp: '', persona_summary: '', solution_hypothesis: '', uvp: '', pricing_hypothesis: '', mvp_definition: '', open_questions: [] },
            nodes: [{ id: 'root', node_type: 'problem', label: 'Din Idé', parent_id: null, details: { text: 'Startpunkt för din resa', status: 'approved' }, x: 0, y: 0 }],
            edges: [],
            cards: [],
            tasks: [],
            evidence: [],
            privacy_mode: true
        };
        const newIdea = await db.addIdea(user.id, newIdeaData);
        setIdeas(prev => [newIdea, ...prev]);
        setActiveIdea(newIdea);
        setView('workspace');
        setMessages([{ id: 'init', role: 'ai', text: "Välkommen till din Workspace. 👋 Jag är din AI Cofounder. Som din medgrundare är mitt jobb att minska risken i ditt projekt genom att ställa svåra frågor. Vad är det för problem du har identifierat som du vill lösa?", timestamp: Date.now() }]);
    };

    const confirmDelete = async () => {
        if (!ideaToDelete) return;
        const id = ideaToDelete.id;
        
        // Step 1: Optimistic UI Update - Remove immediately from local state
        setIdeas(prev => prev.filter(i => i.id !== id));
        if (activeIdea?.id === id) setActiveIdea(null);
        setIdeaToDelete(null);

        try {
            // Step 2: Delete from DB (which now also blacklists the ID in this session)
            await db.deleteIdea(user.id, id);
            // DO NOT call loadIdeas() immediately to avoid race condition with slow cloud sync
            // The db.deleteIdea logic will handle persistent exclusion
        } catch (err) {
            console.error("Delete failed:", err);
            // Revert on failure only
            await loadIdeas(); 
        }
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
                current_phase: activeIdea.currentPhase,
                privacy_mode: activeIdea.privacy_mode,
                project_snapshot: activeIdea.snapshot || {},
                canvas_state: {
                    nodes: (activeIdea.nodes || []).map(n => ({ id: n.id, type: n.node_type, label: n.label, text: n.details?.text, status: n.details?.status })),
                    artifacts_count: activeIdea.cards?.length || 0
                },
                pending_tasks: (activeIdea.tasks || []).filter(t => !t.completed).map(t => t.title)
            };

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { 
                    systemInstruction: COFOUNDER_SYSTEM_PROMPT,
                    temperature: 0.4 
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
        
        if (patch.snapshot_patch) {
            updated.snapshot = { ...(updated.snapshot || {}), ...patch.snapshot_patch };
        }
        
        if (patch.ui?.right_panel?.active_tab) setActiveTab(patch.ui.right_panel.active_tab);
        if (patch.ui?.right_panel?.cards) updated.cards = [...patch.ui.right_panel.cards];
        
        if (patch.canvas_ops) {
            const currentNodes = [...(updated.nodes || [])];
            patch.canvas_ops.forEach((op: any) => {
                if (op.op === 'upsert_node') {
                    const existingIdx = currentNodes.findIndex(n => n.id === op.id);
                    if (existingIdx >= 0) {
                        currentNodes[existingIdx] = { ...currentNodes[existingIdx], ...op };
                    } else {
                        currentNodes.push({ 
                            ...op, 
                            x: (Math.random() * 200 - 100) + (currentNodes.length * 20), 
                            y: (Math.random() * 200 - 100) + (currentNodes.length * 10) 
                        });
                    }
                }
            });
            updated.nodes = currentNodes;
        }

        if (patch.tasks_ops) {
            const currentTasks = [...(updated.tasks || [])];
            patch.tasks_ops.forEach((op: any) => {
                if (op.op === 'create_task') {
                    currentTasks.push({ id: 'task-' + Date.now() + Math.random(), phase_id: op.phase_id, title: op.title, completed: false });
                }
            });
            updated.tasks = currentTasks;
        }

        setActiveIdea(updated);
        db.updateIdeaState(user.id, updated.id, updated);
    };

    if (view === 'list') {
        return (
            <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
                <DeleteConfirmModal 
                    isOpen={!!ideaToDelete}
                    onClose={() => setIdeaToDelete(null)}
                    onConfirm={confirmDelete}
                    itemName={ideaToDelete?.title || ''}
                />

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">Idélabbet</h1>
                        <p className="text-gray-500 dark:text-gray-400">Strukturerad startup-validering med din AI-medgrundare.</p>
                    </div>
                    <button onClick={handleCreateNew} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg">
                        <Plus size={20} /> Starta validering
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ideas.map(idea => (
                        <div key={idea.id} onClick={() => { setActiveIdea(idea); setView('workspace'); }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group border-b-4 border-b-black relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-10 h-10 bg-[#F3F0E8] rounded-xl flex items-center justify-center text-black"><Database size={20}/></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fas {idea.currentPhase}/9</div>
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 line-clamp-1 pr-8">{idea.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-6">{idea.snapshot?.problem_statement || 'Ingen problembeskrivning än.'}</p>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(idea.dateCreated).toLocaleDateString()}</span>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIdeaToDelete(idea);
                                }}
                                className="absolute top-4 right-4 w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-600 hover:text-white active:scale-90"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                    {ideas.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400">
                            <Database size={40} className="mx-auto mb-4 opacity-20" />
                            <p>Inga idéer än. Klicka på knappen ovan för att starta din första validering.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#F3F0E8] dark:bg-black transition-colors overflow-hidden animate-fadeIn" ref={containerRef}>
            {/* Phase Tracker Header */}
            <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => toggleSidebar?.()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                        {isSidebarOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}
                    </button>
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X size={20}/></button>
                    <h2 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{activeIdea?.title}</h2>
                </div>
                <div className="hidden md:flex items-center gap-1">
                    {PHASES.map((p, idx) => (
                        <React.Fragment key={p.id}>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold ${activeIdea?.currentPhase === p.id ? 'bg-black text-white' : idx < PHASES.findIndex(f => f.id === activeIdea?.currentPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                                {idx < PHASES.findIndex(f => f.id === activeIdea?.currentPhase) ? <CheckCircle2 size={12}/> : p.icon}
                                <span className="hidden lg:inline">{p.name}</span>
                            </div>
                            {idx < PHASES.length - 1 && <ChevronRight size={12} className="text-gray-200"/>}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <Shield size={12} className="text-green-500"/> Privacy
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* CHAT PANEL */}
                <div style={{ width: `${chatWidth}%` }} className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl z-20">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {msg.role === 'ai' ? <Sparkles size={16}/> : <Users size={16}/>}
                                </div>
                                <div className={`max-w-[90%] px-5 py-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-none text-gray-800 dark:text-gray-200'}`}>
                                    {msg.text.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex gap-4 items-center animate-pulse">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><Loader2 size={16} className="animate-spin text-gray-400"/></div>
                                <span className="text-xs text-gray-400 font-medium">Analys...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Diskutera med din medgrundare..." className="flex-1 h-11 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 text-sm outline-none focus:ring-1 focus:ring-black" />
                            <button type="submit" disabled={!chatInput.trim() || isThinking} className="w-11 h-11 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow hover:opacity-80 disabled:opacity-50 transition-all">
                                <Send size={18}/>
                            </button>
                        </form>
                    </div>
                </div>

                {/* RESIZE HANDLE */}
                <div onMouseDown={startResizing} className="w-1.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-col-resize z-30 flex items-center justify-center">
                    <div className="h-8 w-0.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* WORKSPACE PANEL */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[#F3F0E8] dark:bg-black/20">
                    <div className="p-3 flex gap-2 overflow-x-auto">
                        {[
                            { id: 'canvas', label: 'Canvas', icon: <Layers size={14}/> },
                            { id: 'cards', label: 'Cards', icon: <FileText size={14}/> },
                            { id: 'tasks', label: 'Tasks', icon: <ListChecks size={14}/> },
                            { id: 'evidence', label: 'Evidence', icon: <Database size={14}/> },
                        ].map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === t.id ? 'bg-black text-white shadow-lg' : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur hover:bg-white text-gray-500'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        {activeTab === 'canvas' && (
                            <div className="h-full relative bg-slate-50 dark:bg-transparent rounded-tl-3xl border-t border-l border-gray-200 dark:border-gray-800 shadow-inner">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center p-20 overflow-visible" style={{ transform: `scale(${canvasZoom})` }}>
                                    {activeIdea?.nodes?.map(node => (
                                        <div key={node.id} className="absolute bg-white dark:bg-gray-900 border-2 border-black rounded-xl p-4 shadow-xl min-w-[180px]" style={{ left: node.x, top: node.y }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-2 h-2 rounded-full ${node.details?.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-[10px] font-bold uppercase text-gray-400">{node.node_type}</span>
                                            </div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{node.label}</h4>
                                            <p className="text-[10px] text-gray-500 mt-2">{node.details?.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute bottom-6 right-6 flex gap-2">
                                    <button onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:bg-gray-50"><ZoomOut size={18}/></button>
                                    <button onClick={() => setCanvasZoom(z => Math.min(2, z + 0.1))} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:bg-gray-50"><ZoomIn size={18}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdeaLab;
