
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
      // Delay unmounting slightly to ensure animation finishes if strictly managed
      const t = setTimeout(() => setShouldRender(false), 50);
      return () => clearTimeout(t);
    }
  }, [stage]);

  if (!shouldRender && stage === 'idle') return null;

  // Configuration for the wipe animation
  const getTransform = () => {
    switch (stage) {
      case 'idle': return 'translateY(100%)'; // Ready at bottom
      case 'in': return 'translateY(0%)';     // Move to cover screen
      case 'out': return 'translateY(-100%)'; // Move away to top
    }
  };

  const getTransition = () => {
    if (stage === 'idle') return 'none'; // No transition when resetting
    return 'transform 600ms cubic-bezier(0.87, 0, 0.13, 1)'; // Snappier 600ms duration
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col pointer-events-auto"
      style={{ 
        transform: getTransform(),
        transition: getTransition()
      }}
    >
      {/* Main Black Layer */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Subtle texture/noise */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        {/* --- Lightning / Storm Background --- */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Ambient Storm Flashes (Clouds lighting up) */}
            <div className="absolute top-[-50%] left-[-20%] w-[100vw] h-[100vw] bg-blue-100/10 blur-[150px] rounded-full animate-storm-flash"></div>
            <div className="absolute bottom-[-30%] right-[-10%] w-[80vw] h-[80vw] bg-white/5 blur-[120px] rounded-full animate-storm-flash" style={{ animationDelay: '1.5s' }}></div>

            {/* Electric Bolts (SVG) */}
            <svg className="absolute inset-0 w-full h-full opacity-60">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Bolt 1 */}
                <path 
                    d="M 300 0 L 400 300 L 350 350 L 500 600" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    className="animate-bolt-strike"
                    style={{ filter: 'url(#glow)', transform: 'translateX(20vw)' }}
                />
                
                {/* Bolt 2 (Smaller, faster) */}
                <path 
                    d="M 800 100 L 750 250 L 820 300 L 700 500" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    className="animate-bolt-strike"
                    style={{ animationDelay: '0.3s', filter: 'url(#glow)', transform: 'translateX(-10vw)' }}
                />
            </svg>
        </div>

        {/* Content Container */}
        <div className={`relative z-10 flex flex-col items-center justify-center transition-opacity duration-500 ${stage === 'in' ? 'opacity-100 delay-300' : 'opacity-0'}`}>
            
            {/* Massive Brand Text */}
            <h1 className="font-serif-display text-[12vw] md:text-[15vw] leading-none text-white font-bold tracking-tighter select-none mix-blend-overlay">
                ACEVERSE
            </h1>
            
            {/* Minimal Loading Bar */}
            <div className="mt-8 w-64 h-[2px] bg-white/10 overflow-hidden">
                <div className="h-full bg-white animate-[loadingBar_1.5s_ease-in-out_infinite]"></div>
            </div>
        </div>

        {/* Decorative Curved Edge (SVG) at the top for smoother feel when entering */}
        <div className="absolute top-0 left-0 w-full -translate-y-[98%] text-black pointer-events-none">
             <svg viewBox="0 0 1440 320" className="w-full h-24 md:h-48 transform rotate-180">
                <path fill="currentColor" fillOpacity="1" d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,213.3C1120,224,1280,224,1360,224L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
             </svg>
        </div>
      </div>
    </div>
  );
};

export default PageTransition;
