
import React, { useState, useEffect } from 'react';
import { 
    Mic, FileText, Send, Check, Copy, ArrowRight, ArrowLeft, 
    Presentation, Plus, Play, Sparkles, User as UserIcon, Settings, BarChart3, AlertCircle, Loader2, Briefcase, Smile, Command, X, Tag, Image as ImageIcon, Quote,
    Target, ThumbsUp, BrainCircuit, Lightbulb, TrendingUp
} from 'lucide-react';
import { User, Pitch, Coach, PitchAnalysis } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import PptxGenJS from 'pptxgenjs';
import { useLanguage } from '../../contexts/LanguageContext';

interface PitchStudioProps {
    user: User;
}

type Tab = 'generator' | 'dojo' | 'coaches';
type TargetAudience = 'UF' | 'Investor';

const BASE_SKILLS = [
    'Siffror', 'Affärsmodell', 'Skalbarhet', 
    'Struktur', 'Tydlighet', 'Retorik', 
    'Storytelling', 'Kroppsspråk', 'Inledning',
    'Marknadsföring', 'Team', 'Hållbarhet', 
    'Innovation', 'Försäljning', 'Avslut'
];

// --- ADVANCED SLIDE RENDERER ENGINE ---

interface DesignSystem {
    colors: {
        primary: string;
        secondary: string;
        accent?: string;
        text_primary: string;
        text_secondary: string;
        background: string;
    };
    fonts: {
        headline: { family: string; weight: string; size: string };
        body: { family: string; weight: string; size: string };
        caption: { family: string; weight: string; size: string };
    };
    spacing?: any;
    mood?: string;
}

interface AdvancedSlide {
    slide_number: number;
    type: string;
    layout: 'hero_image_text_overlay' | 'split_screen_60_40' | 'split_screen_50_50' | 'centered_minimal' | 'centered_data_viz' | 'three_column' | 'quote' | 'default';
    design_specs: {
        background: { type: string; color?: string; image_query?: string; overlay?: string; gradient?: string };
        text_placement?: { alignment: string; vertical_position?: string; grid_columns?: string };
        chart_area?: { grid_columns: string; max_height: string };
        left_section?: any;
        right_section?: any;
    };
    content: {
        headline: { text: string; font_size?: string; font_weight?: string; color?: string; highlight_word?: string; highlight_color?: string };
        subheadline?: { text: string; font_size?: string; font_weight?: string; color?: string };
        body?: { text: string; icon?: string; emphasis?: string; emphasis_color?: string }[];
        chart?: { type: string; data: any; design: any };
        key_metrics?: { label: string; value: string; icon: string; color: string }[];
        visual?: { type: string; image_query: string; treatment: string };
        source?: { text: string; position: string; color?: string };
    };
    notes?: string;
}

interface DeckMetadata {
    company_name: string;
    tagline?: string;
    style?: string;
    primary_color?: string;
    secondary_color?: string;
}

const SlideRenderer: React.FC<{ slide: AdvancedSlide, designSystem: DesignSystem, companyName: string }> = ({ slide, designSystem, companyName }) => {
    
    // Helper for safe font family fallback
    const getFontStack = (family: string) => {
        const clean = family.split(' ')[0].replace(/['"]/g, '');
        return `'${clean}', sans-serif`;
    };

    // Helper for colors
    const colors = designSystem.colors;
    
    // Dynamic Styles based on Design System
    const slideStyle: React.CSSProperties = {
        fontFamily: getFontStack(designSystem.fonts.body.family),
        color: colors.text_primary,
        backgroundColor: colors.background,
    };

    const headlineStyle: React.CSSProperties = {
        fontFamily: getFontStack(designSystem.fonts.headline.family),
        fontWeight: designSystem.fonts.headline.weight === 'Bold' ? 700 : 600,
    };

    // --- SUB-COMPONENTS FOR SLIDE ELEMENTS ---

    const ImagePlaceholder = ({ label, style }: { label: string, style?: string }) => (
        <div className="w-full h-full bg-gray-100 border-none flex flex-col items-center justify-center p-6 text-center group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-200/50 to-transparent"></div>
            <ImageIcon size={40} className="mb-3 text-gray-300 relative z-10" />
            <span className="text-[10px] uppercase font-bold tracking-widest mb-1 text-gray-400 relative z-10">AI Image Prompt</span>
            <span className="text-xs italic text-gray-500 max-w-[80%] relative z-10">"{label}"</span>
            {style && <span className="absolute top-2 right-2 text-[9px] bg-black/10 px-2 py-0.5 rounded text-gray-500">{style}</span>}
        </div>
    );

    const HighlightText = ({ text, highlight, color }: { text: string, highlight?: string, color?: string }) => {
        if (!highlight || !text) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === highlight.toLowerCase() 
                    ? <span key={i} style={{ color: color || colors.primary }}>{part}</span> 
                    : part
                )}
            </span>
        );
    };

    // --- LAYOUT RENDERERS ---

    const renderLayout = () => {
        switch (slide.layout) {
            case 'hero_image_text_overlay':
                return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-12 overflow-hidden">
                        {/* Background Image Sim */}
                        <div className="absolute inset-0 z-0">
                            <ImagePlaceholder label={slide.design_specs.background.image_query || 'Hero Image'} />
                            {/* Overlay */}
                            <div className="absolute inset-0" style={{ background: slide.design_specs.background.overlay || 'rgba(0,0,0,0.5)' }}></div>
                        </div>
                        
                        <div className="relative z-10 max-w-4xl">
                            <h1 style={{ ...headlineStyle, fontSize: slide.content.headline.font_size || '3.5rem', color: slide.content.headline.color || '#FFF' }} className="leading-tight mb-6 drop-shadow-lg">
                                {slide.content.headline.text}
                            </h1>
                            {slide.content.subheadline && (
                                <p style={{ fontSize: slide.content.subheadline.font_size || '1.5rem', color: slide.content.subheadline.color || '#EEE' }} className="font-light max-w-2xl mx-auto drop-shadow-md">
                                    {slide.content.subheadline.text}
                                </p>
                            )}
                        </div>
                    </div>
                );

            case 'split_screen_60_40':
            case 'split_screen_50_50':
                const isFifty = slide.layout === 'split_screen_50_50';
                return (
                    <div className="w-full h-full flex">
                        <div className={`${isFifty ? 'w-1/2' : 'w-[60%]'} p-12 flex flex-col justify-center bg-white`}>
                            <h2 style={{ ...headlineStyle, fontSize: slide.content.headline.font_size || '2.5rem', color: slide.content.headline.color }} className="mb-8 leading-tight">
                                <HighlightText text={slide.content.headline.text} highlight={slide.content.headline.highlight_word} color={slide.content.headline.highlight_color} />
                            </h2>
                            <ul className="space-y-6">
                                {slide.content.body?.map((item, i) => (
                                    <li key={i} className="flex items-start gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.emphasis_color || colors.secondary }}>
                                            <Check size={14} style={{ color: colors.primary }} />
                                        </div>
                                        <div>
                                            <p className="text-lg text-gray-700 leading-relaxed">
                                                <HighlightText text={item.text} highlight={item.emphasis} color={item.emphasis_color} />
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className={`${isFifty ? 'w-1/2' : 'w-[40%]'} relative`}>
                            <ImagePlaceholder label={slide.content.visual?.image_query || 'Visual'} style={slide.content.visual?.treatment} />
                        </div>
                    </div>
                );

            case 'centered_data_viz':
                return (
                    <div className="w-full h-full p-12 flex flex-col" style={{ background: slide.design_specs.background.gradient || colors.background }}>
                        <h2 style={{ ...headlineStyle, fontSize: slide.content.headline.font_size || '2.5rem', color: slide.content.headline.color }} className="text-center mb-12">
                            {slide.content.headline.text}
                        </h2>
                        
                        <div className="flex-1 flex items-end justify-center gap-12 px-12 pb-12 relative">
                            {/* Mock Chart */}
                            {slide.content.chart?.data.datasets[0].data.map((val: number, i: number) => {
                                const max = Math.max(...slide.content.chart?.data.datasets[0].data);
                                const height = (val / max) * 100;
                                const isHighlight = i === slide.content.chart?.data.datasets[0].highlight_index;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-3 w-full group">
                                        <div className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colors.text_secondary }}>{val}</div>
                                        <div 
                                            className="w-full rounded-t-lg transition-all duration-1000"
                                            style={{ 
                                                height: `${height}%`, 
                                                backgroundColor: isHighlight ? slide.content.chart?.data.datasets[0].color : '#E5E7EB',
                                                boxShadow: isHighlight ? '0 10px 30px -10px rgba(0,0,0,0.2)' : 'none'
                                            }}
                                        ></div>
                                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{slide.content.chart?.data.labels[i]}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {slide.content.key_metrics && (
                            <div className="flex justify-center gap-8 mt-8 border-t border-gray-200 pt-8">
                                {slide.content.key_metrics.map((metric, i) => (
                                    <div key={i} className="text-center">
                                        <div className="text-3xl font-bold mb-1" style={{ color: metric.color }}>{metric.value}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest">{metric.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {slide.content.source && (
                            <div className="absolute bottom-4 right-6 text-[10px] text-gray-400">
                                {slide.content.source.text}
                            </div>
                        )}
                    </div>
                );

            case 'three_column':
                return (
                    <div className="w-full h-full p-12 flex flex-col justify-center">
                        <div className="text-center mb-16">
                            <h2 style={{ ...headlineStyle, fontSize: '2.5rem' }} className="text-gray-900 mb-2">{slide.content.headline.text}</h2>
                            {slide.content.subheadline && <p className="text-gray-500 text-lg">{slide.content.subheadline.text}</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-8">
                            {slide.content.body?.slice(0,3).map((col, i) => (
                                <div key={i} className="bg-gray-50 p-8 rounded-xl border border-gray-100 text-center hover:shadow-lg transition-shadow">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6 text-xl font-bold" style={{ color: colors.primary }}>
                                        {i + 1}
                                    </div>
                                    <p className="text-gray-700 font-medium leading-relaxed">
                                        {col.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'quote':
                return (
                    <div className="w-full h-full p-16 flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
                        <Quote size={60} className="text-gray-800 absolute top-12 left-12" />
                        <h2 className="font-serif-display text-4xl md:text-5xl leading-tight text-center italic mb-10 z-10 max-w-4xl">
                            "{slide.content.headline.text}"
                        </h2>
                        <div className="flex items-center gap-4 z-10">
                            <div className="h-px w-12 bg-gray-600"></div>
                            <span className="text-sm font-bold tracking-[0.2em] uppercase text-gray-400">{slide.content.subheadline?.text || companyName}</span>
                            <div className="h-px w-12 bg-gray-600"></div>
                        </div>
                    </div>
                );

            default: // Centered Minimal or Fallback
                return (
                    <div className="w-full h-full p-12 flex flex-col items-center justify-center text-center">
                        <h2 style={{ ...headlineStyle, fontSize: slide.content.headline.font_size || '3rem' }} className="text-gray-900 mb-8 max-w-3xl leading-tight">
                            {slide.content.headline.text}
                        </h2>
                        {slide.content.body && (
                            <div className="space-y-4 max-w-2xl">
                                {slide.content.body.map((item, i) => (
                                    <p key={i} className="text-xl text-gray-600">{item.text}</p>
                                ))}
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div 
            className="aspect-video bg-white shadow-xl rounded-sm overflow-hidden border border-gray-100 relative group transition-transform hover:scale-[1.01] duration-500"
            style={slideStyle}
        >
            {/* Force light mode styles for presentation preview */}
            <div className="light-mode-forced h-full w-full">
                {renderLayout()}
            </div>
            
            {/* Slide Metadata (Page 1 PDF) */}
            <div className={`absolute bottom-4 right-6 text-[10px] font-mono opacity-40 flex items-center gap-2 ${slide.layout === 'quote' ? 'text-gray-600' : 'text-gray-400'}`}>
                {companyName && <span className="uppercase tracking-wider mr-2">{companyName}</span>}
                <span>{slide.slide_number < 10 ? `0${slide.slide_number}` : slide.slide_number}</span>
            </div>
            
            {/* Logo Placement (Page 11 PDF) */}
            <div className={`absolute bottom-4 left-6 opacity-80 ${slide.layout === 'quote' ? 'hidden' : 'block'}`}>
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            </div>
        </div>
    );
};

const PitchStudio: React.FC<PitchStudioProps> = ({ user }) => {
    const { t } = useLanguage();
    
    // --- Default Coaches (Legacy - still used for Coaches tab) ---
    const DEFAULT_COACHES: Coach[] = [
        {
            id: 'investor-shark',
            name: t('dashboard.pitchContent.defaultCoaches.shark.name'),
            role: t('dashboard.pitchContent.defaultCoaches.shark.role'),
            avatarSeed: 'Felix',
            personality: t('dashboard.pitchContent.defaultCoaches.shark.personality'),
            instructions: t('dashboard.pitchContent.defaultCoaches.shark.instructions'),
            skills: ['Siffror', 'Affärsmodell', 'Skalbarhet'],
            isCustom: false
        },
        {
            id: 'teacher-support',
            name: t('dashboard.pitchContent.defaultCoaches.teacher.name'),
            role: t('dashboard.pitchContent.defaultCoaches.teacher.role'),
            avatarSeed: 'Aneka',
            personality: t('dashboard.pitchContent.defaultCoaches.teacher.personality'),
            instructions: t('dashboard.pitchContent.defaultCoaches.teacher.instructions'),
            skills: ['Struktur', 'Tydlighet', 'Retorik'],
            isCustom: false
        },
        {
            id: 'storyteller',
            name: t('dashboard.pitchContent.defaultCoaches.story.name'),
            role: t('dashboard.pitchContent.defaultCoaches.story.role'),
            avatarSeed: 'Leo',
            personality: t('dashboard.pitchContent.defaultCoaches.story.personality'),
            instructions: t('dashboard.pitchContent.defaultCoaches.story.instructions'),
            skills: ['Storytelling', 'Kroppsspråk', 'Inledning'],
            isCustom: false
        }
    ];

    const [activeTab, setActiveTab] = useState<Tab>('generator');
    const [coaches, setCoaches] = useState<Coach[]>(DEFAULT_COACHES);
    
    // Generator State
    const [genStep, setGenStep] = useState(1);
    const [genDetails, setGenDetails] = useState({ name: user.company || '', topic: '', audience: '', goal: '' });
    const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
    const [generatedData, setGeneratedData] = useState<{ metadata: DeckMetadata, slides: AdvancedSlide[], design_system: DesignSystem } | null>(null);

    // Dojo State (Advanced Sales Psychology Engine)
    const [script, setScript] = useState('');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>('UF'); // UF vs Investor
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<PitchAnalysis | null>(null);

    // Coach Lab State
    const [isCreatingCoach, setIsCreatingCoach] = useState(false);
    const [newCoach, setNewCoach] = useState({ name: '', role: '', personality: '', instructions: '' });
    
    // Skills Management
    const [availableSkills, setAvailableSkills] = useState<string[]>(BASE_SKILLS);
    const [newCoachSkills, setNewCoachSkills] = useState<string[]>([]);
    const [customSkillInput, setCustomSkillInput] = useState('');

    useEffect(() => {
        const loadCoaches = async () => {
            const data = await db.getUserData(user.id);
            let loadedCoaches = DEFAULT_COACHES;
            if (data.coaches && data.coaches.length > 0) {
                loadedCoaches = [...DEFAULT_COACHES, ...data.coaches];
            }
            setCoaches(loadedCoaches);

            const allSkills = new Set(BASE_SKILLS);
            loadedCoaches.forEach(c => c.skills.forEach(s => allSkills.add(s)));
            setAvailableSkills(Array.from(allSkills));
        };
        loadCoaches();
    }, [user.id, t]);

    // --- AI FUNCTIONS ---

    const generateDeck = async () => {
        setIsGeneratingDeck(true);
        try {
            // THE MEGA PROMPT FROM PDF
            const prompt = `
            # ROLL OCH IDENTITET
            Du är en världsklass presentationsdesigner OCH affärscoach som specialiserar sig på att hjälpa unga entreprenörer.
            Din designfilosofi: "Varje slide ska vara så vacker att den kan stå ensam som en poster, men så tydlig att budskapet förstås på 3 sekunder."
            
            # KÄRNUPPGIFT
            Baserat på input, generera en visuellt hisnande pitch deck.
            Company Name: "${genDetails.name}"
            Topic/Idea: ${genDetails.topic}
            Target Audience: ${genDetails.audience}
            Goal: ${genDetails.goal}

            # OUTPUT FORMAT (STRICT JSON)
            {
              "metadata": {
                "company_name": "${genDetails.name}",
                "tagline": "Catchy tagline",
                "style": "modern_tech" | "minimalist" | "creative" | "professional" | "eco",
                "primary_color": "#HEX",
                "secondary_color": "#HEX"
              },
              "design_system": {
                "colors": {
                    "primary": "#HEX",
                    "secondary": "#HEX",
                    "accent": "#HEX",
                    "text_primary": "#HEX",
                    "text_secondary": "#HEX",
                    "background": "#HEX"
                },
                "fonts": {
                    "headline": {"family": "Poppins", "weight": "Bold", "size": "42pt"},
                    "body": {"family": "Inter", "weight": "Regular", "size": "18pt"},
                    "caption": {"family": "Inter", "weight": "Light", "size": "14pt"}
                }
              },
              "slides": [
                {
                  "slide_number": 1,
                  "type": "cover",
                  "layout": "hero_image_text_overlay", 
                  "design_specs": {
                    "background": {
                      "type": "image",
                      "image_query": "specific query",
                      "overlay": "linear-gradient(...)"
                    }
                  },
                  "content": {
                    "headline": { "text": "...", "font_size": "52pt", "color": "#FFF" },
                    "subheadline": { "text": "...", "font_size": "24pt", "color": "#EEE" }
                  }
                }
                // ... generate 6-8 key slides (Problem, Solution, Market, Business Model, Team, Ask)
                // Use layouts: 'split_screen_60_40', 'centered_data_viz', 'three_column', 'quote'
              ]
            }
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const text = response.text;
            let result;
            
            if (text) {
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error("JSON Parse Error", parseError);
                }
            }

            if (!result || !result.slides) {
                throw new Error("Invalid response from AI");
            }

            setGeneratedData(result);
            setGenStep(3);

            // Save to DB
            await db.addPitch(user.id, {
                type: 'deck',
                name: `Deck: ${genDetails.name || 'Utkast'}`,
                content: JSON.stringify(result)
            });

        } catch (e) {
            console.error("Deck Generation Failed", e);
            alert("Kunde inte generera presentationen. Försök igen.");
        } finally {
            setIsGeneratingDeck(false);
        }
    };

    // --- PPT Export Logic (Simplified for stability) ---
    const exportToPPT = () => {
        if (!generatedData) return;
        
        const pres = new PptxGenJS();
        pres.title = genDetails.name || "Aceverse Presentation";
        
        generatedData.slides.forEach((slide) => {
            const slideNode = pres.addSlide();
            slideNode.background = { color: generatedData.design_system.colors.background.replace('#', '') };
            
            // Add Title
            slideNode.addText(slide.content.headline.text, { 
                x: 0.5, y: 0.5, w: '90%', 
                fontSize: 32, bold: true, 
                color: generatedData.design_system.colors.primary.replace('#', '') 
            });

            // Add Body if available
            if (slide.content.body) {
                const text = slide.content.body.map(b => b.text).join('\n');
                slideNode.addText(text, { x: 0.5, y: 1.5, w: '90%', fontSize: 18, color: '333333', bullet: true });
            }
        });

        pres.writeFile({ fileName: `${genDetails.name.replace(/\s+/g, '_')}_Presentation.pptx` });
    };

    const analyzePitch = async () => {
        if (!script.trim()) return;
        setIsAnalyzing(true);
        setAnalysis(null);

        try {
            // SYSTEM PROMPT FROM DOMAIN KNOWLEDGE (PDF)
            const systemInstruction = `
            SYSTEM INSTRUCTION:
            Du är en Världsklass Säljcoach och AI Solutions Architect.
            Din uppgift är att analysera en pitch baserat på följande ramverk:

            CORE PHILOSOPHY: Beslut är emotionella (Limbiska systemet) rättfärdigade av logik (Neocortex). Enkelt är geni.

            THE STRUCTURE (Narrative Arc):
            1. The Hook (0-15s): Fånga "Reptilhjärnan".
            2. The Problem: "Villain". Måste vara "Need to have".
            3. The Solution: "Hero". Show, don't just tell.
            4. The Market & Validation: Traction är kung.
            5. The Team: "Unfair Advantage".
            6. The Ask/CTA: Tydliga nästa steg.

            TARGET AUDIENCE NUANCE (${targetAudience}):
            ${targetAudience === 'UF' 
                ? 'Fokusera på Läranderesan, Resiliens, Hållbarhet och Teamdynamik.' 
                : 'Fokusera på ROI, Skalbarhet (100x), Exit-strategi och FOMO.'}

            ANALYSIS FRAMEWORK (The 4Cs):
            1. CLEAR: Inget jargong. Kan en 12-åring förstå?
            2. COMPELLING: Emotionell kurva. Storytelling.
            3. CREDIBLE: Data? Trovärdighet?
            4. CONCISE: "Kill your darlings".

            UPPGIFT:
            Analysera användarens pitch-manus.
            Returnera ENDAST JSON i exakt detta format:
            {
              "score": number (0-100),
              "breakdown_4c": {
                "clear": number (0-100),
                "compelling": number (0-100),
                "credible": number (0-100),
                "concise": number (0-100)
              },
              "feedback_summary": "string (kort sammanfattning på svenska)",
              "strengths": ["string", "string"],
              "weaknesses": ["string", "string"],
              "audience_specific_tip": "string (Unikt tips baserat på vald målgrupp)",
              "improved_hook": "string (Ett förslag på en bättre inledning)"
            }
            `;

            const userPrompt = `Här är mitt pitch-manus: "${script}"`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    responseMimeType: 'application/json',
                    systemInstruction: systemInstruction 
                }
            });

            const result = JSON.parse(response.text || '{}');
            setAnalysis(result);
            
        } catch (e) {
            console.error("Analysis Failed", e);
            alert("Kunde inte analysera pitchen. Kontrollera din internetanslutning.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const createCustomCoach = async () => {
        if (!newCoach.name || !newCoach.instructions) return;
        const finalSkills = newCoachSkills.length > 0 ? newCoachSkills : ['Allmänt'];
        try {
            const coach = await db.addCoach(user.id, {
                name: newCoach.name,
                role: newCoach.role || 'Expert',
                personality: newCoach.personality || 'Neutral',
                instructions: newCoach.instructions,
                skills: finalSkills,
                avatarSeed: newCoach.name + Date.now()
            });
            setCoaches(prev => [...prev, coach]);
            setIsCreatingCoach(false);
            setNewCoach({ name: '', role: '', personality: '', instructions: '' });
            setNewCoachSkills([]);
        } catch (e) { console.error(e); }
    };

    const toggleSkill = (skill: string) => {
        if (newCoachSkills.includes(skill)) {
            setNewCoachSkills(prev => prev.filter(s => s !== skill));
        } else {
            setNewCoachSkills(prev => [...prev, skill]);
        }
    };

    const addCustomSkill = () => {
        if (!customSkillInput.trim()) return;
        const skill = customSkillInput.trim();
        if (!availableSkills.includes(skill)) setAvailableSkills(prev => [...prev, skill]);
        if (!newCoachSkills.includes(skill)) setNewCoachSkills(prev => [...prev, skill]);
        setCustomSkillInput('');
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header & Nav */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">{t('dashboard.pitchContent.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('dashboard.pitchContent.subtitle')}</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('generator')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'generator' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>{t('dashboard.pitchContent.tabs.decks')}</button>
                    <button onClick={() => setActiveTab('dojo')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dojo' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>{t('dashboard.pitchContent.tabs.dojo')}</button>
                    <button onClick={() => setActiveTab('coaches')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'coaches' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>{t('dashboard.pitchContent.tabs.coaches')}</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                
                {/* 1. PRESENTATION GENERATOR */}
                {activeTab === 'generator' && (
                    <div className="h-full overflow-y-auto animate-fadeIn pb-12">
                        {genStep === 1 && (
                            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-10 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mt-8">
                                <div className="text-center mb-10">
                                    <div className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/20 transform rotate-3">
                                        <Presentation size={40} />
                                    </div>
                                    <h2 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">{t('dashboard.pitchContent.generator.title')}</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">{t('dashboard.pitchContent.generator.desc')}</p>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('dashboard.pitchContent.generator.topic')}</label>
                                        <input className="w-full border-b-2 border-gray-200 dark:border-gray-700 p-3 bg-transparent focus:border-black dark:focus:border-white outline-none text-lg transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white" placeholder="t.ex. En app för att minska matsvinn i skolor" value={genDetails.topic} onChange={e => setGenDetails({...genDetails, topic: e.target.value})} autoFocus />
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('dashboard.pitchContent.generator.audience')}</label>
                                            <input className="w-full border-b-2 border-gray-200 dark:border-gray-700 p-3 bg-transparent focus:border-black dark:focus:border-white outline-none text-lg transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white" placeholder="Investerare" value={genDetails.audience} onChange={e => setGenDetails({...genDetails, audience: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('dashboard.pitchContent.generator.goal')}</label>
                                            <input className="w-full border-b-2 border-gray-200 dark:border-gray-700 p-3 bg-transparent focus:border-black dark:focus:border-white outline-none text-lg transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white" placeholder="Söka kapital" value={genDetails.goal} onChange={e => setGenDetails({...genDetails, goal: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button 
                                            onClick={generateDeck}
                                            disabled={!genDetails.topic || isGeneratingDeck}
                                            className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-xl font-medium text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGeneratingDeck ? <><Loader2 className="animate-spin" /> {t('dashboard.pitchContent.generator.generating')}</> : <><Sparkles size={20} /> {t('dashboard.pitchContent.generator.btn')}</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {genStep === 3 && generatedData && (
                            <div className="space-y-8 animate-slideUp">
                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10">
                                    <div>
                                        <h2 className="font-serif-display text-2xl text-gray-900 dark:text-white">{genDetails.name || 'Genererad Presentation'}</h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{generatedData.slides.length} slides • Designad av Aceverse AI</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setGenStep(1)} className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">Börja om</button>
                                        <button 
                                            onClick={exportToPPT}
                                            className="bg-[#D24726] text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-[#B33B1E] transition-colors shadow-md text-sm font-medium" 
                                        >
                                            <FileText size={16} /> Exportera PPT
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 px-4 pb-20">
                                    {generatedData.slides.map((slide) => (
                                        <div key={slide.slide_number} className="flex flex-col gap-2">
                                            <SlideRenderer slide={slide} designSystem={generatedData.design_system} companyName={generatedData.metadata.company_name} />
                                            {slide.content.visual?.image_query && (
                                                <div className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800 flex gap-2 items-start">
                                                    <span className="font-bold uppercase tracking-wider shrink-0">Visual Prompt:</span>
                                                    <span className="italic">"{slide.content.visual.image_query}"</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. PITCH DOJO (Sales Psychology Engine) */}
                {activeTab === 'dojo' && (
                    <div className="h-full flex flex-col md:flex-row gap-6 animate-fadeIn overflow-hidden">
                        <div className="w-full md:w-[45%] flex flex-col h-full">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex-1 flex flex-col p-6">
                                <h3 className="font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><Sparkles size={18} /> {t('dashboard.pitchContent.dojo.paste')}</h3>
                                <textarea 
                                    className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-lg p-4 resize-none focus:ring-1 focus:ring-black dark:focus:ring-white outline-none text-base leading-relaxed text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="Hej! Jag heter Max och mitt företag..."
                                    value={script}
                                    onChange={e => setScript(e.target.value)}
                                ></textarea>
                                
                                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Målgrupp (Avgör analysramverk)</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4">
                                        <button 
                                            onClick={() => setTargetAudience('UF')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${targetAudience === 'UF' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                                        >
                                            <Briefcase size={16} /> UF-Tävling
                                        </button>
                                        <button 
                                            onClick={() => setTargetAudience('Investor')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${targetAudience === 'Investor' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                                        >
                                            <TrendingUp size={16} /> Investerare
                                        </button>
                                    </div>

                                    <button 
                                        onClick={analyzePitch}
                                        disabled={!script || isAnalyzing}
                                        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-medium text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
                                        Analysera med 4C-modellen
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-[55%] h-full overflow-y-auto">
                            {analysis ? (
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 animate-slideUp">
                                    
                                    {/* Overall Score Header */}
                                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sales Psychology Score</p>
                                            <h3 className="font-serif-display text-4xl text-gray-900 dark:text-white">{analysis.score}/100</h3>
                                        </div>
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-8 ${analysis.score > 80 ? 'border-green-500 text-green-600' : analysis.score > 50 ? 'border-yellow-400 text-yellow-600' : 'border-red-400 text-red-600'}`}>
                                            {analysis.score}
                                        </div>
                                    </div>

                                    {/* 4C Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        {[
                                            { label: 'Clear', val: analysis.breakdown_4c.clear },
                                            { label: 'Compelling', val: analysis.breakdown_4c.compelling },
                                            { label: 'Credible', val: analysis.breakdown_4c.credible },
                                            { label: 'Concise', val: analysis.breakdown_4c.concise }
                                        ].map((c, i) => (
                                            <div key={i} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center">
                                                <div className={`text-xl font-bold mb-1 ${c.val > 75 ? 'text-green-600' : c.val > 50 ? 'text-yellow-600' : 'text-red-500'}`}>{c.val}%</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-8">
                                        {/* Summary */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg text-gray-700 dark:text-gray-300 italic border-l-4 border-black dark:border-white">
                                            "{analysis.feedback_summary}"
                                        </div>

                                        {/* Strengths & Weaknesses */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-green-700 dark:text-green-400"><ThumbsUp size={16} /> Vad fungerar</h4>
                                                <ul className="space-y-2">
                                                    {analysis.strengths.map((s, i) => (
                                                        <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0"></div>
                                                            {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-600 dark:text-red-400"><Target size={16} /> Missad potential</h4>
                                                <ul className="space-y-2">
                                                    {analysis.weaknesses.map((s, i) => (
                                                        <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                                                            {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Improved Hook */}
                                        {analysis.improved_hook && (
                                            <div>
                                                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-gray-900 dark:text-white"><Sparkles size={16} /> Förslag på bättre inledning (The Hook)</h4>
                                                <div className="bg-black dark:bg-white text-white dark:text-black p-6 rounded-lg text-sm font-medium leading-relaxed shadow-lg">
                                                    "{analysis.improved_hook}"
                                                </div>
                                            </div>
                                        )}

                                        {/* Audience Tip */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-4 rounded-xl flex gap-3">
                                            <Lightbulb className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">
                                                    Pro-tip för {targetAudience === 'UF' ? 'Juryn' : 'Investerare'}
                                                </h4>
                                                <p className="text-sm text-blue-700 dark:text-blue-200">{analysis.audience_specific_tip}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <BrainCircuit size={32} className="opacity-50" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ingen analys än</h3>
                                    <p className="max-w-xs">Klistra in ditt manus och välj målgrupp för att se om du träffar "Reptilhjärnan".</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. COACH LAB (Legacy/Custom) */}
                {activeTab === 'coaches' && (
                    <div className="h-full overflow-y-auto animate-fadeIn pb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Create New Card */}
                            <button 
                                onClick={() => setIsCreatingCoach(true)}
                                className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all group min-h-[300px]"
                            >
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                                    <Plus size={32} />
                                </div>
                                <h3 className="font-medium text-lg">{t('dashboard.pitchContent.coaches.create')}</h3>
                                <p className="text-sm opacity-70">{t('dashboard.pitchContent.coaches.createDesc')}</p>
                            </button>

                            {/* Coach Cards */}
                            {coaches.map((coach) => (
                                <div key={coach.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    {coach.isCustom && <div className="absolute top-3 right-3 text-xs bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full">Custom</div>}
                                    <div className="flex items-center gap-4 mb-6">
                                        <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.avatarSeed}`} 
                                            alt={coach.name} 
                                            className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800"
                                        />
                                        <div>
                                            <h3 className="font-serif-display text-xl text-gray-900 dark:text-white">{coach.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{coach.role}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <span className="font-bold text-gray-900 dark:text-white block mb-1">{t('dashboard.pitchContent.coaches.personality')}</span>
                                            <p className="text-gray-600 dark:text-gray-400">{coach.personality}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Coach Modal - Redesigned */}
            {isCreatingCoach && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slideUp flex flex-col md:flex-row max-h-[90vh] border border-gray-200 dark:border-gray-800">
                        {/* Visual Side */}
                        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 relative">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider absolute top-6 left-0 w-full text-center">{t('dashboard.pitchContent.coaches.preview')}</h3>
                             
                             <div className="relative w-32 h-32 rounded-full mb-6 ring-4 ring-white dark:ring-gray-700 shadow-xl overflow-hidden bg-white dark:bg-gray-700">
                                 {newCoach.name ? (
                                    <img 
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${newCoach.name + Date.now().toString().substring(0,5)}`}
                                        alt="Avatar Preview" 
                                        className="w-full h-full object-cover"
                                    />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-600 text-gray-300 dark:text-gray-400">
                                        <UserIcon size={40} />
                                    </div>
                                 )}
                             </div>
                             
                             <div className="text-center w-full">
                                 <h2 className="font-serif-display text-2xl truncate px-2 text-gray-900 dark:text-white">{newCoach.name || 'Namnlös Coach'}</h2>
                                 <p className="text-sm text-gray-500 dark:text-gray-400 truncate px-2 mb-4">{newCoach.role || 'Roll ej vald'}</p>
                             </div>
                        </div>

                        {/* Input Side */}
                        <div className="w-full md:w-2/3 p-8 flex flex-col h-full overflow-y-auto bg-white dark:bg-gray-900">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-serif-display text-2xl text-gray-900 dark:text-white">{t('dashboard.pitchContent.coaches.create')}</h2>
                                <button onClick={() => setIsCreatingCoach(false)} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
                            </div>
                            
                            <div className="space-y-4 flex-1">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="group bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 p-3 rounded-xl border border-transparent focus-within:border-black dark:focus-within:border-white transition-all flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-gray-500 dark:text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white">
                                            <UserIcon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.pitchContent.coaches.name')}</label>
                                            <input 
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-300" 
                                                placeholder="t.ex. Gordon" 
                                                value={newCoach.name} 
                                                onChange={e => setNewCoach({...newCoach, name: e.target.value})} 
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="group bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 p-3 rounded-xl border border-transparent focus-within:border-black dark:focus-within:border-white transition-all flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-gray-500 dark:text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white">
                                            <Briefcase size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.pitchContent.coaches.role')}</label>
                                            <input 
                                                className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-300" 
                                                placeholder="t.ex. Säljchef" 
                                                value={newCoach.role} 
                                                onChange={e => setNewCoach({...newCoach, role: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="group bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 p-3 rounded-xl border border-transparent focus-within:border-black dark:focus-within:border-white transition-all flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-gray-500 dark:text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white">
                                        <Smile size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.pitchContent.coaches.personality')}</label>
                                        <input 
                                            className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-300" 
                                            placeholder="t.ex. Cynisk, krävande, men rättvis" 
                                            value={newCoach.personality} 
                                            onChange={e => setNewCoach({...newCoach, personality: e.target.value})} 
                                        />
                                    </div>
                                </div>

                                <div className="group bg-gray-50 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 p-3 rounded-xl border border-transparent focus-within:border-black dark:focus-within:border-white transition-all">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Command size={14} className="text-gray-400" />
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.pitchContent.coaches.instructions')}</label>
                                    </div>
                                    <textarea 
                                        className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-300 h-20 resize-none leading-relaxed" 
                                        placeholder="Ge den instruktioner om vad den ska leta efter i pitchen (t.ex. 'Leta efter svaga argument', 'Fokusera på siffrorna')..." 
                                        value={newCoach.instructions} 
                                        onChange={e => setNewCoach({...newCoach, instructions: e.target.value})} 
                                    />
                                </div>

                                {/* Skills Section */}
                                <div className="bg-white dark:bg-gray-900 pt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} className="text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.pitchContent.coaches.skills')}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{newCoachSkills.length} valda</span>
                                    </div>
                                    
                                    {/* Skills Input */}
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-black dark:focus:ring-white outline-none focus:bg-white dark:focus:bg-gray-900 transition-colors text-gray-900 dark:text-white"
                                            placeholder="Lägg till en egen skill (t.ex. 'Crypto')"
                                            value={customSkillInput}
                                            onChange={(e) => setCustomSkillInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
                                        />
                                        <button 
                                            onClick={addCustomSkill}
                                            disabled={!customSkillInput.trim()}
                                            className="bg-gray-100 dark:bg-gray-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {/* Skills Cloud */}
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                                        {availableSkills.map(skill => (
                                            <button 
                                                key={skill}
                                                onClick={() => toggleSkill(skill)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                                    newCoachSkills.includes(skill)
                                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                                }`}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={createCustomCoach} 
                                disabled={!newCoach.name || !newCoach.instructions}
                                className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-black/10 mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} /> {t('dashboard.pitchContent.coaches.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PitchStudio;
