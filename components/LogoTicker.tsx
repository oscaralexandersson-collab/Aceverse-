
import React from 'react';
import RevealOnScroll from './RevealOnScroll';

const LogoTicker: React.FC = () => {
  const logos = [
    "Ung Företagsamhet",
    "Stockholm School of Economics",
    "Hyper Island",
    "Future Ventures",
    "Innovate Academy",
    "Founder's Hub",
    "Junior Achievement",
    "TechStart"
  ];

  // Duplicate for seamless infinite scroll
  const allLogos = [...logos, ...logos, ...logos];

  return (
    <RevealOnScroll>
      <section className="py-12 md:py-16 border-t border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-black transition-colors duration-300">
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white dark:from-black to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white dark:from-black to-transparent z-10"></div>
          
          <div className="flex animate-scroll hover:[animation-play-state:paused] w-max">
             {allLogos.map((logo, index) => (
               <div key={index} className="mx-12 flex items-center justify-center">
                 <span className="text-xl md:text-2xl font-serif font-bold text-gray-300 dark:text-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-default whitespace-nowrap">
                   {logo}
                 </span>
               </div>
             ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
};

export default LogoTicker;
