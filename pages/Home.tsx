import React from 'react';
import Hero from '../components/Hero';
import LogoTicker from '../components/LogoTicker';
import FeatureSection from '../components/FeatureSection';
import Testimonial from '../components/Testimonial';
import Security from '../components/Security';
import { PageProps } from '../types';

const Home: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <>
      <Hero onNavigate={onNavigate} />
      <LogoTicker />
      <FeatureSection onNavigate={onNavigate} />
      <Testimonial />
      <Security />
    </>
  );
};

export default Home;