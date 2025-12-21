
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowRight, 
    Sparkles, 
    Maximize2, 
    Minimize2, 
    ZoomIn, 
    ZoomOut, 
    Target, 
    Zap, 
    Users, 
    DollarSign,
    Lightbulb,
    CheckCircle2,
    Lock,
    BarChart3,
    Search,
    Globe,
    Link as LinkIcon,
    History,
    Clock,
    X,
    Plus,
    Gauge
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, Idea } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

interface IdeaLabProps {
    user: User;
    isSidebarOpen?: boolean;
    toggleSidebar?: () => void;
}

// Enhanced Node Structure with World Coordinates
interface MindMapNode {
    id: string;
    title: string;
    content: string; 
    x: number; // World coordinate X
    y: number; // World coordinate Y
    type: 'root' | 'category' | 'idea';
    category?: 'problem' | 'solution' | 'market' | 'revenue';
    parentId?: string;
}

interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

// --- Rich Text Renderer for Beautiful AI Responses ---
const RichTextRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // Remove the META and NODE tags if they exist in the visible text
    let cleanText = text.replace(/<META>.*?<\/META>/s, '');
    cleanText = cleanText.replace(/<NODE>.*?<\/NODE>/gs, '').trim();

    // Split by double newlines to handle paragraphs/blocks
    const blocks = cleanText.split(/\n\n+/);

    return (
        <div className="space-y-4 text-gray-800 dark:text-gray-200">
            {blocks.map((block, index) => {
                // 1. Headers (## Title)
                if (block.startsWith('##')) {
                    return (
                        <h3 key={index} className="font-serif-display text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-2 leading-tight">
                            {block.replace(/^##\s*/, '')}
                        </h3>
                    );
                }
                // 2. Headers (### Title)
                if (block.startsWith('###')) {
                    return (
                        <h4 key={index} className="font-serif-display text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-1">
                            {block.replace(/^###\s*/, '')}
                        </h4>
                    );
                }
                // 3. Bullet Lists (- Item or * Item)
                if (block.match(/^[\-*]\s/m)) {
                    const items = block.split(/\n/).filter(line => line.trim().length > 0);
                    return (
                        <ul key={index} className="space-y-2 my-3 pl-1">
                            {items.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-2 shrink-0 opacity-60"></div>
                                    <span dangerouslySetInnerHTML={{ 
                                        __html: item.replace(/^[\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black dark:text-white">$1</strong>') 
                                    }} />
                                </li>
                            ))}
                        </ul>
                    );
                }
                // 4. Standard Paragraphs with Bold support
                return (
                    <p key={index} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ 
                        __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>') 
                    }} />
                );
            })}
        </div>
    );
};

const IdeaLab: React.FC<IdeaLabProps> = ({ user, isSidebarOpen = true, toggleSidebar }) => {
    const { t } = useLanguage();
    const [mode, setMode] = useState<'input' | 'workspace'>('input');
    const [ideaText, setIdeaText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Workspace State
    const [currentIdeaId, setCurrentIdeaId] = useState<string | null>(null);
    const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [nodes, setNodes] = useState<MindMapNode[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    
    // Search Visualization State
    const [isSearching, setIsSearching] = useState(false);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');
    const [activeSources, setActiveSources] = useState<string[]>([]);
    
    // History
    const [showHistory, setShowHistory] = useState(false);
    const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
    
    // Deep Dive Context State
    const [contextScore, setContextScore] = useState(10); // 0-100
    
    // AI Chat Session
    const [chatSession, setChatSession] = useState<any | null>(null);
    const [analysisPhase, setAnalysisPhase] = useState<string>('Fas 1: Djupintervju');

    // Canvas State
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
    const [isDragging, setIsDragging] = useState<{ type: 'canvas' | 'node', id?: string, startX: number, startY: number, initialCam?: CameraState, initialNode?: {x: number, y: number} } | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef(nodes); 

    // Sync nodes state to ref
    useEffect(() => {
        nodesRef.current = nodes;
        const timer = setTimeout(() => {
            if (currentIdeaId && nodes.length > 0) {
                db.updateIdeaState(user.id, currentIdeaId, { nodes });
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [nodes, currentIdeaId, user.id]);

    useEffect(() => {
        const loadData = async () => {
            const data = await db.getUserData(user.id);
            if (data.ideas) setSavedIdeas(data.ideas);
        };
        loadData();
    }, [user.id, mode]); 

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isSearching]);

    const generateCoreConcept = (text: string): { title: string, tagline: string } => {
        const words = text.split(' ');
        let title = '';
        if (text.length < 30) {
            title = text;
        } else {
            const ignore = ['i', 'want', 'to', 'build', 'a', 'an', 'the', 'for', 'jag', 'vill', 'bygga', 'en', 'ett', 'att'];
            const significant = words.filter(w => !ignore.includes(w.toLowerCase()));
            title = significant.slice(0, 3).join(' ');
            title = title.charAt(0).toUpperCase() + title.slice(1);
        }
        return {
            title: title.length > 25 ? title.substring(0, 25) + '...' : title,
            tagline: text.length > 60 ? text.substring(0, 60) + '...' : text
        };
    };

    const addMessage = (role: 'user' | 'ai', text: string, sources?: {title: string, uri: string}[]) => {
        const newMsg: ChatMessage = {
            id: Date.now().toString() + Math.random(),
            role,
            text,
            timestamp: Date.now(),
            sources,
            sessionId: currentChatSessionId || undefined
        };
        setMessages(prev => [...prev, newMsg]);
    };

    const initializeFullMindMap = () => {
        // Only add if they don't exist yet
        setNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const categoryNodes: MindMapNode[] = [
                { id: 'cat-1', title: 'Problemet', content: 'Vem har ont?', x: -300, y: -200, type: 'category', category: 'problem', parentId: 'root' },
                { id: 'cat-2', title: 'Lösningen', content: 'Produkt & MVP', x: 300, y: -200, type: 'category', category: 'solution', parentId: 'root' },
                { id: 'cat-3', title: 'Marknaden', content: 'Storlek & Konkurrens', x: -300, y: 200, type: 'category', category: 'market', parentId: 'root' },
                { id: 'cat-4', title: 'Affärsmodell', content: 'Intäkter & Sälj', x: 300, y: 200, type: 'category', category: 'revenue', parentId: 'root' }
            ];
            
            const newNodes = categoryNodes.filter(c => !existingIds.has(c.id));
            return [...prev, ...newNodes];
        });
        
        // Adjust camera slightly to show breadth
        setCamera(prev => ({ ...prev, zoom: 0.6 }));
    };

    const getSystemInstruction = (ideaTitle: string) => `
        ROLE: You are Aceverse, a world-class Venture Architect and Co-founder.
        USER: ${user.firstName}.
        IDEA: "${ideaTitle}".

        GOAL: Guide the user through the 8-Phase Validation Framework to build a viable business.
        
        FRAMEWORK PHASES:
        1. Discovery: Define exact Problem & Target Audience.
        2. Market: Calculate TAM/SAM/SOM & Trends.
        3. Competition: Identify Landscape & UVP.
        4. Persona: Detailed User Avatar.
        5. MVP: Core Features (Kill your darlings).
        6. Validation: Proof of willingness to pay.
        7. Roadmap: Tech & Time.
        8. GTM: Go-To-Market Strategy.

        BEHAVIOR:
        - PROACTIVE: Do not just answer. DRIVE the conversation. Always end with a question that moves to the next logical step.
        - CRITICAL BUT KIND: Challenge assumptions. Ask "Why?".
        - STRUCTURED: Use **Bold** for key terms. Use bullet points.
        - MAPPING AGENT: You MUST update the mind map when you establish a fact.

        **CRITICAL INSTRUCTION FOR MIND MAP UPDATES:**
        When you identify a key insight (a specific problem, a feature, a competitor, a revenue stream, or a target segment), you MUST output a hidden XML tag at the end of your response.
        
        Format:
        <NODE>{"title": "Short Title (max 4 words)", "content": "Summary of the insight...", "category": "problem" | "solution" | "market" | "revenue"}</NODE>
        
        Example:
        "...great point about subscription models.
        <NODE>{"title": "Sub-model", "content": "99kr/month recurring revenue", "category": "revenue"}</NODE>"

        You can output multiple <NODE> tags if multiple insights are found.
        
        ALSO: Update the phase tracker using <META> tag:
        <META>{"contextScore": 25, "phase": "Fas 2: Marknad", "isReady": true}</META>
    `;

    const handleLoadIdea = async (idea: Idea) => {
        setCurrentIdeaId(idea.id);
        setMode('workspace');
        setShowHistory(false);
        setIdeaText(idea.title);
        setCurrentChatSessionId(idea.chatSessionId || null);
        
        if (idea.nodes && idea.nodes.length > 0) {
            setNodes(idea.nodes);
        } else {
            const { title, tagline } = generateCoreConcept(idea.title);
            setNodes([{ id: 'root', title, content: tagline, x: 0, y: 0, type: 'root' }]);
            initializeFullMindMap();
        }

        let ideaMessages: ChatMessage[] = [];
        if (idea.chatSessionId) {
            const data = await db.getUserData(user.id);
            ideaMessages = data.chatHistory
                .filter(m => m.sessionId === idea.chatSessionId)
                .sort((a, b) => a.timestamp - b.timestamp);
        }
        setMessages(ideaMessages);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Use sanitized history for the model
        const history = ideaMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { 
                tools: [{googleSearch: {}}],
                systemInstruction: getSystemInstruction(idea.title),
            },
            history: history
        });
        setChatSession(chat);

        if (ideaMessages.length === 0) {
             addMessage('ai', `Välkommen tillbaka till "${idea.title}". Jag har laddat din karta. Vad vill du fokusera på idag? Ska vi titta på marknaden eller putsa på lösningen?`);
        }
    };

    const handleStartSession = async () => {
        if (!ideaText.trim()) return;
        setIsAnalyzing(true);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sessionId = Date.now().toString(); 
            setCurrentChatSessionId(sessionId);
            
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { 
                    tools: [{googleSearch: {}}],
                    systemInstruction: getSystemInstruction(ideaText),
                },
            });

            setChatSession(chat);

            const response = await chat.sendMessage({ 
                message: "Starta Fas 1. Analysera min idé och börja ställa frågor för att förtydliga problemet. Skapa noder för det vi vet hittills." 
            });

            setMode('workspace');
            if (isSidebarOpen && toggleSidebar) toggleSidebar();

            const { title, tagline } = generateCoreConcept(ideaText);
            
            const newIdea = await db.addIdea(user.id, {
                title: title,
                description: ideaText,
                score: 0,
                marketSize: '',
                competition: '',
                chatSessionId: sessionId
            });
            setCurrentIdeaId(newIdea.id);
            setSavedIdeas(prev => [newIdea, ...prev]);

            const initialNodes: MindMapNode[] = [
                { id: 'root', title: title, content: tagline, x: 0, y: 0, type: 'root' }
            ];
            setNodes(initialNodes);
            initializeFullMindMap();
            setCamera({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.4, zoom: 0.8 });

            const text = response.text || "";
            
            // Process the response immediately for nodes
            processAIResponse(text);

            const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
                title: c.web?.title || 'Källa',
                uri: c.web?.uri || '#'
            })) || [];

            addMessage('ai', text, grounding);
            
            await db.addMessage(user.id, {
                role: 'ai',
                text: text,
                sessionId: sessionId
            });

        } catch (error) {
            console.error(error);
            alert("Kunde inte starta sessionen.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chatSession) return;

        const userText = chatInput;
        addMessage('user', userText);
        setChatInput('');
        
        if (currentChatSessionId) {
            await db.addMessage(user.id, { role: 'user', text: userText, sessionId: currentChatSessionId });
        }
        
        setIsTyping(true);
        setIsSearching(true);
        setCurrentSearchQuery('Analyserar begäran...'); 
        setActiveSources([]);

        try {
            const tempAiMsgId = 'temp-' + Date.now();
            setMessages(prev => [...prev, {
                id: tempAiMsgId,
                role: 'ai',
                text: '',
                timestamp: Date.now()
            }]);

            const result = await chatSession.sendMessageStream({ message: userText });
            
            let fullResponseText = '';
            let collectedSources: {title: string, uri: string}[] = [];

            for await (const chunk of result) {
                const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks && groundingChunks.length > 0) {
                    const newSources = groundingChunks
                        .filter((c: any) => c.web?.uri)
                        .map((c: any) => ({
                            title: c.web?.title || new URL(c.web.uri).hostname,
                            uri: c.web?.uri
                        }));
                    
                    if (newSources.length > 0) {
                        collectedSources = [...collectedSources, ...newSources];
                        setCurrentSearchQuery(`Hämtar data från ${newSources[0].title}...`);
                        setActiveSources(prev => {
                            const existing = new Set(prev);
                            newSources.forEach(s => existing.add(s.title));
                            return Array.from(existing);
                        });
                    }
                }

                const chunkText = chunk.text;
                if (chunkText) {
                    if (fullResponseText.length > 20) setIsSearching(false);
                    fullResponseText += chunkText;
                    
                    setMessages(prev => prev.map(msg => 
                        msg.id === tempAiMsgId 
                            ? { ...msg, text: fullResponseText, sources: collectedSources }
                            : msg
                    ));
                }
            }

            if (currentChatSessionId) {
                await db.addMessage(user.id, { role: 'ai', text: fullResponseText, sessionId: currentChatSessionId });
            }

            // Post-process the full response to extract nodes and meta
            processAIResponse(fullResponseText);

        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => prev.map(msg => 
                msg.id.startsWith('temp-') 
                ? { ...msg, text: "Jag stötte på ett problem. Försök igen." } 
                : msg
            ));
        } finally {
            setIsTyping(false);
            setIsSearching(false);
            setCurrentSearchQuery('');
        }
    };

    const processAIResponse = (text: string) => {
        // 1. Extract META Data
        const metaRegex = /<META>(.*?)<\/META>/s;
        const metaMatch = text.match(metaRegex);
        if (metaMatch && metaMatch[1]) {
            try {
                const meta = JSON.parse(metaMatch[1]);
                setContextScore(meta.contextScore || contextScore);
                if (meta.phase) setAnalysisPhase(meta.phase);
                
                if (meta.isReady) {
                    initializeFullMindMap(); // Ensure structure exists
                }
            } catch (e) { console.error("Meta parse error", e); }
        }

        // 2. Extract NODE Data (Mind Map Updates)
        const nodeRegex = /<NODE>(.*?)<\/NODE>/gs;
        let nodeMatch;
        while ((nodeMatch = nodeRegex.exec(text)) !== null) {
            try {
                const nodeData = JSON.parse(nodeMatch[1]);
                addNode(nodeData.title, nodeData.content, nodeData.category);
            } catch(e) {
                console.error("Node parse error", e);
            }
        }
    };

    const addNode = (title: string, content: string, category: 'problem' | 'solution' | 'market' | 'revenue') => {
        // Ensure category parents exist
        initializeFullMindMap(); 

        const targetParentId = category === 'problem' ? 'cat-1' : category === 'solution' ? 'cat-2' : category === 'market' ? 'cat-3' : 'cat-4';
        
        // Wait for state update if nodes aren't populated yet, or find from ref
        let parent = nodesRef.current.find(n => n.id === targetParentId);
        
        // Fallback parent coordinates if not found yet (race condition safety)
        const fallbackCoords = {
            'problem': { x: -300, y: -200 },
            'solution': { x: 300, y: -200 },
            'market': { x: -300, y: 200 },
            'revenue': { x: 300, y: 200 }
        };

        const parentX = parent ? parent.x : fallbackCoords[category].x;
        const parentY = parent ? parent.y : fallbackCoords[category].y;

        // Calculate position to avoid overlap
        const siblings = nodesRef.current.filter(n => n.parentId === targetParentId);
        const count = siblings.length;
        
        // Spiral / Fan out logic
        const baseAngle = category === 'problem' ? Math.PI * 1.25 : 
                          category === 'solution' ? Math.PI * 1.75 : 
                          category === 'market' ? Math.PI * 0.75 : 
                          Math.PI * 0.25;
        
        const spread = 0.5; // Radians spread
        const offset = (Math.random() - 0.5) * spread; 
        const distance = 180 + (count * 20); // Push further out as more nodes are added
        
        const newNode: MindMapNode = {
            id: Date.now().toString() + Math.random(),
            title,
            content,
            x: parentX + Math.cos(baseAngle + offset) * distance,
            y: parentY + Math.sin(baseAngle + offset) * distance,
            type: 'idea',
            parentId: targetParentId,
            category
        };

        // Duplicate check
        if (!nodesRef.current.some(n => n.title === title || n.content === content)) {
            setNodes(prev => [...prev, newNode]);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomSensitivity = 0.001;
        const newZoom = Math.min(Math.max(0.2, camera.zoom - e.deltaY * zoomSensitivity), 3);
        setCamera(prev => ({ ...prev, zoom: newZoom }));
    };

    const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (nodeId) {
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                setIsDragging({ type: 'node', id: nodeId, startX: e.clientX, startY: e.clientY, initialNode: { x: node.x, y: node.y } });
            }
        } else {
            setIsDragging({ type: 'canvas', startX: e.clientX, startY: e.clientY, initialCam: { ...camera } });
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        if (isDragging.type === 'canvas' && isDragging.initialCam) {
            const dx = e.clientX - isDragging.startX;
            const dy = e.clientY - isDragging.startY;
            setCamera({ ...camera, x: isDragging.initialCam.x + dx, y: isDragging.initialCam.y + dy });
        } else if (isDragging.type === 'node' && isDragging.initialNode && isDragging.id) {
            const dx = (e.clientX - isDragging.startX) / camera.zoom;
            const dy = (e.clientY - isDragging.startY) / camera.zoom;
            setNodes(prev => prev.map(n => n.id === isDragging.id ? { ...n, x: isDragging.initialNode!.x + dx, y: isDragging.initialNode!.y + dy } : n));
        }
    };

    const handlePointerUp = () => setIsDragging(null);
    const updateZoom = (delta: number) => setCamera(prev => ({ ...prev, zoom: Math.min(Math.max(0.2, prev.zoom + delta), 3) }));

    // --- Sub-component: MindMap Visualizer ---
    const MindMapVisualizer = () => {
        return (
            <div 
                className={`w-full h-full bg-slate-50 dark:bg-gray-950 relative overflow-hidden select-none transition-colors ${isDragging?.type === 'canvas' ? 'cursor-grabbing' : 'cursor-grab'}`}
                ref={containerRef}
                onWheel={handleWheel}
                onPointerDown={(e) => handlePointerDown(e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <div 
                    className="absolute left-0 top-0 w-full h-full origin-top-left transition-transform duration-75 ease-linear will-change-transform"
                    style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
                >
                    <div 
                        className="absolute -inset-[5000px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    ></div>
                    
                    <svg className="absolute -inset-[5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                         <defs>
                            <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto" markerUnits="strokeWidth">
                                <path d="M0,0 L0,6 L9,3 z" fill="#cbd5e1" />
                            </marker>
                        </defs>
                        {nodes.map(node => {
                            if (!node.parentId) return null;
                            const parent = nodes.find(n => n.id === node.parentId);
                            if (!parent) return null;
                            const off = 5000;
                            return (
                                <path 
                                    key={`line-${node.id}`}
                                    d={`M ${parent.x + off} ${parent.y + off} Q ${parent.x + off} ${node.y + off} ${node.x + off} ${node.y + off}`}
                                    fill="none"
                                    stroke={node.type === 'idea' ? "#94a3b8" : "#cbd5e1"} 
                                    strokeWidth={node.type === 'idea' ? "1.5" : "2"}
                                    strokeDasharray={node.type === 'idea' ? "5,5" : "0"} 
                                    className="transition-all duration-500 opacity-60 dark:stroke-gray-700"
                                />
                            );
                        })}
                    </svg>

                    {nodes.map(node => (
                        <div 
                            key={node.id}
                            onPointerDown={(e) => handlePointerDown(e, node.id)}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-shadow duration-300 cursor-grab active:cursor-grabbing
                                ${node.type === 'root' ? 'z-30' : node.type === 'category' ? 'z-20' : 'z-10'}
                            `}
                            style={{ left: node.x, top: node.y }}
                        >
                            {node.type === 'root' && (
                                <div className="bg-black dark:bg-white text-white dark:text-black p-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-white/50 dark:border-black/50 ring-1 ring-gray-900/10 dark:ring-white/10 w-[280px] text-center group">
                                    <Lightbulb size={32} className="text-yellow-400 fill-yellow-400 mb-2" />
                                    <span className="text-2xl font-serif-display tracking-tight leading-none mb-2">{node.title}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-600 font-medium leading-normal opacity-80">{node.content}</span>
                                </div>
                            )}

                            {node.type === 'category' && (
                                <div className={`
                                    w-48 p-4 rounded-xl shadow-lg border bg-white dark:bg-gray-900 flex flex-col items-center text-center backdrop-blur-sm transition-transform hover:scale-105 group
                                    ${node.category === 'problem' ? 'border-red-100 dark:border-red-900 shadow-red-100/50 dark:shadow-red-900/20' : ''}
                                    ${node.category === 'solution' ? 'border-blue-100 dark:border-blue-900 shadow-blue-100/50 dark:shadow-blue-900/20' : ''}
                                    ${node.category === 'market' ? 'border-purple-100 dark:border-purple-900 shadow-purple-100/50 dark:shadow-purple-900/20' : ''}
                                    ${node.category === 'revenue' ? 'border-emerald-100 dark:border-emerald-900 shadow-emerald-100/50 dark:shadow-emerald-900/20' : ''}
                                `}>
                                    <div className={`p-2 rounded-full mb-2 ${
                                        node.category === 'problem' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        node.category === 'solution' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                        node.category === 'market' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                                        'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                        {node.category === 'problem' && <Target size={20} />}
                                        {node.category === 'solution' && <Zap size={20} />}
                                        {node.category === 'market' && <Users size={20} />}
                                        {node.category === 'revenue' && <DollarSign size={20} />}
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{node.title}</span>
                                </div>
                            )}

                            {node.type === 'idea' && (
                                <div className={`
                                    w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group/card
                                    ${node.category === 'problem' ? 'border-t-4 border-t-red-400 border-gray-100 dark:border-gray-700' : ''}
                                    ${node.category === 'solution' ? 'border-t-4 border-t-blue-400 border-gray-100 dark:border-gray-700' : ''}
                                    ${node.category === 'market' ? 'border-t-4 border-t-purple-400 border-gray-100 dark:border-gray-700' : ''}
                                    ${node.category === 'revenue' ? 'border-t-4 border-t-emerald-400 border-gray-100 dark:border-gray-700' : ''}
                                `}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{node.title}</h4>
                                            {/* Simulate icon based on content if it's auto-generated research */}
                                            {node.title.includes('Market') && <BarChart3 size={16} className="text-gray-400" />}
                                            {node.title.includes('Competitor') && <Search size={16} className="text-gray-400" />}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-h-32 overflow-hidden">
                                            {node.content}
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-50 dark:border-gray-600 flex justify-between items-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-300">{node.category}</span>
                                        <CheckCircle2 size={14} className="text-green-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-6 left-6 flex gap-2 z-50 pointer-events-auto">
                    <button onClick={() => updateZoom(0.1)} className="bg-white dark:bg-gray-900 p-2.5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"><ZoomIn size={18} /></button>
                    <button onClick={() => updateZoom(-0.1)} className="bg-white dark:bg-gray-900 p-2.5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"><ZoomOut size={18} /></button>
                    <div className="bg-white dark:bg-gray-900 px-3 py-2.5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 text-xs font-mono text-gray-400">
                        {Math.round(camera.zoom * 100)}%
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Render ---

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden animate-[fadeIn_0.5s_ease-out_forwards] border-t border-gray-200 dark:border-gray-800 relative bg-white dark:bg-black transition-colors">
            
            {/* History Sidebar Overlay (Slide-in) */}
            <div className={`absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 shadow-2xl ${showHistory ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-gray-900 dark:text-white">Mina Projekt</h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-black dark:hover:text-white"><X size={16} /></button>
                </div>
                <div className="overflow-y-auto h-full p-2 space-y-1">
                    <button 
                        onClick={() => { setMode('input'); setShowHistory(false); }}
                        className="w-full text-left p-3 rounded-lg text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 font-medium mb-4 flex items-center gap-2"
                    >
                        <Plus size={16} /> Ny Idé
                    </button>
                    {savedIdeas.map(idea => (
                        <button 
                            key={idea.id}
                            onClick={() => handleLoadIdea(idea)}
                            className={`w-full text-left p-3 rounded-lg text-sm transition-colors group ${currentIdeaId === idea.id ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-300'}`}
                        >
                            <div className="font-medium truncate">{idea.title}</div>
                            <div className={`text-xs flex items-center gap-1 mt-1 ${currentIdeaId === idea.id ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500'}`}>
                                <Clock size={10} /> {new Date(idea.dateCreated).toLocaleDateString()}
                            </div>
                        </button>
                    ))}
                    {savedIdeas.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-xs italic">Inga sparade idéer än.</div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 h-full w-full relative">
                
                {/* MODE 1: INPUT */}
                {mode === 'input' && (
                    <div className="max-w-4xl mx-auto py-12 px-6 h-full flex flex-col items-center justify-center relative">
                        {/* History Toggle for Input Mode */}
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className="absolute top-6 right-6 p-2 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Historik"
                        >
                            <History size={24} />
                        </button>

                        <div className="text-center mb-12 animate-[slideUp_0.8s_ease-out_forwards] w-full">
                            <h1 className="font-serif-display text-5xl md:text-6xl mb-6 text-gray-900 dark:text-white">{t('dashboard.ideaLabContent.title')}</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                                {t('dashboard.ideaLabContent.desc')}
                            </p>
                        </div>

                        <div className="w-full max-w-3xl bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg animate-[fadeIn_0.8s_ease-out_0.2s_forwards]">
                            <textarea 
                                className="w-full h-40 p-6 bg-gray-50 dark:bg-gray-800 border-none rounded-lg focus:ring-0 text-lg resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
                                placeholder={t('dashboard.ideaLabContent.placeholder')}
                                value={ideaText}
                                onChange={(e) => setIdeaText(e.target.value)}
                                autoFocus
                            ></textarea>
                            
                            <div className="p-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-b-lg border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-xs text-gray-400 font-medium px-4 flex items-center gap-2">
                                    <Globe size={12} /> Live Google Search Enabled
                                    </span>
                                    <button 
                                    onClick={handleStartSession}
                                    disabled={!ideaText || isAnalyzing}
                                    className={`px-8 py-3 text-white dark:text-black font-medium rounded-lg transition-all flex items-center gap-2 shadow-md ${
                                        isAnalyzing ? 'bg-gray-800 dark:bg-gray-200 cursor-wait' : 'bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-200 hover:shadow-lg'
                                    }`}
                                >
                                    {isAnalyzing ? (
                                        <><Sparkles className="animate-spin" size={18} /> {t('dashboard.ideaLabContent.init')}</>
                                    ) : (
                                        <>{t('dashboard.ideaLabContent.start')} <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODE 2: WORKSPACE */}
                {mode === 'workspace' && (
                    <div className="flex h-full w-full">
                        {/* Left Side - Mindmap (60%) */}
                        <div className="w-[60%] h-full relative border-r border-gray-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950">
                            
                            {/* Top Controls */}
                            <div className="absolute top-6 left-6 z-40 flex gap-2">
                                <button 
                                    onClick={() => setMode('input')}
                                    className="bg-white dark:bg-gray-900 p-2.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                    title="Tillbaka till Input"
                                >
                                    <ArrowRight className="rotate-180" size={20} />
                                </button>
                                
                                <button 
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`p-2.5 rounded-lg shadow-md border transition-colors ${showHistory ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-black dark:hover:text-white'}`}
                                    title="Byt Projekt"
                                >
                                    <History size={20} />
                                </button>

                                {toggleSidebar && (
                                    <button 
                                        onClick={toggleSidebar}
                                        className="bg-white dark:bg-gray-900 p-2.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        {isSidebarOpen ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
                                    </button>
                                )}
                            </div>

                            {/* Phase Tracker Overlay */}
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full px-6 py-2 shadow-sm flex items-center gap-4">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.ideaLabContent.currentPhase')}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse"></div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{analysisPhase}</span>
                                </div>
                            </div>
                            <MindMapVisualizer />
                        </div>

                        {/* Right Side - Chat (40%) */}
                        <div className="w-[40%] h-full flex flex-col bg-white dark:bg-gray-900 shadow-xl z-20 border-l border-gray-200 dark:border-gray-800">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
                                <div>
                                    <h3 className="font-serif-display text-lg text-gray-900 dark:text-white">{t('dashboard.ideaLabContent.aiName')}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Lock size={10} /> Active Agent Mode
                                    </p>
                                </div>
                                
                                {/* Context Quality Score */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <Gauge size={14} className={contextScore > 80 ? 'text-green-500' : contextScore > 40 ? 'text-yellow-500' : 'text-red-500'} />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Kontext</span>
                                        <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${contextScore > 80 ? 'bg-green-500' : contextScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                style={{width: `${contextScore}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setMode('input')} className="text-xs font-medium text-gray-400 hover:text-black dark:hover:text-white underline decoration-1 underline-offset-4">
                                    {t('dashboard.ideaLabContent.exit')}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/30">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-60">
                                        <Sparkles size={32} className="mb-2" />
                                        <p className="text-sm">Starta konversationen...</p>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-[slideUp_0.3s_ease-out_forwards]`}>
                                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                                                {msg.role === 'ai' ? <Sparkles size={14} /> : <div className="font-bold text-[10px]">DU</div>}
                                            </div>
                                            <div className={`rounded-2xl px-6 py-4 shadow-sm relative overflow-hidden ${
                                                msg.role === 'user' 
                                                    ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-none text-sm' 
                                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                                            }`}>
                                                {/* Use RichTextRenderer for AI messages */}
                                                {msg.role === 'ai' ? (
                                                    <RichTextRenderer text={msg.text} />
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                )}
                                                
                                                {/* Typewriter Cursor Effect */}
                                                {isTyping && msg.role === 'ai' && msg.id === messages[messages.length - 1].id && (
                                                    <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-1 animate-pulse align-middle"></span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Sources / Citations */}
                                        {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                            <div className="ml-11 flex flex-wrap gap-2 max-w-[85%] animate-[fadeIn_0.5s_ease-out_forwards]">
                                                {msg.sources.slice(0,3).map((source, i) => (
                                                    <a 
                                                        key={i} 
                                                        href={source.uri} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="text-[10px] flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                                                    >
                                                        <LinkIcon size={8} />
                                                        {source.title.length > 20 ? source.title.substring(0, 20) + '...' : source.title}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                {/* Active Thinking/Search Box - Enhanced */}
                                {isSearching && (
                                    <div className="flex gap-3 animate-[slideUp_0.3s_ease-out_forwards] ml-1">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm bg-black dark:bg-white text-white dark:text-black">
                                            <Sparkles size={14} />
                                        </div>
                                        <div className="flex flex-col gap-2 max-w-[85%]">
                                            <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-xl rounded-bl-none p-4 flex items-center gap-4 animate-pulse relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent animate-[shimmer_2s_infinite]"></div>
                                                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-300 shrink-0 border border-blue-100 dark:border-blue-800 z-10">
                                                    <Globe size={16} className="animate-[spin_3s_linear_infinite]" />
                                                </div>
                                                <div className="flex flex-col min-w-0 z-10">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-0.5">
                                                        Live Search
                                                    </span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                                        {currentSearchQuery || "Scanning web..."}
                                                    </span>
                                                </div>
                                            </div>
                                            {activeSources.length > 0 && (
                                                <div className="ml-2 flex gap-2">
                                                    {activeSources.slice(-3).map((src, i) => (
                                                        <span key={i} className="text-[9px] bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md text-gray-500 dark:text-gray-400 animate-fadeIn">
                                                            {src}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={isTyping ? "AI analyserar..." : "Skriv ditt svar..."}
                                        disabled={isTyping}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all shadow-inner disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400 text-gray-900 dark:text-white"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!chatInput.trim() || isTyping}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-gray-700 rounded-md text-gray-900 dark:text-white hover:text-black hover:bg-gray-100 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-gray-100 dark:border-gray-600"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IdeaLab;
