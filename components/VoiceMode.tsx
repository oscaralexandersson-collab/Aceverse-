
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, PhoneOff, Sparkles, AlertCircle, Wifi, Volume2, ShieldCheck } from 'lucide-react';
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
    const [volume, setVolume] = useState(0); 
    const [isMuted, setIsMuted] = useState(false);
    
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
    const isSessionActiveRef = useRef(false); // Gate to prevent sending to closed session
    
    // Create a ref for mute state to access it inside the audio callback closure
    const isMutedRef = useRef(false);

    useEffect(() => {
        let cleanupFn = () => {};
        
        if (isOpen) {
            startSession();
            cleanupFn = () => stopSession();
        }

        return () => {
            cleanupFn();
        };
    }, [isOpen]);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        isMutedRef.current = newState;
    };

    const startSession = async () => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        isSessionActiveRef.current = true;
        
        setError(null);
        setStatus('Ansluter till Aceverse...');
        
        try {
            // 1. Setup Audio Context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass(); 
            audioContextRef.current = ctx;

            // 2. Get Mic with constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000 
                }
            });
            
            // Check if session was cancelled while waiting for permission
            if (!isSessionActiveRef.current) {
                stream.getTracks().forEach(t => t.stop());
                ctx.close();
                return;
            }

            streamRef.current = stream;

            // 3. Connect to Gemini
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                    },
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                },
                callbacks: {
                    onopen: async () => {
                        if (!isSessionActiveRef.current) return; // Abort if closed while connecting
                        setStatus('Ansluten');
                        setMode('listening');
                        await setupAudioProcessing();
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (!isSessionActiveRef.current) return;
                        handleServerMessage(message);
                    },
                    onclose: () => {
                        console.log("Session closed by server");
                        setStatus('Frånkopplad');
                    },
                    onerror: (err) => {
                        console.error("Session Error:", err);
                        // Only show error if we didn't intentionally close it
                        if (isSessionActiveRef.current) {
                            setError("Anslutningen bröts.");
                        }
                    }
                }
            });

        } catch (e: any) {
            console.error("Session Start Error", e);
            initializedRef.current = false;
            isSessionActiveRef.current = false;
            
            // Cleanup audio context if created
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            
            // Handle permission errors explicitly
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || e.message.includes('permission') || e.message.includes('not allowed')) {
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
            try {
                await ctx.resume();
            } catch (e) {
                console.error("Audio resume failed", e);
            }
        }

        const source = ctx.createMediaStreamSource(streamRef.current);
        sourceRef.current = source;

        // Use 4096 buffer size for stability
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            // STOP IMMEDIATELY if session is closed to prevent "Thread cancelled" error
            if (!isSessionActiveRef.current) return;

            // Check mute ref
            if (isMutedRef.current) {
                setVolume(0); 
                return;
            }

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Visualizer Logic (RMS)
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 10) { 
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / (inputData.length / 10));
            setVolume(Math.min(rms * 10, 1)); 

            // NOISE GATE: Filter out small noises (RMS < 0.04)
            if (rms < 0.04) {
                inputData.fill(0);
            }

            // Resample if needed
            const targetRate = 16000;
            const sourceRate = ctx.sampleRate;
            let finalData = inputData;

            if (sourceRate !== targetRate) {
                finalData = resampleAudio(inputData, sourceRate, targetRate);
            }

            // Convert to Int16 PCM
            const pcmData = floatTo16BitPCM(finalData);
            const base64Data = arrayBufferToBase64(pcmData);

            // Send only if valid
            if (finalData.length > 0 && isSessionActiveRef.current) {
                sessionPromiseRef.current?.then(session => {
                    if (isSessionActiveRef.current) {
                        try {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64Data
                                }
                            });
                        } catch (sendError) {
                            console.warn("Send audio failed", sendError);
                        }
                    }
                }).catch(err => {
                    console.debug("Send cancelled (expected if closing)");
                });
            }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
    };

    const handleServerMessage = (message: LiveServerMessage) => {
        // Audio Output
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            setMode('speaking');
            queueAudio(audioData);
        }

        // Interruption Handling
        if (message.serverContent?.interrupted) {
            console.log("Interruption detected");
            audioQueueRef.current = []; 
            try {
                if (currentSourceNodeRef.current) {
                    currentSourceNodeRef.current.stop();
                    currentSourceNodeRef.current = null;
                }
            } catch (e) { /* ignore */ }
            
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
            // Gemini sends 24kHz audio back
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
            console.error("Audio playback error", e);
            isPlayingRef.current = false;
        }
    };

    const stopSession = () => {
        // 1. Set Flag FIRST to stop all pending data sends
        isSessionActiveRef.current = false;
        initializedRef.current = false;
        isPlayingRef.current = false;
        isMutedRef.current = false;
        setIsMuted(false);
        audioQueueRef.current = [];

        // 2. Disconnect Audio Processing
        try {
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null; // Important: Nullify handler
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
        } catch (e) {
            console.error("Audio cleanup error", e);
        }

        // 3. Close Session Connection
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try { session.close(); } catch(e) { console.log("Session close ignored"); }
            }).catch(() => {});
            sessionPromiseRef.current = null;
        }

        // 4. Close Audio Context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    // --- High Quality Resampler (Linear Interpolation) ---
    function resampleAudio(audioBuffer: Float32Array, oldSampleRate: number, newSampleRate: number) {
        const ratio = oldSampleRate / newSampleRate;
        const newLength = Math.round(audioBuffer.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const originalIndex = i * ratio;
            const index1 = Math.floor(originalIndex);
            const index2 = Math.min(Math.ceil(originalIndex), audioBuffer.length - 1);
            const fraction = originalIndex - index1;
            result[i] = (1 - fraction) * audioBuffer[index1] + fraction * audioBuffer[index2];
        }
        return result;
    }

    // --- Helpers ---

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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn pointer-events-auto">
            
            {/* Status Header */}
            <div className="absolute top-12 left-0 right-0 flex justify-center">
                <div className={`flex items-center gap-3 px-6 py-2 rounded-full border backdrop-blur-md transition-all ${
                    error ? 'bg-red-900/30 border-red-500/50' : 'bg-white/10 border-white/10'
                }`}>
                    {error ? <AlertCircle size={16} className="text-red-400" /> : <Wifi size={16} className={mode === 'listening' ? 'text-white/50' : 'text-green-400'} />}
                    <span className="text-sm font-medium text-white/90">{error || status}</span>
                </div>
            </div>

            {/* GDPR Notice */}
            <div className="absolute top-28 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-2 text-xs text-white/50 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    <ShieldCheck size={12} />
                    <span>GDPR-Säkrad: Ljudfiler raderas omedelbart efter transkribering.</span>
                </div>
            </div>

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-8 right-8 text-white/40 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all z-20"
            >
                <X size={28} />
            </button>

            {/* Main Visualizer - Siri Style */}
            <div className="relative mb-24 flex items-center justify-center">
                
                {/* 1. Ambient Glow (Breathing) */}
                <div 
                    className={`absolute w-[400px] h-[400px] rounded-full blur-[100px] transition-all duration-1000 ${
                        mode === 'speaking' ? 'bg-green-500/20 scale-110' : 
                        mode === 'processing' ? 'bg-blue-500/20 scale-100' : 'bg-purple-500/10 scale-90'
                    }`}
                ></div>

                {/* 2. Interactive Ring */}
                <div 
                    className="absolute inset-0 rounded-full border border-white/20 transition-all duration-75 ease-linear"
                    style={{ transform: `scale(${1 + volume * 0.8})` }}
                ></div>

                {/* 3. The Core Orb */}
                <div className="relative z-10">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-500 ${
                        mode === 'speaking' ? 'bg-gradient-to-tr from-green-400 to-emerald-600 scale-110' :
                        mode === 'processing' ? 'bg-gradient-to-tr from-blue-400 to-indigo-600 animate-pulse' :
                        isMuted ? 'bg-red-900 border border-red-500/50' : 'bg-gradient-to-tr from-gray-800 to-black border border-white/10'
                    }`}>
                        {mode === 'listening' && !isMuted && (
                            <div 
                                className="absolute inset-0 rounded-full bg-white/10"
                                style={{ transform: `scale(${1 + volume})` }}
                            ></div>
                        )}
                        {isMuted ? (
                            <MicOff size={40} className="text-red-400" />
                        ) : (
                            <Sparkles 
                                size={40} 
                                className={`transition-colors duration-300 ${mode === 'listening' ? 'text-white/50' : 'text-white'}`} 
                                fill={mode !== 'listening' ? "currentColor" : "none"}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-40 text-center space-y-2 pointer-events-none transition-opacity duration-300">
                <h2 className="text-2xl font-serif-display text-white">
                    {error ? 'Fel vid anslutning' : isMuted ? 'Mikrofonen är avstängd' : mode === 'speaking' ? 'UF-läraren pratar...' : mode === 'processing' ? 'Tänker...' : 'Jag lyssnar...'}
                </h2>
                <p className="text-white/40 text-sm font-light">
                    {error ? 'Kontrollera mikrofonbehörigheter och försök igen.' : isMuted ? 'Tryck på mikrofonen för att prata' : mode === 'speaking' ? 'Du kan avbryta när som helst' : 'Prata tydligt i din mikrofon'}
                </p>
            </div>

            {/* Control Bar */}
            <div className="flex items-center gap-8 relative z-50">
                <button 
                    onClick={toggleMute}
                    className={`p-6 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer border ${
                        isMuted 
                        ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button 
                    onClick={onClose}
                    className="p-8 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all hover:scale-105 shadow-[0_0_40px_rgba(220,38,38,0.4)] cursor-pointer border-4 border-black/50"
                >
                    <PhoneOff size={32} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};
