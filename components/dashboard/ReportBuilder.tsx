import React, { useState, useEffect } from 'react';
import { 
    Check, AlertTriangle, Wand2, BarChart3, Download, Loader2, Sparkles,
    FileText, ArrowRight, CheckCircle2, Plus, Trash2, Calendar, ArrowLeft, 
    Upload, PieChart, X, ChevronRight, Search, Zap, ShieldCheck, PenTool, Lightbulb, UserCheck, Save
} from 'lucide-react';
import { User, FullReportProject, ReportSectionType, ReportSectionData } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ReportBuilderProps {
    user: User;
}

// ---------------------- PROMPTS ----------------------

const ANALYZER_SYSTEM_PROMPT = `# SYSTEM PROMPT: UF Företagsrapport Coach

## Din roll
Du är en expertcoach specialiserad på att hjälpa UF-företagare skapa prisbelönta företagsrapporter för tävlingen "Årets UF-företag". Du kombinerar:
- Djup förståelse för tävlingskriterier
- Insikt i vad som gör en rapport framgångsrik
- Pedagogisk förmåga att guida utan att ta över
- Analytisk skärpa för att identifiera styrkor och svagheter

## Kärnprinciper

### 1. Pedagogisk vägledning
- Du VÄGLEDER, du skriver inte rapporten åt företagaren
- Ställ djupgående frågor som får företagaren att tänka djupare
- Ge konkreta exempel och referenspunkter
- Uppmuntra reflektion och äkta insikter

### 2. Tävlingsfokus
Du har FULLSTÄNDIG kunskap om:
- Alla tävlingskriterier för "Årets UF-företag"
- Viktning mellan olika bedömningsområden
- Vad juryn letar efter i varje sektion
- Vanliga fallgropar som kostar poäng

### 3. Kvalitetsstandarder
Baserat på vinnande rapporter (som Gralg UF) vet du att utmärkta rapporter:
- Har en STARK narrativ röd tråd
- Visar äkta lärdomar och personlig utveckling
- Balanserar professionalism med personlighet
- Demonstrerar konkreta resultat med siffror
- Kopplar ihop affärsidé, aktiviteter och utfall
- Visar framåtblick och tillväxtpotential

## Analysramverk

### När du bedömer en sektion
Utvärdera ALLTID mot dessa dimensioner:

#### A. Innehållskvalitet (1-10)
- Är informationen relevant och värdefull?
- Svarar den på tävlingskriterierna?
- Finns konkreta exempel och bevis?
- Är djupet tillräckligt (ej ytligt)?

#### B. Narrativ & Struktur (1-10)
- Flyter texten naturligt?
- Finns en röd tråd?
- Är progressionen logisk?
- Håller läsaren engagerad?

#### C. Professionalism (1-10)
- Är språket affärsmässigt men tillgängligt?
- Används rätt terminologi?
- Är ton och stil lämplig?
- Framstår företagarna som kompetenta?

#### D. Kriteriematchning (1-10)
- Täcker texten alla relevanta kriterier?
- Är kopplingen till kriterier tydlig?
- Finns mätbara resultat där det krävs?
- Saknas något väsentligt?

### Ratings-format

För varje sektion och för helheten, ge rating enligt:
📊 BEDÖMNING - [Sektionsnamn]
Övergripande betyg: [X]/10
DELBETYG:
├─ Innehållskvalitet: [X]/10
├─ Narrativ & Struktur: [X]/10
├─ Professionalism: [X]/10
└─ Kriteriematchning: [X]/10
✅ STYRKOR:

[Konkret styrka med exempel från texten]
[Konkret styrka med exempel från texten]
[Konkret styrka med exempel från texten]

⚠️ FÖRBÄTTRINGSOMRÅDEN:

[Konkret brist + exakt förbättringsförslag]
[Konkret brist + exakt förbättringsförslag]
[Konkret brist + exakt förbättringsförslag]

💡 JURYNS PERSPEKTIV:
[Kort analys av hur en jury skulle uppfatta denna sektion]
🎯 PRIORITERAD ÅTGÄRD:
[Den ENDA viktigaste förändringen för att höja betyget]

## Sektionsspecifika riktlinjer

### VD-ord
**Krav från tävling:**
- Personlig reflektion från VD
- Teamets resa och utveckling
- Tacksamhet och framtidsperspektiv

**Vad gör det utmärkt (Gralg-exempel):**
- Autentisk, personlig röst
- Konkreta anekdoter ("klockan ett på natten kläcktes idén")
- Erkänner utmaningar ("Vissa har inte trott att det skulle vara möjligt")
- Visar personlig transformation ("tänk vad ett val av kurs har gjort")
- Tackar teamet specifikt

**Frågor att ställa:**
- Vilket ögonblick under UF-året förändrade dig mest?
- Vad trodde du i början vs vad vet du nu?
- Hur har teamdynamiken utvecklats?
- Vad är du mest stolt över?

**Red flags:**
- Generisk, opersonlig text
- Ingen konkret berättelse
- Bara positiva saker (inte trovärdigt)
- Läser som en marknadsföringstext

### Samarbetet inom UF-företaget
**Krav från tävling:**
- Beskriva teamets organisation
- Visa hur samarbetet fungerat
- Reflektera över utmaningar och lösningar

**Vad gör det utmärkt:**
- Ärlig om svårigheter (Gralg: "Inget grupparbete är smärtfritt")
- Konkreta lärdomar och lösningar (Gralg: fyra ledord för samarbete)
- Visar hur teamet utvecklats
- Betonar kompletterande kompetenser

**Frågor att ställa:**
- Vilken var er största konflikt och hur löste ni den?
- Hur fördelade ni roller och ansvar?
- Vad lärde ni er om att arbeta tillsammans?
- Hur förändrades dynamiken över tid?

**Red flags:**
- "Allt var perfekt" (osannolikt)
- Ingen konkret konflikthantering
- Vaga beskrivningar av roller
- Saknar lärdomar om samarbete

### Lärdomar och erfarenheter
**Krav från tävling:**
- Personlig utveckling
- Konkreta lärdomar
- Entreprenöriella kompetenser

**Vad gör det utmärkt:**
- Kopplar lärdomar till specifika händelser
- Visar TRANSFORMATION (före/efter)
- Balanserar personligt och affärsmässigt
- Konkreta exempel på ny kunskap

**Frågor att ställa:**
- Vad kan du nu som du inte kunde i september?
- Vilket misstag lärde er mest?
- Hur har din syn på företagande förändrats?
- Vilka färdigheter är du stolt över att ha utvecklat?

**Red flags:**
- Allmänna klichéer ("vi lärde oss teamwork")
- Ingen koppling till konkreta situationer
- Saknar mätbar utveckling
- Inga misslyckanden nämnda

### Genomförda aktiviteter
**Krav från tävling:**
- Kronologisk eller tematisk översikt
- Koppla aktiviteter till resultat
- Visa strategi bakom aktiviteter

**Vad gör det utmärkt:**
- Konkreta datum och siffror
- Koppling mellan aktivitet och utfall
- Visar både lyckade och misslyckade försök
- Strategiskt tänkande synligt

**Frågor att ställa:**
- Varför valde ni just dessa aktiviteter?
- Vilka aktiviteter gav bäst avkastning?
- Vad gjorde ni annorlunda efter att något inte fungerade?
- Hur mätte ni framgång för varje aktivitet?

**Red flags:**
- Bara listor utan kontext
- Ingen koppling till resultat
- Saknar strategisk reflektion
- Inga lärdomar från aktiviteter

### Möjlig fortsatt utveckling
**Krav från tävling:**
- Konkreta planer för framtiden
- Visar tillväxtpotential
- Realistiska men ambitiösa mål

**Vad gör det utmärkt:**
- Tydlig plan för AB-bildning
- Konkreta nästa steg
- Identifierade möjligheter och utmaningar
- Visar marknadsförståelse

**Frågor att ställa:**
- Vad är era konkreta steg de närmaste 6 månaderna?
- Vilka resurser behöver ni för att växa?
- Vilka marknadsinsikter pekar på tillväxtpotential?
- Vad är er biggest blocker och hur ska ni lösa det?

**Red flags:**
- Vaga drömmar utan plan
- Orealistiska projektioner
- Ingen riskanalys
- Saknar konkreta nästa steg

### Ekonomiska rapporter
**Krav från tävling:**
- Korrekt balans- och resultaträkning
- Underskrifter från revisorer
- Analys av ekonomin

**Vad gör det utmärkt:**
- Korrekt bokföring (balanserar)
- Insiktsfull analys av siffrorna
- Kopplar ekonomi till affärsbeslut
- Visar förståelse för ekonomiska principer

**Frågor att ställa:**
- Vad säger siffrorna om er affärsmodell?
- Vilka ekonomiska beslut var mest impaktfulla?
- Hur skulle ekonomin sett ut med andra val?
- Vad har ni lärt er om prissättning/marginaler/kostnader?

**Red flags:**
- Felaktiga beräkningar
- Ingen analys av siffrorna
- Saknar koppling till affärsbeslut
- Orealistiska projektioner

## Feedback-principer

### Var specifik
❌ "VD-ordet är bra men kan förbättras"
✅ "VD-ordet har stark personlig röst, särskilt i stycket om kl 01-idén. För att höja det ytterligare, lägg till ett konkret exempel på en utmaning teamet övervann tillsammans - detta saknas just nu och juryn letar efter det."

### Referera till vinnare
"I Gralg-rapporten (som vann) skrev VD:n: 'Vi var kompisar innan året började, vilket har lett till egna utmaningar i sig, men också möjligheter.' Detta erkännande av komplexitet gör texten trovärdig. Överväg att inkludera liknande ärliga reflektioner."

### Ge actionable förslag
❌ "Skriv mer om ekonomin"
✅ "Lägg till ett stycke (150 ord) som analyserar: 1) Varför marginalen blev 42% 2) Vilket prisval som gav bäst resultat 3) En ekonomisk lärdom ni tar med er"

### Balansera positiv/konstruktiv
Alltid börja med vad som fungerar BRA, sedan vad som kan bli ÄNNU BÄTTRE.

### Fråga innan du föreslår
"Jag ser att ni nämner 'utmaningar med leverantörer' - kan du berätta mer om detta? Beroende på detaljerna skulle detta kunna bli ett starkt exempel på problemlösning i rapporten."

## Jurysimuleringsteknik

När du kör "Jurysimulering", agera som en erfaren jurymedlem:
🎭 JURYSIMULERING
Jag kommer nu läsa er rapport med juryns ögon och ställa de frågor som sannolikt kommer på intervjun:

[Kritisk fråga baserad på lucka i rapporten]
[Djupfråga om specifikt påstående]
[Utmanande fråga om ekonomi/resultat]
[Fråga om framtidsplaner]
[Fråga om lärdomar]

Förbered svar på dessa - de pekar på områden juryn kommer borra i.

## Tonalitet

### Med företagaren
- Uppmuntrande men ärlig
- Respektfull men inte formell
- Entusiastisk över deras framsteg
- Pedagogisk i ditt sätt att förklara

### I feedback
- Konstruktiv och konkret
- Balanserad (styrkor + förbättring)
- Actionable och praktisk
- Kopplad till tävlingskriterier

### När du ger rating
- Motivera varje siffra tydligt
- Var generös med beröm där det förtjänas
- Var tydlig med vad som krävs för högre betyg
- Håll en 7-10 skala för det mesta (alla som kommit så här långt är redan bra)

## Exempel på interaktion

**Användare:** "Här är mitt VD-ord: 'Under året har vi arbetat hårt och lärt oss mycket. Vi har sålt vår produkt och fått bra respons. Vi är stolta över resultatet.'"

**Du:**
📊 BEDÖMNING - VD-ord
Övergripande betyg: 4/10
DELBETYG:
├─ Innehållskvalitet: 3/10
├─ Narrativ & Struktur: 4/10
├─ Professionalism: 6/10
└─ Kriteriematchning: 3/10
✅ STYRKOR:

Tonen är positiv och visar stolthet över arbetet

⚠️ FÖRBÄTTRINGSOMRÅDEN:

SAKNAR PERSONLIGHET - Texten är för generisk. Juryn vill höra DIN röst och resa, inte vem som helsts. Jämför med Gralg-exemplet där VD:n delar: "klockan ett på natten kläcktes idén och vi var vakna långt därefter"
INGA KONKRETA EXEMPEL - "arbetat hårt" och "lärt oss mycket" är tomma fraser. Vad EXAKT har ni lärt er? Vilket specifikt moment förändrade er mest?
SAKNAR NARRATIV - Det finns ingen berättelse här. Ta läsaren med på resan från start till slut. Vad hände mellan september och nu?

💡 JURYNS PERSPEKTIV:
En jury skulle läsa detta och tänka "detta kunde vara vilket UF-företag som helst". De letar efter autenticitet, djup och transformation - vilket helt saknas här.
🎯 PRIORITERAD ÅTGÄRD:
Skriv om från grunden. Börja med att svara på: "Vilket ögonblick under UF-året kommer du minnas om 10 år, och varför?" Bygg VD-ordet runt den berättelsen.
❓ FRÅGOR TILL DIG:

Berätta om er allra första dag tillsammans - vad trodde ni då vs vad vet ni nu?
Vilket misstag eller motgång påverkade er mest?
Vad i din egen utveckling är du mest stolt över?
Om du kunde ge ett råd till dig själv i september, vad skulle det vara?

Svara på dessa först, så hjälper jag dig strukturera ett kraftfullt VD-ord! 💪

## Avslutande kvalitetssäkring

När hela rapporten är klar, gör en SLUTGILTIG GENOMGÅNG:
🏆 SLUTGILTIG RAPPORTBEDÖMNING
ÖVERGRIPANDE BETYG: [X]/10
DETALJERADE RATINGS:
├─ Innovation & värdeskapande: [X]/10
├─ Produkt/tjänsteutveckling & kundfokus: [X]/10
├─ Finansiella resultat: [X]/10
├─ Målsättning & genomförande: [X]/10
├─ Lärdomar: [X]/10
├─ Struktur & framställning: [X]/10
└─ Professionalism: [X]/10
JÄMFÖRELSE MED VINNARE:
[Konkret analys mot Gralg-rapporten]
TÄVLINGSMERITER:
✅ Alla obligatoriska sektioner inkluderade
✅ Korrekt ekonomisk rapportering
✅ Underskrifter på plats
[etc...]
VINNARCHANSER: [Realistisk bedömning]
SISTA FÖRBÄTTRINGAR FÖRE INLÄMNING:

[Högst prioriterad ändring]
[Näst högst prioriterad]
[Tredje högst prioriterad]

Er rapport är [kvalitativ bedömning]. Med de ändringar jag föreslår har ni [realistisk chans]. Lycka till! 🚀

## Teknisk implementation-guide

När du används i Aceverse kommer du:

1. **Ta emot context** via meddelanden:
   - Företagsdata från UF-Kompassen
   - Tidigare sparade utkast från window.storage
   - Tävlingskriterier från dokumentation

2. **Analysera input** från användaren:
   - Textinput från sektionseditor
   - Strukturerad data från formulär
   - Ekonomiska siffror från CRM

3. **Returnera strukturerad output**:
\`\`\`json
{
  "rating": {
    "overall": 7.5,
    "detailed": {
      "content": 8,
      "narrative": 7,
      "professionalism": 8,
      "criteria": 7
    }
  },
  "feedback": {
    "strengths": ["...", "...", "..."],
    "improvements": ["...", "...", "..."],
    "juryPerspective": "...",
    "priorityAction": "..."
  },
  "suggestions": {
    "questions": ["...", "..."],
    "examples": ["..."],
    "nextSteps": ["..."]
  }
}
\`\`\`

4. **Spara analys** för tracking:
   - Versionshistorik av ratings
   - Progress över tid
   - Återkommande feedback-teman

---

Din mission: Hjälpa varje UF-företagare skapa den bästa möjliga rapporten genom att vara en expert-coach som vägleder, utmanar och inspirerar - aldrig tar över, men alltid finns där med rätt stöd vid rätt tidpunkt.`;

// ---------------------- COMPONENT ----------------------

const ReportBuilder: React.FC<ReportBuilderProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    
    // Views: 'list' -> 'overview' (Main Dashboard) -> 'detail' (Modal)
    const [view, setView] = useState<'list' | 'overview'>('list');
    const [projects, setProjects] = useState<FullReportProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Active State
    const [activeProject, setActiveProject] = useState<FullReportProject | null>(null);
    const [detailSection, setDetailSection] = useState<ReportSectionType | null>(null); // For Modal
    
    // Creation / Import
    const [newReportTitle, setNewReportTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // UI
    const [projectToDelete, setProjectToDelete] = useState<FullReportProject | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProjects();
    }, [user.id, activeWorkspace?.id, viewScope]);

    const cleanJson = (text: string) => {
        let clean = text.trim();
        if (clean.startsWith('```json')) clean = clean.replace('```json', '').replace('```', '');
        if (clean.startsWith('```')) clean = clean.replace('```', '').replace('```', '');
        return clean.trim();
    };

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            const rawProjects = data.fullReports || [];
            
            const filtered = rawProjects.filter(p => {
                const itemId = p.workspace_id;
                if (viewScope === 'personal') return !itemId;
                return activeWorkspace?.id && itemId === activeWorkspace.id;
            });

            setProjects(filtered);
        } catch (e) {
            console.error("Failed to load reports", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReportTitle.trim()) return;

        // Create blank skeleton
        const emptySections: Record<ReportSectionType, ReportSectionData> = {
            intro: { id: 'intro', title: 'Introduktion & Info', content: '', status: 'empty' },
            ceo_words: { id: 'ceo_words', title: 'VD-ordet', content: '', status: 'empty' },
            business_idea: { id: 'business_idea', title: 'Affärsidé', content: '', status: 'empty' },
            execution: { id: 'execution', title: 'Genomförande', content: '', status: 'empty' },
            financials: { id: 'financials', title: 'Ekonomisk Analys', content: '', status: 'empty' },
            learnings: { id: 'learnings', title: 'Lärdomar', content: '', status: 'empty' },
            future: { id: 'future', title: 'Framtid/Avveckling', content: '', status: 'empty' },
            signatures: { id: 'signatures', title: 'Underskrifter', content: '', status: 'empty' }
        };

        const newProject: Partial<FullReportProject> = {
            user_id: user.id,
            company_name: newReportTitle,
            workspace_id: viewScope === 'workspace' ? activeWorkspace?.id : undefined,
            sections: emptySections,
            financials: { revenue: 0, costs: 0, result: 0, equity: 0, debt: 0 }
        };

        try {
            const saved = await db.saveFullReportProject(user.id, newProject);
            setProjects([saved, ...projects]);
            openProject(saved);
            setShowCreateModal(false);
            setNewReportTitle('');
        } catch (e) {
            alert("Kunde inte skapa rapporten.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsAnalyzing(true);
        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                // Using gemini-2.0-flash-exp for robust multimodal (PDF) support
                // We request extended JSON for deeper feedback
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash-exp', 
                    contents: [
                        {
                            inlineData: {
                                mimeType: file.type,
                                data: base64Data
                            }
                        },
                        { text: `
                            Agera utifrån din systeminstruktion ("UF Företagsrapport Coach").
                            
                            Ditt uppdrag nu: Analysera hela den bifogade PDF-filen.
                            
                            VIKTIGT: Svara på SVENSKA i alla textfält.
                            
                            VIKTIGT TEKNISKT KRAV FÖR FRONTEND:
                            Du MÅSTE returnera resultatet som valid JSON som matchar följande struktur exakt, så att appen kan visa det:
                            
                            {
                              "financials": { "revenue": 0, "costs": 0, "result": 0, "equity": 0, "debt": 0 },
                              "sections": {
                                "intro": { 
                                    "content": "...", 
                                    "score": 1-10, 
                                    "feedback": { 
                                        "analysis": "Huvudanalys av sektionen (2-3 meningar)",
                                        "jury_perspective": "Hur en jury skulle reagera",
                                        "strengths": ["Punkt 1", "Punkt 2"], 
                                        "weaknesses": ["Punkt 1", "Punkt 2"], 
                                        "tips": ["Kort tips"],
                                        "concrete_examples": ["Skriv så här istället: ..."] 
                                    } 
                                },
                                "ceo_words": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "business_idea": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "execution": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "financials": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "learnings": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "future": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } },
                                "signatures": { "content": "...", "score": 1-10, "feedback": { "analysis": "...", "jury_perspective": "...", "strengths": [], "weaknesses": [], "tips": [], "concrete_examples": [] } }
                              }
                            }
                            
                            För varje sektion: 
                            1. Extrahera texten ("content").
                            2. Sätt betyg 1-10 baserat på dina kriterier ("score").
                            3. Ge djupgående feedback i alla fält (på svenska).
                        ` }
                    ],
                    config: { 
                        systemInstruction: ANALYZER_SYSTEM_PROMPT,
                        responseMimeType: 'application/json' 
                    }
                });

                const result = JSON.parse(cleanJson(response.text || '{}'));
                
                // Merge results into project
                const updatedSections = { ...activeProject.sections };
                
                if (result.sections) {
                    Object.keys(result.sections).forEach(key => {
                        const k = key as ReportSectionType;
                        const incoming = result.sections[k];
                        if (updatedSections[k]) {
                            updatedSections[k].content = incoming.content || '';
                            updatedSections[k].score = incoming.score || 0;
                            updatedSections[k].status = (incoming.score > 0) ? 'complete' : 'empty';
                            updatedSections[k].feedback = {
                                analysis: incoming.feedback?.analysis || 'Ingen analys tillgänglig.',
                                jury_perspective: incoming.feedback?.jury_perspective || 'Jury-perspektiv saknas.',
                                strengths: incoming.feedback?.strengths || incoming.strengths || [],
                                weaknesses: incoming.feedback?.weaknesses || incoming.weaknesses || [],
                                tips: incoming.feedback?.tips || incoming.tips || [],
                                concrete_examples: incoming.feedback?.concrete_examples || []
                            };
                        }
                    });
                }

                const updatedFinancials = result.financials || activeProject.financials;

                const newProjectState = { 
                    ...activeProject, 
                    sections: updatedSections,
                    financials: updatedFinancials
                };

                await db.saveFullReportProject(user.id, newProjectState);
                setActiveProject(newProjectState);
                alert("Analysen är klar! Klicka på sektionerna för att se juryns feedback.");
            };
        } catch (err) {
            console.error(err);
            alert("Kunde inte analysera filen. Se till att det är en PDF eller bild.");
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        try {
            await db.deleteFullReportProject(user.id, projectToDelete.id);
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setProjectToDelete(null);
        } catch (e) {
            alert("Kunde inte radera rapporten.");
        }
    };

    const openProject = (project: FullReportProject) => {
        setActiveProject(project);
        setView('overview'); 
    };

    const calculateAverageScore = () => {
        if (!activeProject) return 0;
        const sections = Object.values(activeProject.sections) as ReportSectionData[];
        const scoredSections = sections.filter((s) => s.score !== undefined && s.score > 0);
        if (scoredSections.length === 0) return 0;
        const sum = scoredSections.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return Math.round((sum / scoredSections.length) * 10) / 10;
    };

    // --- RENDER HELPERS ---

    const renderProjectList = () => (
        <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
            <DeleteConfirmModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDelete} itemName={projectToDelete?.company_name || ''} />
            
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6 text-gray-900 dark:text-white">Ny Rapportanalys</h2>
                        <form onSubmit={handleCreateReport}>
                            <input 
                                autoFocus
                                value={newReportTitle}
                                onChange={(e) => setNewReportTitle(e.target.value)}
                                placeholder="Företagsnamn (t.ex. EcoWear UF)"
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all mb-4"
                            />
                            <button 
                                type="submit"
                                disabled={isLoading || !newReportTitle.trim()}
                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Starta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="font-serif-display text-5xl text-gray-900 dark:text-white mb-2">Report Studio</h1>
                    <p className="text-gray-500 dark:text-gray-400">Ladda upp din årsredovisning och få SM-mässig feedback direkt.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                    <Plus size={18} /> Ny Rapport
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div key={p.id} onClick={() => openProject(p)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 cursor-pointer hover:shadow-2xl transition-all group relative flex flex-col justify-between min-h-[240px]">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Analys</span>
                                <button onClick={(e) => { e.stopPropagation(); setProjectToDelete(p); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <h3 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">{p.company_name}</h3>
                            <p className="text-xs text-gray-400 mb-8 flex items-center gap-2"><Calendar size={12}/> Ändrad {new Date(p.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold">{Object.values(p.sections).filter((s:any) => s.status === 'complete').length}</div>
                                <span className="text-[10px] text-gray-400 font-medium">Delar analyserade</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowRight size={14} /></div>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem]">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Inga rapporter analyserade än.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderEditor = () => {
        if (!activeProject) return null;
        
        // --- TEXT EDITOR MODE (if we decide to use it in future, kept for reference/fallback) ---
        // For now, based on user context, we primarily use the PDF Overview mode if 'view' is 'overview'.
        // But let's assume 'renderEditor' is for the manual editing experience if triggered.
        // Re-using the logic from previous turn for safety.
        
        const currentSectionData = activeProject.sections['intro']; // Placeholder default

        return (
            <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden animate-fadeIn">
                {/* Simplified placeholder if needed, otherwise rely on renderOverview */}
            </div>
        );
    };

    const renderOverview = () => {
        if (!activeProject) return null;
        const score = calculateAverageScore();
        const activeDetail = detailSection ? activeProject.sections[detailSection] : null;

        return (
            <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen relative">
                
                {/* --- THINKING OVERLAY --- */}
                {isAnalyzing && (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-md animate-fadeIn">
                       <div className="w-24 h-24 relative mb-8">
                          {/* Fancy Spinner */}
                          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-black dark:border-white rounded-full border-t-transparent animate-spin"></div>
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white animate-pulse" />
                       </div>
                       <h2 className="font-serif-display text-3xl mb-2 text-gray-900 dark:text-white animate-pulse">UF-Coachen analyserar...</h2>
                       <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-widest">Granskar mot SM-kriterier</p>
                    </div>
                )}

                {/* --- DEEP DIVE MODAL --- */}
                {detailSection && activeDetail && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-[2rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl animate-slideUp">
                            <button onClick={() => setDetailSection(null)} className="absolute top-6 right-6 z-20 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                            
                            {/* Left: Content Preview */}
                            <div className="md:w-5/12 bg-gray-50 dark:bg-gray-950 p-8 md:p-12 overflow-y-auto custom-scrollbar border-r border-gray-200 dark:border-gray-800">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Textinnehåll</span>
                                <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-8">{activeDetail.title}</h2>
                                {activeDetail.content ? (
                                    <div className="prose dark:prose-invert text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-serif">
                                        {activeDetail.content}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-400 italic">
                                        Ingen text identifierad för denna sektion.
                                    </div>
                                )}
                            </div>

                            {/* Right: AI Deep Analysis */}
                            <div className="md:w-7/12 bg-white dark:bg-gray-900 flex flex-col h-full overflow-hidden">
                                
                                {/* Header / Score Area */}
                                <div className="p-8 md:p-10 border-b border-gray-100 dark:border-gray-800 flex items-center gap-6 bg-gray-50/50 dark:bg-gray-900">
                                    <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center text-3xl font-bold text-white shadow-xl ${
                                        (activeDetail.score || 0) > 8 ? 'bg-green-500 shadow-green-500/30' : (activeDetail.score || 0) > 5 ? 'bg-yellow-500 shadow-yellow-500/30' : 'bg-red-500 shadow-red-500/30'
                                    }`}>
                                        {activeDetail.score || '-'}<span className="text-[10px] opacity-70 font-medium">POÄNG</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">Juryns Omdöme</h3>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {activeDetail.score && activeDetail.score > 8 ? 'SM-Guld Nivå 🏆' : activeDetail.score && activeDetail.score > 5 ? 'Godkänd nivå' : 'Kräver arbete'}
                                        </p>
                                    </div>
                                </div>

                                {/* Scrollable Feedback Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-10">
                                    
                                    {activeDetail.feedback ? (
                                        <>
                                            {/* Main Analysis Block */}
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                                    <Sparkles size={14} className="text-purple-500"/> Coachens Analys
                                                </h4>
                                                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                                    {activeDetail.feedback.analysis}
                                                </p>
                                            </div>

                                            {/* Jury Perspective Block */}
                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                                                    <UserCheck size={14}/> Juryns Perspektiv
                                                </h4>
                                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed italic">
                                                    "{activeDetail.feedback.jury_perspective}"
                                                </p>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                {/* Strengths */}
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-green-600 mb-4 flex items-center gap-2">
                                                        <CheckCircle2 size={14}/> Styrkor
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {activeDetail.feedback.strengths.map((s, i) => (
                                                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 items-start">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div>
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Weaknesses / Improvements */}
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                                        <AlertTriangle size={14}/> Utvecklingsområden
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {activeDetail.feedback.weaknesses.map((s, i) => (
                                                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 items-start">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Concrete Examples - The "Gold Dust" */}
                                            {activeDetail.feedback.concrete_examples && activeDetail.feedback.concrete_examples.length > 0 && (
                                                <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                                        <PenTool size={14}/> Konkreta Förslag
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {activeDetail.feedback.concrete_examples.map((ex, i) => (
                                                            <div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                                                <Lightbulb size={20} className="text-yellow-500 shrink-0 mt-1" />
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 italic font-medium leading-relaxed">
                                                                    {ex}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                            <FileText size={48} className="opacity-20"/>
                                            <p>Ladda upp PDF för att få analys.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button onClick={() => setView('list')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={14} /> Alla Rapporter
                </button>

                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="font-serif-display text-5xl text-gray-900 dark:text-white mb-2">{activeProject.company_name}</h1>
                        <p className="text-gray-500 dark:text-gray-400">Analys & Kvalitetskontroll</p>
                    </div>
                    <div className="flex gap-3">
                        <input 
                            type="file" 
                            accept="application/pdf"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-3 shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:transform-none"
                        >
                            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isAnalyzing ? 'Analyserar...' : 'Ladda upp PDF'}
                        </button>
                    </div>
                </div>

                {/* --- SCORE CARDS --- */}
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                    <div className="col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Kvalitet</span>
                            <span className="text-6xl font-serif-display text-gray-900 dark:text-white">{score}<span className="text-lg text-gray-300 font-sans font-medium">/10</span></span>
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-gray-800 flex items-center justify-center">
                            <Sparkles size={32} className={score > 8 ? "text-green-500" : score > 5 ? "text-yellow-500" : "text-gray-300"} />
                        </div>
                    </div>
                    
                    <div className="col-span-2 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">AI-Status</span>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 relative z-10">
                            {isAnalyzing 
                                ? "Läser igenom dokumentet..." 
                                : score === 0 
                                    ? "Ingen data. Ladda upp din PDF för att starta." 
                                    : "Analys genomförd. Klicka på sektionerna nedan för detaljer."
                            }
                        </p>
                    </div>
                </div>

                {/* --- SECTIONS GRID --- */}
                <h3 className="font-serif-display text-2xl mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                    Rapportens Delar <span className="text-sm font-sans font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">Klicka för insikt</span>
                </h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
                    {Object.values(activeProject.sections).map((sec: any) => (
                        <div 
                            key={sec.id} 
                            onClick={() => setDetailSection(sec.id)} 
                            className={`p-6 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between h-56 group relative overflow-hidden ${
                                sec.score > 8 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900' 
                                : sec.score > 5 
                                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900' 
                                    : sec.status === 'empty' 
                                        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100' 
                                        : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900'
                            }`}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                                    sec.score > 0 ? 'bg-white dark:bg-black text-black dark:text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                                }`}>
                                    {sec.id === 'financials' ? <BarChart3 size={16}/> : <FileText size={16}/>}
                                </div>
                                {sec.score > 0 && <span className="text-2xl font-serif-display font-bold">{sec.score}</span>}
                            </div>
                            
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:underline decoration-1 underline-offset-4">{sec.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    {sec.status === 'empty' ? 'Ej hittad' : 'Analyserad'} 
                                    {sec.status !== 'empty' && <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />}
                                </div>
                            </div>

                            {/* Hover Effect Background */}
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const renderEditorView = () => {
        if (!activeProject) return null;
        const currentSectionData = activeProject.sections['intro']; // Fallback/Test

        return (
            <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden animate-fadeIn">
                {/* SIDEBAR NAVIGATION */}
                <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                        <button onClick={() => setActiveProject(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"><ArrowLeft size={18}/></button>
                        <h2 className="font-bold text-sm truncate">{activeProject.company_name}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {Object.values(activeProject.sections).map((sec: any) => (
                            <button
                                key={sec.id}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800`}
                            >
                                {sec.title}
                                {sec.status === 'complete' && <CheckCircle2 size={14} className="text-green-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EDITOR AREA */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8">
                        <h1 className="font-serif-display text-xl text-gray-900 dark:text-white">{currentSectionData.title}</h1>
                        <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all">
                            <Sparkles size={14}/> AI-Coach
                        </button>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            <div className="max-w-3xl mx-auto h-full flex flex-col">
                                <textarea
                                    placeholder={`Skriv ditt innehåll för ${currentSectionData.title} här...`}
                                    className="flex-1 w-full bg-transparent border-none outline-none text-lg leading-relaxed text-gray-800 dark:text-gray-200 placeholder:text-gray-300 resize-none font-medium"
                                />
                            </div>
                        </div>

                        {/* AI FEEDBACK PANEL */}
                        {currentSectionData.feedback && (
                            <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto custom-scrollbar p-6 shadow-xl">
                                <div className="mb-6 flex items-center gap-2 text-purple-600">
                                    <UserCheck size={20}/>
                                    <span className="text-xs font-black uppercase tracking-widest">Coachens Respons</span>
                                </div>
                                <div className="prose prose-sm dark:prose-invert">
                                    <div className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                        {currentSectionData.feedback.analysis}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            {activeProject ? (view === 'overview' ? renderOverview() : renderEditorView()) : renderProjectList()}
        </div>
    );
};

export default ReportBuilder;