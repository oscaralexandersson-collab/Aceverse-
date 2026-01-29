
import React from 'react';
import Hero from '../components/Hero';
import LogoTicker from '../components/LogoTicker';
import FeatureSection from '../components/FeatureSection';
import { PageProps } from '../types';

const Home: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <>
      <Hero onNavigate={onNavigate} />
      <LogoTicker />
      <FeatureSection onNavigate={onNavigate} />
      {/* Testimonial and Security removed to focus on product narrative per request */}
    </>
  );
};

export default Home;
