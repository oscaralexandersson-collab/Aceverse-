
import React from 'react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Hero: React.FC<Partial<PageProps>> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen flex flex-col items-center pt-32 pb-20 bg-white dark:bg-black overflow-hidden transition-colors duration-300">
        
      {/* Background Decor - Focused on depth and minimalist elegance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-full bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-950 dark:to-black -z-20"></div>
      
      {/* Ambient glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50/40 dark:bg-blue-900/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-indigo-50/30 dark:bg-indigo-900/10 rounded-full blur-[100px] -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Hero Content */}
      <div className="container mx-auto px-6 text-center z-10 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-8 animate-[fadeIn_1s_ease-out]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
              The AI Co-Founder for Next-Gen Founders
            </span>
          </div>

          <h1 className="font-serif-display text-7xl md:text-9xl leading-[0.95] text-gray-900 dark:text-white tracking-tighter mb-8 animate-[slideUp_0.8s_ease-out_forwards]">
            Aceverse
          </h1>
          
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-sans font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 max-w-4xl mx-auto mb-12 animate-[slideUp_0.8s_ease-out_0.2s_forwards] opacity-0 leading-[1.1]">
            Entrepreneurial Intelligence <br className="hidden md:block" /> at your fingertips
          </h2>

          <div className="flex flex-col md:flex-row justify-center items-center gap-6 animate-[slideUp_0.8s_ease-out_0.4s_forwards] opacity-0">
              <button 
                  onClick={() => onNavigate && onNavigate('login')}
                  className="group relative bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-bold text-lg transition-all shadow-2xl hover:scale-[1.02] active:scale-95 overflow-hidden"
              >
                  <span className="relative z-10 flex items-center gap-2">
                    Kom igång gratis
                  </span>
              </button>
              <button 
                  onClick={() => {
                      const el = document.getElementById('features');
                      el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-500 dark:text-gray-400 font-bold text-lg hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
              >
                  Upptäck plattformen
                  <ArrowRight size={20} className="mt-0.5" />
              </button>
          </div>
      </div>

      {/* Hero Image - Styled as a floating terminal/dashboard */}
      <div className="container mx-auto px-4 relative z-10 animate-[dashboard-tilt_1.5s_cubic-bezier(0.2,0.8,0.2,1)_0.6s_forwards] opacity-0 transform translate-y-24 pb-20">
        <div className="relative max-w-6xl mx-auto rounded-[2rem] border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
            <img 
                src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Untitled-1%20-%2010-12-2025%2020-30-02-2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvVW50aXRsZWQtMSAtIDEwLTEyLTIwMjUgMjAtMzAtMDItMi5wbmciLCJpYXQiOjE3NjUzOTczNTAsImV4cCI6MTc5NjkzMzM1MH0.KbLYFn1vLK3xuHFvnt3wA-SgONizm_sE84aXFelL6Z8" 
                alt="Aceverse Dashboard på Laptop" 
                className="w-full h-auto rounded-[1.5rem] grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
            />
            {/* Visual Flare */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
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
