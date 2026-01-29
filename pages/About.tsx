
import React from 'react';
import { PageProps } from '../types';
import { Target, Heart, Zap, Globe, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import RevealOnScroll from '../components/RevealOnScroll';

const About: React.FC<PageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  
  // Safely access arrays
  const historyParagraphs = (translations[language] as any).about.history as string[];

  const team = [
    {
      name: "Oscar Alexandersson",
      role: t('about.team.role'),
      bio: "Drivs av att sänka trösklarna för ungt entreprenörskap genom teknik och innovation.",
      // Using grayscale filter in CSS instead of relying on source image
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
    <div className="pt-32 bg-white dark:bg-black transition-colors duration-300 font-sans">
      {/* Hero Section */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                <Target size={12} /> {t('about.tag')}
            </div>
            <h1 className="font-serif-display text-6xl md:text-9xl leading-[0.8] text-black dark:text-white mb-16 tracking-tighter">
              {t('about.title')}
            </h1>
            <div className="grid md:grid-cols-2 gap-12 items-start border-t border-black dark:border-white pt-12">
               <p className="text-xl text-black dark:text-white font-medium leading-relaxed">
                 {t('about.p1')}
               </p>
               <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-light">
                 {t('about.p2')}
               </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Visual Break - Slogan Graphic */}
      <section className="px-6 mb-32">
          <RevealOnScroll className="w-full h-[500px] bg-black dark:bg-white rounded-[3rem] overflow-hidden relative flex flex-col items-center justify-center group">
              
              {/* Subtle Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

              <div className="relative z-10 text-center select-none">
                  {/* Background Blur Text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none">
                      <h2 className="text-[15vw] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent dark:from-black/10 dark:to-transparent tracking-tighter blur-[2px] opacity-50">
                          INTELLIGENCE
                      </h2>
                  </div>
                  
                  {/* Foreground Text */}
                  <h2 className="text-5xl md:text-8xl font-serif-display text-white dark:text-black mb-6 relative inline-block z-10">
                      <span className="italic font-light opacity-80">Entrepreneurial</span><br/>
                      <span className="font-bold tracking-tighter">INTELLIGENCE</span>
                      <Sparkles className="absolute -top-4 -right-10 w-10 h-10 text-white dark:text-black animate-pulse" />
                  </h2>
                  
                  {/* Tagline */}
                  <div className="mt-8 flex justify-center z-10 relative">
                      <div className="px-8 py-3 border border-white/30 dark:border-black/30 rounded-full backdrop-blur-md">
                          <p className="text-xs font-mono text-white dark:text-black uppercase tracking-[0.4em] font-bold">
                              At Your Fingertips
                          </p>
                      </div>
                  </div>
              </div>
              
              {/* Interactive Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent dark:from-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          </RevealOnScroll>
      </section>

      {/* Values */}
      <section className="px-6 py-24 border-y border-gray-100 dark:border-gray-900">
         <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
                 <h2 className="font-serif-display text-4xl md:text-5xl mb-16 text-black dark:text-white">{t('about.values.title')}</h2>
             </RevealOnScroll>
             <div className="grid md:grid-cols-3 gap-12">
                 {values.map((val, idx) => (
                     <RevealOnScroll key={idx} delay={idx * 150}>
                         <div className="group border-l border-black dark:border-white pl-8 hover:pl-12 transition-all duration-500">
                             <div className="mb-6 text-black dark:text-white">
                                 {val.icon}
                             </div>
                             <h3 className="text-xl font-bold mb-4 text-black dark:text-white">{val.title}</h3>
                             <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm font-light">{val.desc}</p>
                         </div>
                     </RevealOnScroll>
                 ))}
             </div>
         </div>
      </section>

      {/* Team */}
      <section className="px-6 py-32 bg-gray-50 dark:bg-zinc-950 transition-colors">
          <div className="max-w-7xl mx-auto">
              <RevealOnScroll>
                  <h2 className="font-serif-display text-5xl text-black dark:text-white mb-20">{t('about.team.title')}</h2>
              </RevealOnScroll>

              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-12">
                  {team.map((member, idx) => (
                      <RevealOnScroll key={idx} delay={idx * 200}>
                          <div className="group">
                              <div className="aspect-[4/5] bg-gray-200 dark:bg-gray-800 mb-8 overflow-hidden relative rounded-2xl">
                                  <img 
                                    src={member.image} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 grayscale"
                                  />
                              </div>
                              <h3 className="text-3xl font-serif-display mb-2 text-black dark:text-white">{member.name}</h3>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{member.role}</p>
                              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-light">{member.bio}</p>
                          </div>
                      </RevealOnScroll>
                  ))}
              </div>
          </div>
      </section>

      {/* Join CTA */}
      <section className="px-6 py-32 text-center bg-black dark:bg-white text-white dark:text-black">
          <div className="max-w-3xl mx-auto">
              <RevealOnScroll>
                  <h2 className="font-serif-display text-5xl md:text-7xl mb-8 leading-tight">{t('about.join.title')}</h2>
                  <p className="text-xl opacity-70 mb-12 font-light">
                      {t('about.join.desc')}
                  </p>
                  <button 
                      onClick={() => onNavigate('careers')}
                      className="bg-white dark:bg-black text-black dark:text-white px-12 py-5 rounded-full text-lg font-bold hover:scale-105 transition-transform inline-flex items-center gap-2"
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
