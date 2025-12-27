
import React, { useState, useEffect, useRef } from 'react';
import { Database, Plus, X, Trash2, Edit2, Check, Send, Sparkles, Loader2, PanelLeftClose, PanelLeftOpen, Layers, FileText, ListChecks, Shield } from 'lucide-react';
import { User, Idea, ChatMessage } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';

const SYSTEM_PROMPT = `YOU ARE: “AI Co-Founder”. Mission: Validate startup ideas using JSON patches. ALWAYS return a title_update if idea name is "Ny Idé".`;

const IdeaLab: React.FC<{ user: User, isSidebarOpen?: boolean, toggleSidebar?: () => void }> = ({ user, isSidebarOpen, toggleSidebar }) => {
    const [view, setView] = useState<'list' | 'workspace'>('list');
    const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [activeTab, setActiveTab] = useState<'canvas' | 'brief' | 'tasks'>('canvas');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadIdeas(); }, [user.id, view]);
    useEffect(() => { if (activeIdea?.chat_session_id) loadChat(activeIdea.chat_session_id); }, [activeIdea?.id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const loadIdeas = async () => {
        const data = await db.getUserData(user.id);
        setIdeas(data.ideas || []);
    };

    const loadChat = async (sid: string) => {
        const data = await db.getUserData(user.id);
        // Fix: Changed sessionId to session_id
        const history = data.chatHistory.filter(m => m.session_id === sid).sort((a,b) => a.timestamp - b.timestamp);
        setMessages(history.length > 0 ? history : [{ id: 'init', role: 'ai', text: "Hej! Vad har du för spännande idé idag?", timestamp: Date.now(), session_id: sid, user_id: user.id, created_at: new Date().toISOString() }]);
    };

    const handleCreate = async () => {
        const session = await db.createChatSession(user.id, "Idé-chatt");
        // Fix: Changed chatSessionId to chat_session_id
        const newI = await db.addIdea(user.id, {
            title: 'Ny Idé', chat_session_id: session.id, current_phase: '1',
            snapshot: { 
                problem_statement: '', 
                icp: '', 
                solution_hypothesis: '', 
                uvp: '',
                one_pager: '',
                persona_summary: '',
                pricing_hypothesis: '',
                mvp_definition: '',
                open_questions: []
            },
            nodes: [{ id: 'root', node_type: 'problem', label: 'Din Idé', parent_id: null, details: { text: 'Startpunkt', status: 'approved' } }],
            tasks: []
        });
        setIdeas(prev => [newI, ...prev]); setActiveIdea(newI); setView('workspace');
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isThinking || !activeIdea) return;
        const text = chatInput; const sid = activeIdea.chat_session_id!; setChatInput('');
        // Fix: Changed sessionId to session_id
        const uMsg = await db.addMessage(user.id, { role: 'user', text, session_id: sid });
        setMessages(prev => [...prev, uMsg]); setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: 'application/json' },
                contents: `Context: ${JSON.stringify(activeIdea.snapshot)}\nUser: ${text}`
            });
            const patch = JSON.parse(result.text || '{}');
            let updated = { ...activeIdea };
            if (patch.title_update) updated.title = patch.title_update;
            if (patch.snapshot_patch) updated.snapshot = { ...updated.snapshot, ...patch.snapshot_patch };
            
            // Fix: Changed sessionId to session_id
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: patch.response || "Okej, sparat.", session_id: sid });
            setMessages(prev => [...prev, aiMsg]);
            setActiveIdea(updated);
            await db.updateIdeaState(user.id, updated.id, updated);
        } catch (e) { console.error(e); } finally { setIsThinking(false); }
    };

    const handleDelete = async () => {
        if (!ideaToDelete) return;
        await db.deleteIdea(user.id, ideaToDelete.id);
        if (ideaToDelete.chat_session_id) await db.deleteChatSession(user.id, ideaToDelete.chat_session_id);
        setIdeas(prev => prev.filter(i => i.id !== ideaToDelete.id));
        if (activeIdea?.id === ideaToDelete.id) { setActiveIdea(null); setView('list'); }
        setIdeaToDelete(null);
    };

    if (view === 'list') {
        return (
            <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
                <DeleteConfirmModal isOpen={!!ideaToDelete} onClose={() => setIdeaToDelete(null)} onConfirm={handleDelete} itemName={ideaToDelete?.title || ''} />
                <div className="flex justify-between items-end mb-12">
                    <div><h1 className="font-serif-display text-5xl text-gray-900 dark:text-white uppercase italic leading-none">Idélabbet</h1><p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Validerings-studio</p></div>
                    <button onClick={handleCreate} className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 active:scale-95 shadow-xl"><Plus size={20} /> Ny Idé</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {ideas.map(i => (
                        <div key={i.id} onClick={() => { setActiveIdea(i); setView('workspace'); }} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col min-h-[250px]">
                            <div className="flex justify-between mb-8"><div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center"><Database size={20}/></div><div className="text-[10px] font-black text-gray-300">Fas {i.current_phase}/9</div></div>
                            <h3 className="font-bold text-2xl text-gray-950 dark:text-white mb-auto uppercase italic tracking-tight">{i.title}</h3>
                            <div className="pt-6 border-t flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-black text-gray-300">{new Date(i.created_at).toLocaleDateString()}</span>
                                <button onClick={(e) => { e.stopPropagation(); setIdeaToDelete(i); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    <div onClick={handleCreate} className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-gray-300 hover:text-black dark:hover:text-white cursor-pointer transition-all bg-white/5"><Plus size={48} strokeWidth={1} /><span className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">Starta Ny Process</span></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#F3F0E8] dark:bg-black transition-colors overflow-hidden animate-fadeIn">
            <div className="h-16 bg-white dark:bg-gray-900 border-b flex items-center px-6 justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"><X size={24}/></button>
                    <div className="h-6 w-px bg-gray-100 mx-2" />
                    <h2 className="font-bold text-gray-950 dark:text-white uppercase italic">{activeIdea?.title}</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black text-gray-400 uppercase border border-gray-100 italic"><Shield size={12} className="text-green-500"/> Säkrad Analys</div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="w-[400px] flex flex-col bg-white dark:bg-gray-900 border-r z-20">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.map(m => (
                            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${m.role === 'ai' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}>{m.role === 'ai' ? <Sparkles size={16}/> : 'Du'}</div>
                                <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none font-medium italic'}`}>{m.text}</div>
                            </div>
                        ))}
                        {isThinking && <div className="flex gap-2 items-center animate-pulse"><Loader2 size={12} className="animate-spin"/><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Analyserar...</span></div>}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 border-t">
                        <form onSubmit={handleSend} className="relative flex items-end bg-gray-50 dark:bg-gray-800 rounded-3xl p-1.5 shadow-inner">
                            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Diskutera idén..." className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-gray-900 dark:text-white" rows={1}/>
                            <button type="submit" disabled={!chatInput.trim() || isThinking} className="h-10 w-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center disabled:opacity-20"><Send size={18}/></button>
                        </form>
                    </div>
                </div>
                <div className="flex-1 bg-[#F3F0E8] dark:bg-black/20 p-8">
                    <div className="h-full bg-white dark:bg-gray-900/40 rounded-[3rem] border shadow-inner p-10 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.6em] mb-10 italic">Projektdata</h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            {['problem_statement', 'icp', 'solution_hypothesis', 'uvp'].map(k => (
                                <div key={k} className="p-8 bg-gray-50/50 dark:bg-black/20 rounded-[2rem] border transition-all hover:bg-white">
                                    <span className="text-[9px] font-black text-gray-400 uppercase block mb-3">{k.replace('_',' ')}</span>
                                    <p className="text-sm font-bold italic">{(activeIdea?.snapshot as any)?.[k] || 'Väntar på analys...'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdeaLab;
