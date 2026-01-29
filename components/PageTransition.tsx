
import React, { useEffect, useState } from 'react';

interface Props {
  stage: 'idle' | 'in' | 'out';
}

const PageTransition: React.FC<Props> = ({ stage }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (stage !== 'idle') {
      setShouldRender(true);
    } else {
      const t = setTimeout(() => setShouldRender(false), 50);
      return () => clearTimeout(t);
    }
  }, [stage]);

  if (!shouldRender && stage === 'idle') return null;

  const getTransform = () => {
    switch (stage) {
      case 'idle': return 'translateY(100%)';
      case 'in': return 'translateY(0%)';
      case 'out': return 'translateY(-100%)';
    }
  };

  const getTransition = () => {
    if (stage === 'idle') return 'none';
    return 'transform 1000ms cubic-bezier(0.85, 0, 0.15, 1)';
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col pointer-events-auto"
      style={{ 
        transform: getTransform(),
        transition: getTransition()
      }}
    >
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Subtle texture/noise - kept low opacity for texture */}
        <div className="absolute inset-0 opacity-[0.15] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        {/* Ambient Storm Background - MONOCHROME */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Changed from blue/indigo to white/gray for strict black & white theme */}
            <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] bg-zinc-800/10 blur-[150px] rounded-full animate-storm-flash"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-white/5 blur-[120px] rounded-full animate-storm-flash" style={{ animationDelay: '2s' }}></div>

            <svg className="absolute inset-0 w-full h-full opacity-40">
                <defs>
                    <filter id="boltGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <path 
                    d="M 400 0 L 450 200 L 410 250 L 550 500" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1.5"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    className="animate-bolt-strike"
                    style={{ filter: 'url(#boltGlow)', transform: 'translateX(10vw)' }}
                />
                
                <path 
                    d="M 900 100 L 820 300 L 880 350 L 750 600" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    className="animate-bolt-strike"
                    style={{ animationDelay: '0.8s', filter: 'url(#boltGlow)', transform: 'translateX(-15vw)' }}
                />
            </svg>
        </div>

        {/* Content Container */}
        <div className={`relative z-10 flex flex-col items-center justify-center text-center px-12 transition-all duration-1000 ${stage === 'in' ? 'opacity-100 scale-100 translate-y-0 delay-200' : 'opacity-0 scale-95 translate-y-4'}`}>
            
            {/* The Slogan - Pure White Text */}
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-sans font-semibold tracking-tight text-white max-w-4xl mx-auto mb-16 leading-[1.1]">
              Entrepreneurial Intelligence <br className="hidden md:block" /> at your fingertips
            </h2>

            {/* Hybrid Signature: Sharp 'A' + Pacifico 'ceverse' + Underline Strike */}
            <div className="relative mt-4 group">
                <svg width="460" height="180" viewBox="0 0 460 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white opacity-100 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                    <style>
                        {`
                        .signature-path {
                            stroke-dasharray: 1000;
                            stroke-dashoffset: 1000;
                            animation: drawFast 0.55s cubic-bezier(0.45, 0, 0.55, 1) forwards;
                        }
                        .text-ceverse-solid {
                            font-family: 'Pacifico', cursive;
                            font-size: 58px;
                            fill: currentColor;
                            opacity: 0;
                            animation: fadeInQuick 0.35s ease-out forwards 0.2s;
                        }
                        @keyframes drawFast {
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes fadeInQuick {
                            from { opacity: 0; transform: translateX(-8px); }
                            to { opacity: 1; transform: translateX(0); }
                        }
                        `}
                    </style>
                    
                    {/* The iconic sharp 'A' */}
                    <path 
                        d="M45 130 L105 20 L135 130 
                           M35 95 C65 95 110 80 145 75" 
                        stroke="currentColor" 
                        strokeWidth="2.8" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="signature-path" 
                        style={{ animationDelay: '0.05s' }}
                    />
                    
                    {/* 'ceverse' in Pacifico font, positioned for perfect flow */}
                    <text x="135" y="105" className="text-ceverse-solid">ceverse</text>
                    
                    {/* Signature strike starting from the 'A' cross-section and sweeping UNDER the text */}
                    <path 
                        d="M100 95 C 130 145, 300 135, 435 105" 
                        stroke="currentColor" 
                        strokeWidth="2.4" 
                        strokeLinecap="round" 
                        className="signature-path" 
                        style={{ animationDelay: '0.4s', animationDuration: '0.45s' }} 
                    />
                    
                    {/* The final characteristic dot at the end of the swipe */}
                    <circle 
                        cx="443" 
                        cy="104" 
                        r="3.8" 
                        fill="currentColor" 
                        className="animate-[fadeIn_0.15s_ease-out_forwards]" 
                        style={{ opacity: 0, animationDelay: '0.8s' }} 
                    />
                    
                    {/* Branding Tag */}
                    <text x="230" y="165" textAnchor="middle" fill="currentColor" fillOpacity="0.3" fontSize="10" fontWeight="bold" letterSpacing="0.7em" className="font-sans uppercase animate-[fadeIn_0.5s_ease-out_forwards]" style={{ opacity: 0, animationDelay: '0.95s' }}>A C E V E R S E</text>
                </svg>
            </div>
            
            {/* Minimal Progress indicator - White */}
            <div className="mt-20 w-48 h-[1px] bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-[loadingBar_2s_ease-in-out_infinite]"></div>
            </div>
        </div>

        {/* Edge Mask */}
        <div className="absolute top-0 left-0 w-full -translate-y-[99%] text-black pointer-events-none">
             <svg viewBox="0 0 1440 320" className="w-full h-32 md:h-64 transform rotate-180">
                <path fill="currentColor" fillOpacity="1" d="M0,224L120,200C240,176,480,128,720,128C960,128,1200,176,1320,200L1440,224L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
             </svg>
        </div>
      </div>
    </div>
  );
};

export default PageTransition;
