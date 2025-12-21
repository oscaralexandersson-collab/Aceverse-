
import React from 'react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Hero: React.FC<Partial<PageProps>> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen flex flex-col items-center pt-32 pb-20 bg-white dark:bg-black overflow-hidden transition-colors duration-300">
        
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-full bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/50 dark:to-black -z-20"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-100/30 dark:bg-purple-900/20 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/20 dark:bg-blue-900/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

      {/* Header Content */}
      <div className="container mx-auto px-6 text-center z-10 mb-16">
          <h1 className="font-serif-display text-6xl md:text-8xl lg:text-9xl leading-[0.95] text-gray-900 dark:text-white tracking-tight mb-8 animate-[slideUp_0.8s_ease-out_forwards]">
            Aceverse
          </h1>
          <p className="text-xl md:text-3xl text-gray-600 dark:text-gray-300 font-light max-w-3xl mx-auto mb-10 animate-[slideUp_0.8s_ease-out_0.2s_forwards] opacity-0 leading-relaxed">
              Plattformen där innovation möter morgondagens entreprenörer.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4 animate-[slideUp_0.8s_ease-out_0.4s_forwards] opacity-0">
              <button 
                  onClick={() => onNavigate && onNavigate('login')}
                  className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-medium text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                  Kom igång gratis
              </button>
              <button 
                  onClick={() => {
                      const el = document.getElementById('features');
                      el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white dark:bg-black text-black dark:text-white border border-gray-200 dark:border-gray-800 px-10 py-4 rounded-full font-medium text-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              >
                  Läs mer
              </button>
          </div>
      </div>

      {/* Hero Image Container */}
      <div className="container mx-auto px-4 relative z-10 animate-[slideUp_1s_ease-out_0.6s_forwards] opacity-0 transform translate-y-12 pb-12">
        <img 
            src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Untitled-1%20-%2010-12-2025%2020-30-02-2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvVW50aXRsZWQtMSAtIDEwLTEyLTIwMjUgMjAtMzAtMDItMi5wbmciLCJpYXQiOjE3NjUzOTczNTAsImV4cCI6MTc5NjkzMzM1MH0.KbLYFn1vLK3xuHFvnt3wA-SgONizm_sE84aXFelL6Z8" 
            alt="Aceverse Dashboard på Laptop" 
            className="w-full max-w-5xl mx-auto h-auto drop-shadow-2xl rounded-xl border border-gray-200 dark:border-gray-800"
        />
      </div>

    </div>
  );
};

export default Hero;
