
import React from 'react';
import { PageProps } from '../types';
import { Target, Heart, Zap, Users, Globe, Award, Hourglass } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import RevealOnScroll from '../components/RevealOnScroll';

const About: React.FC<PageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  
  // Safely access arrays
  const historyParagraphs = (translations[language] as any).about.history as string[];

  const LOGO_URL = "https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Logga-Ej%20bakrund.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvTG9nZ2EtRWogYmFrcnVuZC5wbmciLCJpYXQiOjE3NjQ3NTk3NjYsImV4cCI6MTc5NjI5NTc2Nn0.wItQw7FJaVd5ANf3TXe2kTAYHeEPzQB9gDJxEcs4ZYs";

  const team = [
    {
      name: "Oscar Alexandersson",
      role: t('about.team.role'),
      bio: "Drivs av att sänka trösklarna för ungt entreprenörskap genom teknik och innovation.",
      image: "https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Oscar.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvT3NjYXIucG5nIiwiaWF0IjoxNzY0NTE3NDM2LCJleHAiOjE3OTYwNTM0MzZ9.4vq9W2OGzmAwpSLiP90Wl3fGo3Bx0FWymSlmnvlezjU"
    },
    {
      name: "Simon Brangefält",
      role: t('about.team.role'),
      bio: "Brinner för att ge studenter verktygen de behöver för att förverkliga sina visioner.",
      image: "https://media.licdn.com/dms/image/v2/D4E03AQEd6AfQ6zoJlQ/profile-displayphoto-crop_800_800/B4EZlUUjS5IkAI-/0/1758056301202?e=1766016000&v=beta&t=fqp3lJ8iD9lJFJqmneSC3tQg7ddPvCYxzA4KyLoH9vc"
    }
  ];

  const values = [
    {
      title: t('about.values.v1.title'),
      desc: t('about.values.v1.desc'),
      icon: <Target className="w-6 h-6" />
    },
    {
      title: t('about.values.v2.title'),
      desc: t('about.values.v2.desc'),
      icon: <Globe className="w-6 h-6" />
    },
    {
      title: t('about.values.v3.title'),
      desc: t('about.values.v3.desc'),
      icon: <Zap className="w-6 h-6" />
    }
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="px-6 mb-12">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <span className="text-sm font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-4 block">{t('about.tag')}</span>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-12 max-w-5xl whitespace-pre-line">
              {t('about.title')}
            </h1>
            <div className="grid md:grid-cols-2 gap-12 items-start">
               <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                 {t('about.p1')}
               </p>
               <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                 {t('about.p2')}
               </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 3D Logo Gravity System */}
      <section className="px-6 mb-32 relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
           <RevealOnScroll className="w-full">
             <div className="relative w-full h-[700px] flex items-center justify-center perspective-1000">
                
                {/* The Gravity System */}
                <div className="relative flex items-center justify-center preserve-3d">
                    
                    {/* Ring 1: Apple Watch Style Text Ring (The Bezel) */}
                    <div className="absolute flex items-center justify-center animate-[spin_20s_linear_infinite] z-10">
                        <svg viewBox="0 0 300 300" className="w-[300px] h-[300px] overflow-visible">
                            <defs>
                                <path id="textPath" d="M 150, 150 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0" />
                            </defs>
                            <text className="text-[9px] font-bold tracking-[0.22em] uppercase fill-gray-900 dark:fill-white">
                                <textPath href="#textPath" startOffset="0%">
                                    Aceverse • Est. 2024 • Stockholm • Innovation • Aceverse • Est. 2024 • Stockholm • Innovation •
                                </textPath>
                            </text>
                        </svg>
                    </div>

                    {/* Ring 2: Outer Text Ring (Faded/Larger) */}
                    <div className="absolute flex items-center justify-center animate-[spin_40s_linear_infinite_reverse] opacity-30">
                        <svg viewBox="0 0 400 400" className="w-[400px] h-[400px] overflow-visible">
                            <defs>
                                <path id="outerPath" d="M 200, 200 m -160, 0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" />
                            </defs>
                            <text className="text-[9px] font-medium tracking-[0.4em] uppercase fill-gray-500 dark:fill-gray-400">
                                <textPath href="#outerPath" startOffset="0%">
                                    The AI Co-Founder • Empowering the Next Generation • The AI Co-Founder • Empowering the Next Generation •
                                </textPath>
                            </text>
                        </svg>
                    </div>

                    {/* Ring 3: The Tech Orbit (Tilted X) */}
                    <div className="absolute w-[500px] h-[500px] border-[1px] border-black/5 dark:border-white/10 rounded-full animate-[spin_25s_linear_infinite] [transform:rotateX(70deg)] preserve-3d pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rounded-full shadow-sm"></div>
                    </div>

                    {/* Ring 4: The Growth Orbit (Tilted Y) */}
                    <div className="absolute w-[450px] h-[450px] border-[1px] border-black/5 dark:border-white/10 rounded-full animate-[spin_30s_linear_infinite_reverse] [transform:rotateX(70deg)_rotateY(60deg)] preserve-3d pointer-events-none">
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full shadow-sm"></div>
                    </div>

                    {/* Central Core: The Logo */}
                    <div className="relative z-20 w-40 h-40 bg-white dark:bg-black rounded-full shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-10px_rgba(255,255,255,0.1)] flex items-center justify-center p-8 animate-float border border-gray-100 dark:border-gray-800">
                        <img 
                            src={LOGO_URL} 
                            alt="Aceverse Logo" 
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:invert opacity-90" 
                        />
                        
                        {/* Inner Pulse */}
                        <div className="absolute inset-0 rounded-full border border-black/5 dark:border-white/5 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                    </div>

                    {/* Background Particles */}
                    <div className="absolute inset-[-200px] pointer-events-none">
                        {[...Array(12)].map((_, i) => (
                            <div 
                                key={i}
                                className="absolute w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"
                                style={{
                                    top: `${50 + (Math.random() - 0.5) * 80}%`,
                                    left: `${50 + (Math.random() - 0.5) * 80}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            ></div>
                        ))}
                    </div>

                </div>

             </div>
           </RevealOnScroll>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-12 mb-24 bg-white dark:bg-black border-y border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center md:text-left">
           <RevealOnScroll delay={0}>
               <div>
                  <div className="text-5xl font-serif-display mb-2 text-black dark:text-white">2024</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Grundat</div>
               </div>
           </RevealOnScroll>
           <RevealOnScroll delay={100}>
               <div>
                  <div className="text-5xl font-serif-display mb-2 text-black dark:text-white">15k+</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Studenter</div>
               </div>
           </RevealOnScroll>
           <RevealOnScroll delay={200}>
               <div>
                  <div className="text-5xl font-serif-display mb-2 text-black dark:text-white">120</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Partnerskolor</div>
               </div>
           </RevealOnScroll>
           <RevealOnScroll delay={300}>
               <div>
                  <div className="text-5xl font-serif-display mb-2 text-black dark:text-white">Sthlm</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Huvudkontor</div>
               </div>
           </RevealOnScroll>
        </div>
      </section>

      {/* Why We Started Section */}
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <RevealOnScroll>
                <div>
                    <span className="text-sm font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-4 block">Vår Historia</span>
                    <h2 className="font-serif-display text-4xl md:text-5xl mb-6 text-gray-900 dark:text-white">
                        {t('about.historyTitle')}
                    </h2>
                </div>
            </RevealOnScroll>
            <RevealOnScroll delay={200}>
                <div className="space-y-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                    {historyParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
                </div>
            </RevealOnScroll>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 py-12 mb-24">
         <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
                 <h2 className="font-serif-display text-4xl mb-16 text-gray-900 dark:text-white">{t('about.values.title')}</h2>
             </RevealOnScroll>
             <div className="grid md:grid-cols-3 gap-12">
                 {values.map((val, idx) => (
                     <RevealOnScroll key={idx} delay={idx * 150}>
                         <div className="group">
                             <div className="w-12 h-12 bg-beige-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors text-black dark:text-white">
                                 {val.icon}
                             </div>
                             <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{val.title}</h3>
                             <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{val.desc}</p>
                         </div>
                     </RevealOnScroll>
                 ))}
             </div>
         </div>
      </section>

      {/* Team */}
      <section className="px-6 py-24 bg-beige-50 dark:bg-gray-900 transition-colors">
          <div className="max-w-7xl mx-auto">
              <RevealOnScroll>
                  <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                      <h2 className="font-serif-display text-5xl text-gray-900 dark:text-white">{t('about.team.title')}</h2>
                      <p className="max-w-md text-gray-600 dark:text-gray-400 text-right md:text-left">
                          {t('about.team.desc')}
                      </p>
                  </div>
              </RevealOnScroll>

              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-12">
                  {team.map((member, idx) => (
                      <RevealOnScroll key={idx} delay={idx * 200}>
                          <div className="group">
                              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 mb-6 overflow-hidden relative">
                                  <img 
                                    src={member.image} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                                  />
                              </div>
                              <h3 className="text-2xl font-serif-display mb-1 text-gray-900 dark:text-white">{member.name}</h3>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{member.role}</p>
                              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm">{member.bio}</p>
                          </div>
                      </RevealOnScroll>
                  ))}
              </div>
          </div>
      </section>

      {/* Join CTA */}
      <section className="px-6 py-32 text-center">
          <div className="max-w-3xl mx-auto">
              <RevealOnScroll>
                  <h2 className="font-serif-display text-5xl md:text-6xl mb-8 text-gray-900 dark:text-white">{t('about.join.title')}</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
                      {t('about.join.desc')}
                  </p>
                  <button 
                      onClick={() => onNavigate('careers')}
                      className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 text-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                  >
                      {t('about.join.btn')} <Users size={18} />
                  </button>
              </RevealOnScroll>
          </div>
      </section>
    </div>
  );
};

export default About;
