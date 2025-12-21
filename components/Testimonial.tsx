
import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from './RevealOnScroll';

const Testimonial: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { t } = useLanguage();

  const togglePlay = () => {
    if (!isPlaying) {
      alert(t('testimonial.demoAlert'));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <section className="bg-beige-200 dark:bg-gray-900 py-24 md:py-32 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <RevealOnScroll>
          <div>
            <span className="text-6xl font-serif-display text-black dark:text-white block mb-6">”</span>
            <h2 className="font-serif-display text-4xl md:text-5xl leading-tight mb-12 text-gray-900 dark:text-gray-100">
              {t('testimonial.quote')}
            </h2>
            
            <div className="border-l-2 border-black dark:border-white pl-6">
              <p className="font-bold text-lg text-gray-900 dark:text-white">{t('testimonial.author')}</p>
              <p className="text-gray-600 dark:text-gray-400">{t('testimonial.role')}</p>
            </div>
            
            <div className="mt-16 text-sm text-gray-700 dark:text-gray-400 max-w-md">
              {t('testimonial.context')}
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={200}>
          <div className="relative aspect-video lg:aspect-square bg-gray-300 dark:bg-gray-800 overflow-hidden group rounded-sm shadow-xl">
            {/* Using an image to simulate the video thumbnail */}
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80" 
              alt="Testimonial Video"
              className={`w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 ${isPlaying ? 'scale-105 brightness-50' : ''}`}
            />
            <div className={`absolute inset-0 bg-black/10 transition-colors duration-300 ${isPlaying ? 'bg-black/40' : 'group-hover:bg-black/20'}`} />
            
            <button 
              onClick={togglePlay}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform duration-300"
            >
              {isPlaying ? (
                 <Pause fill="currentColor" size={32} />
              ) : (
                 <Play fill="currentColor" size={32} className="ml-1" />
              )}
            </button>
            
            {isPlaying && (
                <div className="absolute bottom-8 left-8 text-white font-medium animate-fadeIn">
                    {t('testimonial.demoPlaying')}
                </div>
            )}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

export default Testimonial;
