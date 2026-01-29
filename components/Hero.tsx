
import React from 'react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Hero: React.FC<Partial<PageProps>> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black overflow-hidden transition-colors duration-300">
        
      {/* Background - Minimalist Noise/Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 dark:opacity-10 pointer-events-none"></div>
      
      {/* Hero Content */}
      <div className="container mx-auto px-6 text-center z-10 relative">
          
          <div className="animate-[slideUp_0.8s_ease-out_forwards]">
            {/* Main Title - Elegant & Sharp (Removed font-black) */}
            <h1 className="font-serif-display text-[15vw] md:text-[13vw] leading-[0.8] text-black dark:text-white tracking-tighter select-none cursor-default mb-6">
                ACEVERSE
            </h1>
            
            {/* Slogan - Thicker with Fade/Shimmer Effect */}
            <div className="max-w-4xl mx-auto overflow-hidden">
                <p className="text-2xl md:text-4xl font-bold tracking-tight animate-slideInRight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-400 via-black to-gray-400 dark:from-gray-600 dark:via-white dark:to-gray-600 animate-shimmer bg-[length:200%_auto]">
                        Entrepreneurial Intelligence at your fingertips.
                    </span>
                </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-16 animate-[slideUp_0.8s_ease-out_0.3s_forwards] opacity-0">
              <button 
                  onClick={() => onNavigate && onNavigate('login')}
                  className="group relative bg-black dark:bg-white text-white dark:text-black px-12 py-5 rounded-full font-bold text-lg transition-all shadow-xl hover:scale-105 active:scale-95 overflow-hidden border-2 border-transparent hover:border-black dark:hover:border-white"
              >
                  <span className="relative z-10 flex items-center gap-2">
                    Starta Resan
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </span>
              </button>
              <button 
                  onClick={() => {
                      const el = document.getElementById('features');
                      el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-10 py-5 rounded-full font-bold text-lg border-2 border-gray-200 dark:border-white/10 hover:border-black dark:hover:border-white text-black dark:text-white transition-all bg-white/50 backdrop-blur-sm"
              >
                  Utforska Plattformen
              </button>
          </div>
      </div>
    </div>
  );
};

// Internal icon for the button
const ArrowRight = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
);

export default Hero;
