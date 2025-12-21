
import React, { useState, useEffect } from 'react';
import { ArrowRight, Lightbulb, Users, Mic, CheckCircle2, Search, BarChart3, User, Mail, Target, TrendingUp, Zap } from 'lucide-react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from './RevealOnScroll';

const FeatureSection: React.FC<Partial<PageProps>> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const features = [
    {
      category: t('features.f1.cat'),
      title: t('features.f1.title'),
      description: t('features.f1.desc'),
      icon: <Lightbulb className="w-5 h-5" />,
      link: t('features.f1.link'),
      // CONCEPT: "Validation Scanner" - Neutral Theme
      renderVisual: () => (
        <div className="w-full h-full bg-[#f9f9f8] dark:bg-gray-900 relative overflow-hidden flex items-center justify-center transition-colors">
             {/* Grid Background */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
             
             {/* Central Hypothesis Object */}
             <div className="relative w-32 h-32 flex items-center justify-center">
                 {/* The Core */}
                 <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex items-center justify-center z-10 relative">
                     <Lightbulb className="w-8 h-8 text-gray-900 dark:text-white" strokeWidth={1.5} />
                     {/* Validation Checkmark appearing */}
                     <div className="absolute -bottom-2 -right-2 bg-black dark:bg-white text-white dark:text-black rounded-full p-1 shadow-md animate-[bounce_2s_infinite] opacity-0" style={{ animation: 'bounce 2s infinite, fadeIn 2s forwards 1s' }}>
                        <CheckCircle2 size={12} />
                     </div>
                 </div>

                 {/* Scanning Rings - Neutral */}
                 <div className="absolute inset-0 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full animate-[spin_10s_linear_infinite]"></div>
                 <div className="absolute inset-2 border border-gray-200 dark:border-gray-700 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>

                 {/* Scanning Beam - White/Gray */}
                 <div className="absolute inset-x-[-50%] h-1 bg-gradient-to-r from-transparent via-gray-400/30 to-transparent blur-sm animate-scan z-20 top-0"></div>
             </div>

             {/* Data Points being analyzed - Neutral */}
             <div className="absolute w-full h-full pointer-events-none">
                 {[...Array(6)].map((_, i) => (
                    <div 
                        key={i} 
                        className="absolute flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded border border-gray-100 dark:border-gray-700 shadow-sm text-[10px] font-mono animate-float"
                        style={{
                            top: `${20 + Math.random() * 60}%`,
                            left: `${10 + Math.random() * 80}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    >
                        {/* i % 2 === 0 ? 'Risk' (Gray) : 'Valid' (Black) */}
                        <div className={`w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-gray-300 dark:bg-gray-600' : 'bg-black dark:bg-white'}`}></div>
                        <span className={`${i % 2 === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white font-medium'}`}>{i % 2 === 0 ? 'Risk' : 'Valid'}</span>
                    </div>
                 ))}
             </div>
        </div>
      )
    },
    {
      category: t('features.f2.cat'),
      title: t('features.f2.title'),
      description: t('features.f2.desc'),
      icon: <Users className="w-5 h-5" />,
      link: t('features.f2.link'),
      // CONCEPT: "Chaos to Order (The Funnel)" - Neutral Theme
      renderVisual: () => (
        <div className="w-full h-full bg-[#f9f9f8] dark:bg-gray-900 relative overflow-hidden flex flex-col items-center justify-center pt-8 transition-colors">
             {/* The "Chaos" Area */}
             <div className="absolute top-0 w-full h-1/2 overflow-visible">
                 {[...Array(8)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700"
                        style={{
                            left: '50%',
                            top: '20%',
                            '--sx': `${(Math.random() - 0.5) * 300}px`,
                            '--sy': `${(Math.random() - 0.5) * 200}px`,
                            animation: `funnel 4s ease-in-out infinite`,
                            animationDelay: `${i * 0.5}s`
                        } as React.CSSProperties}
                    >
                        {i % 2 === 0 ? <User size={14} className="text-gray-400 dark:text-gray-500" /> : <Mail size={14} className="text-gray-400 dark:text-gray-500" />}
                    </div>
                 ))}
             </div>

             {/* The "Order" Area (The CRM List) */}
             <div className="relative z-10 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] p-4 flex flex-col gap-2 mt-8 transform rotate-x-12 perspective-1000 border border-gray-100 dark:border-gray-700">
                 <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-2 mb-1">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipeline</span>
                     <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-pulse"></span>
                 </div>
                 
                 {/* List Items appearing */}
                 {[...Array(3)].map((_, i) => (
                     <div 
                        key={i} 
                        className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-build-up"
                        style={{ animationDelay: `${2 + i * 0.5}s`, animationFillMode: 'both', animationIterationCount: 'infinite', animationDirection: 'alternate' }}
                     >
                        <div className="w-6 h-6 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-black dark:text-white font-serif font-bold text-[9px] shadow-sm border border-gray-100 dark:border-gray-600">{String.fromCharCode(65+i)}</div>
                        <div className="flex-1 space-y-1.5">
                            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                            <div className="w-12 h-1 bg-gray-100 dark:bg-gray-600 rounded-full"></div>
                        </div>
                        <div className="text-[9px] font-medium text-black dark:text-white bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">100%</div>
                     </div>
                 ))}
             </div>
        </div>
      )
    },
    {
      category: t('features.f3.cat'),
      title: t('features.f3.title'),
      description: t('features.f3.desc'),
      icon: <Mic className="w-5 h-5" />,
      link: t('features.f3.link'),
      // CONCEPT: "The Live Stage" (Pitch Simulation) - Neutral Theme
      renderVisual: () => (
        <div className="w-full h-full bg-[#f9f9f8] dark:bg-gray-900 relative overflow-hidden flex flex-col items-center justify-end perspective-1000 transition-colors">
            {/* The Projector Light Beam - Neutral White */}
            <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-64 h-full bg-gradient-to-t from-white via-white/40 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent blur-3xl animate-projector origin-bottom pointer-events-none opacity-50"></div>

            {/* The Floating Screen */}
            <div className="relative mb-12 w-[85%] aspect-video bg-white dark:bg-gray-800 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden transform rotate-x-2 transition-transform hover:scale-105 duration-500 border border-gray-100 dark:border-gray-700">
                {/* Slides Cycling Container */}
                <div className="absolute inset-0 w-full h-full">
                    {/* Slide 1: Problem */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 animate-slide-cycle" style={{ animationDelay: '0s' }}>
                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                             <Target size={20} className="text-black dark:text-white" />
                        </div>
                        <h4 className="font-serif-display text-lg font-bold text-gray-900 dark:text-white mb-2">Problemet</h4>
                        <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-1.5"></div>
                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"></div>
                    </div>

                    {/* Slide 2: Solution */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 animate-slide-cycle opacity-0 transform translate-x-full" style={{ animationDelay: '4s' }}>
                         <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                             <Zap size={20} className="text-black dark:text-white" />
                        </div>
                        <h4 className="font-serif-display text-lg font-bold text-gray-900 dark:text-white mb-2">Lösningen</h4>
                        <div className="flex gap-2 mt-2">
                            <div className="w-8 h-10 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-100 dark:border-gray-600"></div>
                            <div className="w-8 h-10 bg-gray-100 dark:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-500"></div>
                            <div className="w-8 h-10 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-100 dark:border-gray-600"></div>
                        </div>
                    </div>

                    {/* Slide 3: Growth */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 animate-slide-cycle opacity-0 transform translate-x-full" style={{ animationDelay: '8s' }}>
                         <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                             <TrendingUp size={20} className="text-black dark:text-white" />
                        </div>
                        <h4 className="font-serif-display text-lg font-bold text-gray-900 dark:text-white mb-2">Tillväxt</h4>
                        <div className="w-full h-16 flex items-end justify-center gap-1.5 px-8 pb-2">
                            <div className="w-6 h-[30%] bg-gray-200 dark:bg-gray-600 rounded-t-sm"></div>
                            <div className="w-6 h-[50%] bg-gray-300 dark:bg-gray-500 rounded-t-sm"></div>
                            <div className="w-6 h-[70%] bg-gray-400 dark:bg-gray-400 rounded-t-sm"></div>
                            <div className="w-6 h-[100%] bg-black dark:bg-white rounded-t-sm shadow-lg"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Projector Device */}
            <div className="absolute bottom-0 w-32 h-6 bg-gray-100 dark:bg-gray-800 rounded-t-2xl shadow-inner flex justify-center items-start pt-1.5 z-10">
                <div className="w-12 h-3 bg-gray-300 dark:bg-gray-600 rounded-full blur-[2px]"></div>
            </div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-black relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Background Blobs - Neutral */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-beige-50 dark:bg-gray-900 rounded-full blur-3xl opacity-60 animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gray-50 dark:bg-gray-900 rounded-full blur-3xl opacity-60 animate-pulse-slow pointer-events-none" style={{ animationDelay: '4s' }}></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-24">
          <RevealOnScroll>
            <p className="text-sm font-medium tracking-widest text-gray-500 dark:text-gray-400 mb-6 uppercase">{t('features.tag')}</p>
            <h2 className="font-serif-display text-5xl md:text-7xl leading-[1.0] text-gray-900 dark:text-white max-w-4xl whitespace-pre-line">
              {t('features.title')}
            </h2>
          </RevealOnScroll>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <RevealOnScroll key={idx} delay={idx * 150}>
              <div 
                className="group cursor-pointer"
                onClick={() => onNavigate && onNavigate('login')}
              >
                {/* Borderless container with light gray background */}
                <div className="relative aspect-[3/4] mb-8 overflow-hidden rounded-2xl transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2 bg-[#f9f9f8] dark:bg-gray-900">
                  {/* Render the AI Animation Component */}
                  {feature.renderVisual && feature.renderVisual()}
                </div>
                
                <h3 className="text-2xl font-serif-display mb-3 group-hover:text-black dark:group-hover:text-white transition-colors text-gray-900 dark:text-white">{feature.category}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed pr-4 group-hover:text-gray-900 dark:group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-white group-hover:underline decoration-1 underline-offset-4 opacity-70 group-hover:opacity-100 transition-all">
                  {feature.link} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
