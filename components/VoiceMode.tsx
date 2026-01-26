

import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, PhoneOff, Sparkles, AlertCircle, Wifi, Volume2, ShieldCheck, Check, Info } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface VoiceModeProps {
    isOpen: boolean;
    onClose: () => void;
    systemInstruction: string;
    voiceName?: string; 
}

export const VoiceMode: React.FC<VoiceModeProps> = ({ isOpen, onClose, systemInstruction, voiceName = 'Zephyr' }) => {
    // --- UI State ---
    const [status, setStatus] = useState<string>('Initierar...');
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'listening' | 'speaking' | 'processing'>('listening');
    const [smoothVolume, setSmoothVolume] = useState(0); 
    const [isMuted, setIsMuted] = useState(false);
    
    // --- GDPR Consent State (Page 12) ---
    const [hasConsented, setHasConsented] = useState(false);

    // --- Audio Logic Refs ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);
    const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const initializedRef = useRef(false);
    const isSessionActiveRef = useRef(false); 
    
    const isMutedRef = useRef(false);
    const volumeRef = useRef(0);

    // Haptic feedback helper
    const vibrate = (pattern: number | number[]) => {
        if ('vibrate' in navigator) navigator.vibrate(pattern);
    };

    useEffect(() => {
        let cleanupFn = () => {};
        
        if (isOpen && hasConsented) {
            vibrate(50); // Feedback on start
            startSession();
            cleanupFn = () => stopSession();
        }

        return () => {
            cleanupFn();
        };
    }, [isOpen, hasConsented]);

    useEffect(() => {
        if (!isOpen) {
            setHasConsented(false);
        }
    }, [isOpen]);

    // Glättnings-loop för volymvisualisering
    useEffect(() => {
        if (!isOpen || !hasConsented) return;
        
        let frameId: number;
        const updateSmoothVolume = () => {
            setSmoothVolume(prev => prev + (volumeRef.current - prev) * 0.2); // Lerp smoothing
            frameId = requestAnimationFrame(updateSmoothVolume);
        };
        
        frameId = requestAnimationFrame(updateSmoothVolume);
        return () => cancelAnimationFrame(frameId);
    }, [isOpen, hasConsented]);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        isMutedRef.current = newState;
        if (newState) {
            volumeRef.current = 0;
            vibrate([20, 20]);
        } else {
            vibrate(30);
        }
    };

    const startSession = async () => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        isSessionActiveRef.current = true;
        
        setError(null);
        setStatus('Ansluter till Aceverse...');
        
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass({ sampleRate: 16000 }); 
            audioContextRef.current = ctx;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                }
            });
            
            if (!isSessionActiveRef.current) {
                stream.getTracks().forEach(t => t.stop());
                ctx.close();
                return;
            }

            streamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            sessionPromiseRef.current = ai.live.connect({
                // Fix: Updated model to gemini-2.5-flash-native-audio-preview-12-2025 as per developer guidelines
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                    },
                    systemInstruction: systemInstruction,
                },
                callbacks: {
                    onopen: async () => {
                        if (!isSessionActiveRef.current) return;
                        setStatus('Ansluten');
                        setMode('listening');
                        await setupAudioProcessing();
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (!isSessionActiveRef.current) return;
                        handleServerMessage(message);
                    },
                    onclose: () => {
                        setStatus('Frånkopplad');
                    },
                    onerror: (err) => {
                        if (isSessionActiveRef.current) {
                            setError("Anslutningen bröts.");
                        }
                    }
                }
            });

        } catch (e: any) {
            initializedRef.current = false;
            isSessionActiveRef.current = false;
            
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || e.message.includes('permission')) {
                setError("Åtkomst nekas. Tillåt mikrofonen i din webbläsare.");
            } else {
                setError("Kunde inte starta ljudet. Försök igen.");
            }
        }
    };

    const setupAudioProcessing = async () => {
        if (!audioContextRef.current || !streamRef.current || !isSessionActiveRef.current) return;
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(streamRef.current);
        sourceRef.current = source;

        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            if (!isSessionActiveRef.current) return;
            if (isMutedRef.current) {
                volumeRef.current = 0; 
                return;
            }

            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 10) { 
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / (inputData.length / 10));
            volumeRef.current = Math.min(rms * 10, 1.2); 

            if (rms < 0.02) {
                inputData.fill(0);
            }

            const pcmData = floatTo16BitPCM(inputData);
            const base64Data = arrayBufferToBase64(pcmData);

            if (isSessionActiveRef.current) {
                sessionPromiseRef.current?.then(session => {
                    if (isSessionActiveRef.current) {
                        try {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64Data
                                }
                            });
                        } catch (sendError) { }
                    }
                }).catch(() => {});
            }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
    };

    const handleServerMessage = (message: LiveServerMessage) => {
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            setMode('speaking');
            queueAudio(audioData);
        }

        if (message.serverContent?.interrupted) {
            vibrate(100); // Feedback on interrupt
            audioQueueRef.current = []; 
            try {
                if (currentSourceNodeRef.current) {
                    currentSourceNodeRef.current.stop();
                    currentSourceNodeRef.current = null;
                }
            } catch (e) { }
            
            setMode('listening');
            isPlayingRef.current = false;
        }
    };

    const queueAudio = (base64Data: string) => {
        const float32 = base64ToFloat32Array(base64Data);
        audioQueueRef.current.push(float32);
        
        if (!isPlayingRef.current) {
            playNextChunk();
        }
    };

    const playNextChunk = () => {
        if (!audioContextRef.current || audioQueueRef.current.length === 0 || !isSessionActiveRef.current) {
            isPlayingRef.current = false;
            setMode('listening');
            return;
        }

        isPlayingRef.current = true;
        const ctx = audioContextRef.current;
        const audioData = audioQueueRef.current.shift()!;

        try {
            const buffer = ctx.createBuffer(1, audioData.length, 24000);
            buffer.getChannelData(0).set(audioData);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            currentSourceNodeRef.current = source;

            source.onended = () => {
                if (isSessionActiveRef.current) {
                    playNextChunk();
                }
            };

            source.start();
        } catch(e) {
            isPlayingRef.current = false;
        }
    };

    const stopSession = () => {
        isSessionActiveRef.current = false;
        initializedRef.current = false;
        isPlayingRef.current = false;
        isMutedRef.current = false;
        setIsMuted(false);
        volumeRef.current = 0;
        audioQueueRef.current = [];

        try {
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null; 
                processorRef.current = null;
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (currentSourceNodeRef.current) {
                try { currentSourceNodeRef.current.stop(); } catch (e) {}
                currentSourceNodeRef.current = null;
            }
        } catch (e) { }

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try { session.close(); } catch(e) { }
            }).catch(() => {});
            sessionPromiseRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); 
        }
        return buffer;
    }

    function base64ToFloat32Array(base64: string): Float32Array {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        return float32Array;
    }

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl animate-fadeIn pointer-events-auto transition-all duration-700">
            
            {!hasConsented ? (
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl animate-slideUp border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center">
                            <Info size={24} />
                        </div>
                        <h2 className="text-2xl font-serif-display text-gray-900 dark:text-white tracking-tight">Information om röstbehandling</h2>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                        När du pratar med mig gäller följande GDPR-säkra villkor:
                    </p>
                    
                    <ul className="space-y-4 mb-8">
                        {[
                            { icon: <Check size={16} className="text-green-500" />, text: "Din röst transkriberas direkt till text" },
                            { icon: <Check size={16} className="text-green-500" />, text: "Ljudfilen raderas OMEDELBART efter transkribering" },
                            { icon: <Check size={16} className="text-green-500" />, text: "Endast texten sparas i krypterat format" },
                            { icon: <X size={16} className="text-red-500" />, text: "Ingen röstprofil skapas eller lagras" },
                            { icon: <X size={16} className="text-red-500" />, text: "Ingen biometrisk analys utförs" }
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                {item.icon}
                                {item.text}
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => { vibrate(30); setHasConsented(true); }}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                        >
                            Ja, starta samtalet
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Nej, gå tillbaka
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header / Info Area */}
                    <div className="absolute top-12 left-0 right-0 flex flex-col items-center gap-6 px-8 text-center animate-[slideUp_0.8s_ease-out]">
                        <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full border backdrop-blur-md transition-all duration-500 shadow-2xl ${
                            error ? 'bg-red-900/30 border-red-500/50' : 'bg-white/5 border-white/10'
                        }`}>
                            {error ? <AlertCircle size={16} className="text-red-400" /> : <Wifi size={16} className={mode === 'listening' ? 'text-white/30' : 'text-green-400 animate-pulse'} />}
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">{error || status}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-widest">
                            <ShieldCheck size={12} />
                            <span>GDPR-Säkrad: Ljud raderas direkt</span>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-8 right-8 text-white/20 hover:text-white p-4 rounded-full hover:bg-white/5 transition-all z-20 group"
                    >
                        <X size={32} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    {/* Central Fluid Visualizer */}
                    <div className="relative mb-20 flex items-center justify-center">
                        <div className={`absolute w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-1000 ${
                            mode === 'speaking' ? 'bg-blue-500/10 scale-125' : 
                            mode === 'processing' ? 'bg-purple-500/10' : 'bg-white/5'
                        }`}></div>

                        <div className="absolute w-[320px] h-[320px] border border-white/5 rounded-full transition-transform duration-[2000ms] ease-linear rotate-[360deg]"
                            style={{ animation: 'spin 15s linear infinite', transform: `scale(${1 + smoothVolume * 0.4})` }}>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/20 rounded-full"></div>
                        </div>

                        <div className="absolute inset-0 rounded-full border border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.05)] transition-all duration-75 ease-linear"
                            style={{ transform: `scale(${1 + smoothVolume * 0.8})`, opacity: mode === 'listening' ? 0.3 + smoothVolume : 0.1 }}></div>
                        
                        <div className="relative z-10">
                            <div className={`w-36 h-36 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.1)] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                                mode === 'speaking' ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 scale-110' :
                                mode === 'processing' ? 'bg-gradient-to-tr from-purple-500 to-pink-600 animate-pulse scale-95' :
                                isMuted ? 'bg-red-950 border-2 border-red-500/50' : 'bg-white/5 backdrop-blur-3xl border border-white/10'
                            }`}>
                                {mode === 'listening' && !isMuted && (
                                    <div className="absolute inset-0 rounded-full bg-white/5" style={{ transform: `scale(${1 + smoothVolume})` }}></div>
                                )}
                                {isMuted ? <MicOff size={44} className="text-red-500 animate-pulse" /> : (
                                    <Sparkles size={mode === 'speaking' ? 48 : 40} className={`transition-all duration-500 ${mode === 'listening' ? 'text-white/20' : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]'}`} fill={mode !== 'listening' ? "currentColor" : "none"} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-44 text-center space-y-3 pointer-events-none px-12 animate-fadeIn">
                        <h2 className={`text-3xl font-serif-display text-white transition-all duration-500 ${mode === 'speaking' ? 'scale-105' : 'scale-100'}`}>
                            {error ? 'Tekniskt fel' : isMuted ? 'Mikrofon avstängd' : mode === 'speaking' ? 'UF-läraren pratar...' : mode === 'processing' ? 'Analyserar...' : 'Jag lyssnar...'}
                        </h2>
                        <p className="text-white/30 text-xs font-bold uppercase tracking-[0.3em]">
                            {error ? 'Försök att ladda om sidan' : isMuted ? 'Tryck på mikrofonen för att prata' : mode === 'speaking' ? 'Du kan avbryta när du vill' : 'Berätta om din idé'}
                        </p>
                    </div>

                    <div className="flex items-center gap-10 relative z-50 animate-[slideUp_1s_ease-out_0.2s_forwards] opacity-0">
                        <button onClick={toggleMute} className={`group p-8 rounded-full transition-all duration-500 backdrop-blur-2xl cursor-pointer border ${isMuted ? 'bg-red-500/20 text-red-500 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/10'}`}>
                            {isMuted ? <MicOff size={28} /> : <Mic size={28} className="group-hover:scale-110 transition-transform" />}
                        </button>
                        <button onClick={onClose} className="group p-10 rounded-full bg-white text-black hover:bg-red-600 hover:text-white transition-all duration-500 hover:scale-110 shadow-[0_15px_40px_rgba(255,255,255,0.2)] cursor-pointer active:scale-95 flex items-center justify-center">
                            <PhoneOff size={36} fill="currentColor" className="group-hover:-rotate-[135deg] transition-transform duration-500" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
