
import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, Lock, Eye, CheckCircle2, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from './RevealOnScroll';

const Security: React.FC = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [beamProgress, setBeamProgress] = useState(0);
  const [exploded, setExploded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Sequence:
          // 1. Wait 200ms
          // 2. Explode (200ms duration)
          // 3. Start Beam (after explosion)
          
          setTimeout(() => {
            setExploded(true);
            
            // Start beam growth after explosion clears
            setTimeout(() => {
                setBeamProgress(100);
            }, 300);
            
          }, 200);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const items = [
    {
      id: 1,
      title: t('securityComponent.certs.gdpr.title'),
      description: t('securityComponent.certs.gdpr.desc'),
      renderVisual: () => (
        <div className="relative w-full h-64 md:h-80 bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center perspective-1000 group hover:border-black/10 dark:hover:border-white/10 transition-colors">
           {/* Abstract Identity Card */}
           <div className="relative w-40 h-56 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col p-5 transform rotate-y-12 rotate-x-6 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-105">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 self-center"></div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded mb-3"></div>
                <div className="w-2/3 h-3 bg-gray-50 dark:bg-gray-700/50 rounded mb-8"></div>
                <div className="mt-auto flex justify-between items-center">
                    <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-lg">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="w-12 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
                </div>
                
                {/* Scanning Beam */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 dark:via-white/5 to-transparent h-[20%] w-full animate-scan pointer-events-none"></div>
           </div>
        </div>
      )
    },
    {
      id: 2,
      title: t('securityComponent.certs.school.title'),
      description: t('securityComponent.certs.school.desc'),
      renderVisual: () => (
        <div className="relative w-full h-64 md:h-80 bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center perspective-1000 group hover:border-black/10 dark:hover:border-white/10 transition-colors">
            {/* The Safe Apple/Education Core */}
            <div className="relative w-32 h-32 preserve-3d animate-float">
                 {/* Protection Rings */}
                 <div className="absolute inset-[-30%] border-[2px] border-gray-200 dark:border-gray-700 rounded-full animate-[spin_10s_linear_infinite] [transform:rotateX(70deg)]"></div>
                 <div className="absolute inset-[-50%] border-[2px] border-gray-100 dark:border-gray-800 rounded-full animate-[spin_15s_linear_infinite_reverse] [transform:rotateY(70deg)]"></div>
                 
                 {/* Central Sphere */}
                 <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                     <Globe size={48} className="text-gray-800 dark:text-gray-200" strokeWidth={1} />
                 </div>
                 
                 {/* Floating Shield Badges */}
                 <div className="absolute top-0 right-0 w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xl animate-bounce delay-75 border-2 border-white dark:border-black">
                    <CheckCircle2 size={16} />
                 </div>
            </div>
        </div>
      )
    },
    {
      id: 3,
      title: t('securityComponent.certs.encryption.title'),
      description: t('securityComponent.certs.encryption.desc'),
      renderVisual: () => (
        <div className="relative w-full h-64 md:h-80 bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center perspective-1000 group hover:border-black/10 dark:hover:border-white/10 transition-colors">
            {/* 3D Vault Mechanism */}
            <div className="relative w-48 h-48 preserve-3d flex items-center justify-center">
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border-[16px] border-gray-50 dark:border-gray-800 shadow-inner"></div>
                
                {/* Rotating Lock */}
                <div className="w-28 h-28 rounded-full border-[10px] border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white animate-[spin_3s_ease-in-out_infinite] flex items-center justify-center shadow-lg bg-white dark:bg-gray-900">
                    <Lock size={40} className="text-black dark:text-white" />
                </div>
            </div>
        </div>
      )
    },
    {
      id: 4,
      title: t('securityComponent.certs.ethical.title'),
      description: t('securityComponent.certs.ethical.desc'),
      renderVisual: () => (
        <div className="relative w-full h-64 md:h-80 bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center perspective-1000 group hover:border-black/10 dark:hover:border-white/10 transition-colors">
            {/* The Balance Core */}
            <div className="relative flex flex-col items-center animate-float scale-110">
                {/* Top Balance Bar */}
                <div className="w-40 h-2 bg-gray-800 dark:bg-gray-200 rounded-full mb-10 relative shadow-lg">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-black dark:bg-white rounded-full border-4 border-white dark:border-black shadow-md"></div>
                    
                    {/* Hanging Pans */}
                    <div className="absolute left-1 top-1 h-16 w-[2px] bg-gray-300 dark:bg-gray-600 origin-top animate-[rotate3d_2s_ease-in-out_infinite_alternate] ">
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center translate-y-full">
                             <div className="w-3 h-3 bg-gray-900 dark:bg-gray-100 rounded-full"></div>
                         </div>
                    </div>
                    
                    <div className="absolute right-1 top-1 h-16 w-[2px] bg-gray-300 dark:bg-gray-600 origin-top">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center translate-y-full">
                             <Eye size={20} className="text-gray-400 dark:text-gray-500" />
                         </div>
                    </div>
                </div>
            </div>
        </div>
      )
    }
  ];

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden bg-white dark:bg-black min-h-screen transition-colors duration-300">
      
      {/* 1. Initial Shockwave Explosion */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-screen pointer-events-none z-50 flex items-start pt-[10vh] justify-center transition-opacity duration-500 ${exploded ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* Only show shockwave if section is visible but not yet exploded */}
        {isVisible && !exploded && (
            <div className="relative">
                 {/* Core Flash */}
                 <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-ping absolute top-0 left-1/2 -translate-x-1/2"></div>
                 {/* Expanding Ring */}
                 <div className="w-[200vw] h-[200vw] rounded-full border-[100px] border-white dark:border-black bg-transparent absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_0.6s_cubic-bezier(0,0,0.2,1)_forwards] opacity-50"></div>
                 {/* Whiteout Overlay */}
                 <div className="fixed inset-0 bg-white dark:bg-black animate-[fadeOut_0.5s_ease-out_forwards]"></div>
            </div>
        )}
      </div>

      <div className={`transition-all duration-1000 ${exploded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            {/* Header */}
            <div className="text-center mb-32 max-w-3xl mx-auto">
                <span className="text-sm font-bold tracking-[0.2em] text-black dark:text-white uppercase mb-6 block flex justify-center items-center gap-3">
                    <ShieldCheck size={16} strokeWidth={2.5} /> {t('securityComponent.tag')}
                </span>
                <h2 className="font-serif-display text-5xl md:text-7xl leading-[0.95] text-gray-900 dark:text-white mb-8">
                {t('securityComponent.title')}
                </h2>
                <div className="flex justify-center items-center gap-3">
                    <div className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold tracking-widest flex items-center gap-2 shadow-lg shadow-black/20 dark:shadow-white/10">
                        <CheckCircle2 size={12} />
                        SECURE
                    </div>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative">
                {/* The Central Spine (Track) */}
                <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-1 lg:-translate-x-1/2 z-0">
                     {/* Base Track (Light Gray) */}
                     <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                     
                     {/* The Beam (Dark Matter) */}
                     <div 
                        className="absolute top-0 left-0 w-full bg-black dark:bg-white shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)] rounded-full transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
                        style={{ height: `${beamProgress}%` }}
                     >
                        {/* The Glowing Tip */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-6 bg-white dark:bg-black border-2 border-black dark:border-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10"></div>
                     </div>
                </div>

                <div className="space-y-32 pb-32">
                    {items.map((item, index) => {
                        // Calculate if the beam has passed this item
                        // We have 4 items. rough thresholds: 10%, 35%, 60%, 85%
                        const thresholds = [10, 35, 60, 85];
                        const isActive = beamProgress > thresholds[index];

                        return (
                            <div key={item.id} className={`relative flex flex-col lg:flex-row gap-12 lg:gap-32 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                                
                                {/* Timeline Node (The Station) */}
                                <div className="absolute left-6 lg:left-1/2 top-0 lg:top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                    <div 
                                        className={`w-8 h-8 rounded-full bg-white dark:bg-black border-[3px] transition-all duration-500 flex items-center justify-center ${
                                            isActive 
                                            ? 'border-black dark:border-white scale-110 shadow-xl' 
                                            : 'border-gray-200 dark:border-gray-800 scale-100'
                                        }`}
                                    >
                                        <div className={`w-2.5 h-2.5 bg-black dark:bg-white rounded-full transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="w-full lg:w-1/2 pl-20 lg:pl-0 lg:text-right group">
                                    <div 
                                        className={`transition-all duration-700 ${
                                            isActive 
                                            ? 'opacity-100 translate-y-0' 
                                            : 'opacity-0 translate-y-8'
                                        }`}
                                    >
                                        <div className={`${index % 2 !== 0 ? 'lg:text-left' : ''}`}>
                                            <h3 className="text-4xl font-serif-display mb-5 text-gray-900 dark:text-white">{item.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed max-w-md ml-auto mr-0 lg:mx-0">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 3D Visual */}
                                <div className="w-full lg:w-1/2 pl-16 lg:pl-0">
                                    <div 
                                        className={`transition-all duration-1000 transform ${
                                            isActive 
                                            ? 'opacity-100 scale-100 translate-y-0' 
                                            : 'opacity-0 scale-90 translate-y-12'
                                        }`}
                                        style={{ transitionDelay: '100ms' }}
                                    >
                                        {item.renderVisual()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default Security;
