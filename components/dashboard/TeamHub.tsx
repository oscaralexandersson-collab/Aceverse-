
import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, Video, Phone, PhoneOff, Hash, Plus, Trash2, Edit2, Check, 
    Search, Bell, Info, Loader2, X, MoreVertical, AtSign
} from 'lucide-react';
import { User, TeamMessage, Channel, WorkspaceMember } from '../../types';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface TeamHubProps {
    user: User;
}

const TeamHub: React.FC<TeamHubProps> = ({ user }) => {
    const { activeWorkspace, members } = useWorkspace();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    
    // Notifications
    const [unreadCount, setUnreadCount] = useState(0);
    
    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [isCallActive, setIsCallActive] = useState(false);
    const [jitsiApi, setJitsiApi] = useState<any>(null);

    // Channel Actions
    const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
    const [editChannelName, setEditChannelName] = useState('');
    const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

    // Mentions
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [filteredMembers, setFilteredMembers] = useState<WorkspaceMember[]>([]);
    const [mentionIndex, setMentionIndex] = useState(0);

    // --- 1. LOAD CHANNELS ---
    useEffect(() => {
        if (!activeWorkspace) return;
        const loadChannels = async () => {
            const chs = await db.getChannels(activeWorkspace.id);
            setChannels(chs);
            if (chs.length > 0) {
                if (!activeChannel || !chs.find(c => c.id === activeChannel.id)) {
                    setActiveChannel(chs[0]);
                }
            } else {
                setActiveChannel(null);
            }
        };
        loadChannels();
    }, [activeWorkspace?.id]);

    // --- 2. GLOBAL NOTIFICATION LISTENER ---
    useEffect(() => {
        if (!activeWorkspace) return;

        const globalChannel = supabase
            .channel(`workspace-global-${activeWorkspace.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'team_messages', 
                filter: `workspace_id=eq.${activeWorkspace.id}` 
            }, (payload) => {
                const newMsg = payload.new as TeamMessage;
                // Only notify if it's NOT my message and I'm either not in this channel OR the window isn't focused
                if (newMsg.user_id !== user.id) {
                    if (!activeChannel || newMsg.channel_id !== activeChannel.id) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(globalChannel); };
    }, [activeWorkspace?.id, user.id, activeChannel?.id]);

    // --- 3. ACTIVE CHANNEL MESSAGES & REAL-TIME SYNC ---
    useEffect(() => {
        if (!activeWorkspace || !activeChannel) return;
        
        const loadMessages = async () => {
            const msgs = await db.getTeamMessages(activeWorkspace.id, activeChannel.id);
            setMessages(msgs);
            scrollToBottom();
            setUnreadCount(0);
        };
        loadMessages();

        const chatChannel = supabase
            .channel(`chat-${activeChannel.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'team_messages', 
                filter: `channel_id=eq.${activeChannel.id}` 
            }, async (payload) => {
                const newMsg = payload.new as TeamMessage;
                
                // --- CRITICAL: HYDRATE USER DATA IMMEDIATELY ---
                let senderUser = members.find(m => m.user_id === newMsg.user_id)?.user;
                
                // Fallback if member isn't in context yet (rare but possible)
                if (!senderUser) {
                    const { data } = await supabase.from('profiles').select('*').eq('id', newMsg.user_id).single();
                    if (data) {
                        senderUser = {
                            id: data.id, 
                            firstName: data.first_name, 
                            lastName: data.last_name, 
                            email: data.email, 
                            avatar: data.avatar,
                            plan: 'free', onboardingCompleted: true, createdAt: '' 
                        };
                    }
                }

                const hydratedMsg = { ...newMsg, user: senderUser };

                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, hydratedMsg];
                });
                scrollToBottom();
            })
            .subscribe();

        return () => { supabase.removeChannel(chatChannel); };
    }, [activeChannel?.id, activeWorkspace?.id]);

    // --- 4. PRESENCE ---
    useEffect(() => {
        if (!activeWorkspace) return;
        const presence = supabase.channel(`presence-${activeWorkspace.id}`)
            .on('presence', { event: 'sync' }, () => {
                const state = presence.presenceState();
                setOnlineUsers(Object.values(state).flat().map((u: any) => u.user_id));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') await presence.track({ user_id: user.id, online_at: new Date().toISOString() });
            });
        return () => { supabase.removeChannel(presence); };
    }, [activeWorkspace?.id]);

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // --- INPUT HANDLING & MENTIONS ---
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Mention Detection
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        
        // If @ exists and no space between @ and cursor
        if (lastAt !== -1 && !textBeforeCursor.slice(lastAt + 1).includes(' ')) {
            const query = textBeforeCursor.slice(lastAt + 1);
            setMentionQuery(query);
            
            const matches = members.filter(m => {
                if (!m.user) return false;
                const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
                return fullName.includes(query.toLowerCase());
            });
            setFilteredMembers(matches);
            setMentionIndex(0);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (member: WorkspaceMember) => {
        if (mentionQuery === null || !member.user) return;
        
        const cursorPos = inputRef.current?.selectionStart || input.length;
        const textBefore = input.slice(0, cursorPos);
        const textAfter = input.slice(cursorPos);
        const lastAt = textBefore.lastIndexOf('@');
        
        const prefix = input.slice(0, lastAt);
        // Use first name for mention display
        const mentionName = member.user.firstName; 
        
        const newValue = `${prefix}@${mentionName} ${textAfter}`;
        setInput(newValue);
        setMentionQuery(null);
        
        // Restore focus and move cursor
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                // inputRef.current.setSelectionRange(prefix.length + mentionName.length + 2, prefix.length + mentionName.length + 2);
            }
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionQuery !== null && filteredMembers.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev > 0 ? prev - 1 : filteredMembers.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev < filteredMembers.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMembers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeWorkspace || !activeChannel) return;
        
        const text = input;
        setInput('');
        setIsSending(true);
        setMentionQuery(null);

        // Optimistic UI update
        const optimisticId = 'temp-' + Date.now();
        const optimistic: TeamMessage = {
            id: optimisticId,
            content: text,
            user_id: user.id,
            workspace_id: activeWorkspace.id,
            channel_id: activeChannel.id,
            created_at: new Date().toISOString(),
            user: user
        };
        
        setMessages(prev => [...prev, optimistic]);
        scrollToBottom();

        try {
            await db.sendTeamMessage(activeWorkspace.id, user.id, text, members, activeChannel.id);
        } catch (err: any) {
            console.error("Send failed", err);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            setInput(text);
            alert(`Kunde inte skicka: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    // ... (Existing handleCreateChannel, handleStartEdit, handleSaveRename, confirmDeleteChannel, executeDeleteChannel logic)
    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim() || !activeWorkspace) return;
        try {
            const ch = await db.createChannel(activeWorkspace.id, newChannelName);
            if (ch) {
                setChannels([...channels, ch]);
                setActiveChannel(ch);
                setNewChannelName('');
                setShowCreateChannel(false);
            }
        } catch (e) { alert("Kunde inte skapa kanal."); }
    };

    const handleStartEdit = (e: React.MouseEvent, channel: Channel) => {
        e.stopPropagation();
        setEditingChannelId(channel.id);
        setEditChannelName(channel.name);
    };

    const handleSaveRename = async () => {
        if (!editingChannelId || !editChannelName.trim()) { setEditingChannelId(null); return; }
        try {
            await db.renameChannel(editingChannelId, editChannelName);
            setChannels(prev => prev.map(c => c.id === editingChannelId ? { ...c, name: editChannelName } : c));
            if (activeChannel?.id === editingChannelId) { setActiveChannel(prev => prev ? { ...prev, name: editChannelName } : null); }
        } catch (e) { console.error(e); alert("Kunde inte byta namn"); } finally { setEditingChannelId(null); }
    };

    const confirmDeleteChannel = (e: React.MouseEvent, channel: Channel) => { e.stopPropagation(); setChannelToDelete(channel); };

    const executeDeleteChannel = async () => {
        if (!channelToDelete) return;
        try {
            await db.deleteChannel(channelToDelete.id);
            const remaining = channels.filter(c => c.id !== channelToDelete.id);
            setChannels(remaining);
            if (activeChannel?.id === channelToDelete.id) { const defaultChannel = remaining.find(c => c.name === 'allmänt') || remaining[0]; setActiveChannel(defaultChannel || null); }
        } catch(e) { console.error(e); alert("Fel vid radering av kanal."); } finally { setChannelToDelete(null); }
    };

    // --- JITSI VIDEO CALL ---
    useEffect(() => {
        if (!isCallActive || !activeWorkspace) return;
        const domain = "meet.jit.si";
        const room = `Aceverse-${activeWorkspace.id}`;

        const initJitsi = (d: string, r: string) => {
            // @ts-ignore
            const api = new window.JitsiMeetExternalAPI(d, {
                roomName: r,
                parentNode: document.getElementById('jitsi-container'),
                width: '100%', height: '100%',
                userInfo: { displayName: user.firstName },
                configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true }
            });
            api.addEventListeners({ videoConferenceLeft: () => { setIsCallActive(false); setJitsiApi(null); api.dispose(); } });
            setJitsiApi(api);
        };

        // @ts-ignore
        if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement("script");
            script.src = "https://meet.jit.si/external_api.js";
            script.async = true;
            script.onload = () => initJitsi(domain, room);
            document.body.appendChild(script);
        } else initJitsi(domain, room);

    }, [isCallActive]);

    const renderDateSeparator = (date: Date) => (
        <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
        </div>
    );

    if (!activeWorkspace) return null;

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-950 overflow-hidden relative">
            
            <DeleteConfirmModal 
                isOpen={!!channelToDelete} 
                onClose={() => setChannelToDelete(null)} 
                onConfirm={executeDeleteChannel} 
                itemName={channelToDelete ? `#${channelToDelete.name}` : ''} 
            />

            {/* --- SIDEBAR --- */}
            <div className={`w-64 bg-gray-50/50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? '' : '-ml-64'}`}>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="font-serif-display font-bold text-lg text-gray-900 dark:text-white truncate">{activeWorkspace.name}</h2>
                        <div className="relative">
                            <Bell size={16} className="text-gray-400" />
                            {unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* CHANNELS */}
                        <div>
                            <div className="flex items-center justify-between px-2 mb-2 group">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kanaler</span>
                                <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="text-gray-400 hover:text-black dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={12} /></button>
                            </div>
                            
                            {showCreateChannel && (
                                <form onSubmit={handleCreateChannel} className="mb-2 px-2">
                                    <input autoFocus value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="kanal-namn..." className="w-full bg-white dark:bg-gray-800 text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 outline-none mb-1"/>
                                </form>
                            )}

                            <div className="space-y-0.5">
                                {channels.map(ch => (
                                    <div key={ch.id} className="relative group">
                                        {editingChannelId === ch.id ? (
                                            <div className="flex items-center gap-1 px-2 py-1">
                                                <input 
                                                    autoFocus 
                                                    value={editChannelName} 
                                                    onChange={e => setEditChannelName(e.target.value)} 
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveRename();
                                                        if (e.key === 'Escape') setEditingChannelId(null);
                                                    }}
                                                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs outline-none focus:border-black dark:focus:border-white"
                                                />
                                                <button onClick={handleSaveRename} className="text-green-500 hover:text-green-600 p-1"><Check size={12} /></button>
                                                <button onClick={() => setEditingChannelId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => setActiveChannel(ch)}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${activeChannel?.id === ch.id ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                >
                                                    <Hash size={14} className={activeChannel?.id === ch.id ? 'opacity-70' : 'text-gray-400'} />
                                                    <span className="truncate">{ch.name}</span>
                                                </button>
                                                
                                                {/* Actions Overlay */}
                                                {ch.name !== 'allmänt' && (
                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5 shadow-sm transition-opacity">
                                                        <button 
                                                            onClick={(e) => handleStartEdit(e, ch)} 
                                                            className="p-1 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                            title="Byt namn"
                                                        >
                                                            <Edit2 size={12}/>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => confirmDeleteChannel(e, ch)} 
                                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                                            title="Radera kanal"
                                                        >
                                                            <Trash2 size={12}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* MEMBERS */}
                        <div>
                            <div className="px-2 mb-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team ({members.length})</span></div>
                            <div className="space-y-1">
                                {members.map(m => {
                                    const isOnline = onlineUsers.includes(m.user_id);
                                    const displayName = m.user?.firstName 
                                        ? `${m.user.firstName} ${m.user.lastName || ''}` 
                                        : 'Anonym';
                                        
                                    return (
                                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-default">
                                            <div className="relative">
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-600">
                                                    {m.user?.firstName?.[0] || '?'}
                                                </div>
                                                {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>}
                                            </div>
                                            <span className={`text-xs truncate ${isOnline ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                                                {displayName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CHAT AREA --- */}
            <div className="flex-1 flex flex-col relative bg-white dark:bg-black">
                {/* Header */}
                <div className="h-16 px-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Hash size={20} className="text-gray-400"/>
                            <h3 className="font-bold text-lg">{activeChannel?.name || 'Välj kanal'}</h3>
                        </div>
                        {activeChannel?.name === 'allmänt' && <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Default</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsCallActive(!isCallActive)} className={`p-2 rounded-full transition-all ${isCallActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}>
                            {isCallActive ? <PhoneOff size={18} /> : <Video size={20} />}
                        </button>
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><Search size={20}/></button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><Info size={20}/></button>
                    </div>
                </div>

                {/* Call Embed */}
                <div className={`transition-all duration-300 ease-in-out bg-black ${isCallActive ? 'h-64' : 'h-0 overflow-hidden'}`}>
                    <div id="jitsi-container" className="w-full h-full"></div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar relative">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 pb-20">
                            <Hash size={64} strokeWidth={1} className="mb-4 opacity-50"/>
                            <p className="text-lg font-bold">Välkommen till #{activeChannel?.name}!</p>
                            <p className="text-sm">Detta är början på konversationen.</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMe = msg.user_id === user.id;
                            const prevMsg = messages[i-1];
                            const isNewDay = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                            const isSequence = prevMsg && prevMsg.user_id === msg.user_id && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 120000);

                            // Detect mentions for highlighting
                            const hasMention = msg.content.includes(`@${user.firstName}`);

                            return (
                                <div key={msg.id} className={hasMention ? "bg-yellow-50 dark:bg-yellow-900/20 -mx-4 px-4 py-2 rounded-lg transition-colors" : ""}>
                                    {isNewDay && renderDateSeparator(new Date(msg.created_at))}
                                    
                                    <div className={`flex gap-3 group ${isSequence ? 'mt-0.5' : 'mt-4'} ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-9 flex-shrink-0 flex flex-col justify-end">
                                            {!isSequence && !isMe && (
                                                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm">
                                                    {msg.user?.firstName?.[0] || '?'}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {!isSequence && !isMe && (
                                                <div className="flex items-center gap-2 mb-1 ml-1">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{msg.user?.firstName || 'Anonym'}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            )}

                                            <div className={`px-4 py-2 text-sm leading-relaxed shadow-sm break-words relative group-hover:shadow-md transition-shadow ${
                                                isMe 
                                                ? `bg-black text-white dark:bg-white dark:text-black rounded-2xl rounded-tr-sm` 
                                                : `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm`
                                            }`}>
                                                {msg.content}
                                            </div>
                                            
                                            {isMe && !isSequence && (
                                                <span className="text-[9px] text-gray-300 dark:text-gray-600 mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                                    {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Mention Popup */}
                {mentionQuery !== null && filteredMembers.length > 0 && (
                    <div className="absolute bottom-24 left-6 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 w-64 overflow-hidden animate-slideUp">
                        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Medlemmar</div>
                        <div className="max-h-48 overflow-y-auto">
                            {filteredMembers.map((m, idx) => (
                                <button 
                                    key={m.id}
                                    onClick={() => insertMention(m)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${idx === mentionIndex ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                >
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        {m.user?.firstName?.[0] || '?'}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {m.user?.firstName} {m.user?.lastName}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-black">
                    <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
                        <div className="relative flex items-end gap-2 p-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl focus-within:border-black dark:focus-within:border-white focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white transition-all shadow-sm">
                            <button type="button" className="p-2.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"><Plus size={20} /></button>
                            <textarea 
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={`Skriv till #${activeChannel?.name || 'kanal'}...`}
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 font-medium leading-relaxed"
                                rows={1}
                            />
                            <div className="flex items-center gap-1 pb-0.5 pr-0.5">
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isSending}
                                    className={`p-2.5 rounded-full transition-all ${input.trim() ? 'bg-black dark:bg-white text-white dark:text-black shadow-md hover:scale-105 active:scale-95' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
                                >
                                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "ml-0.5" : ""} />}
                                </button>
                            </div>
                        </div>
                        <div className="text-center mt-2 flex justify-center gap-4 text-[10px] text-gray-400">
                            <span><strong>Shift + Enter</strong> för ny rad</span>
                            <span><strong>@</strong> för att tagga</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TeamHub;
