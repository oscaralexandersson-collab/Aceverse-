
import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle, Loader2, PlayCircle } from 'lucide-react';
import { db } from '../services/db';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

interface LoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Signup State
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await db.login(loginEmail, loginPassword, rememberMe);
      onLogin(user);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!firstName || !lastName) {
      setError('Vänligen fyll i alla fält');
      return;
    }
    setIsLoading(true);
    try {
      try {
        const user = await db.signup(signupEmail, signupPassword, firstName, lastName);
        onLogin(user);
      } catch (signupErr: any) {
        if (signupErr.message === 'CONFIRM_EMAIL') {
          setSuccessMessage('Konto skapat! Kontrollera din e-post innan du loggar in.');
          setIsSignUp(false);
          setSignupEmail('');
          setSignupPassword('');
        } else {
          throw signupErr;
        }
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (err: any) => {
    console.error("Auth Error:", err);
    const msg = (err.message || JSON.stringify(err)).toLowerCase();
    if (msg.includes("email not confirmed")) {
      setError("Din e-post är inte verifierad. Kontrollera din inkorg.");
    } else if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
      setError("Felaktig e-post eller lösenord.");
    } else if (msg.includes("user already registered")) {
      setError("Ett konto med denna e-post finns redan.");
    } else {
      setError(`Ett fel inträffade (${err.message}).`);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const user = await db.createDemoUser();
      onLogin(user);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-black transition-colors duration-300">
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-16">
        <RevealOnScroll>
          <div className="mb-8">
              <button onClick={onBack} className="flex items-center gap-2 cursor-pointer group">
                  <img 
                    src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Logga-Ej%20bakrund.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvTG9nZ2EtRWogYmFrcnVuZC5wbmciLCJpYXQiOjE3NjQ3NTk3NjYsImV4cCI6MTc5NjI5NTc2Nn0.wItQw7FJaVd5ANf3TXe2kTAYHeEPzQB9gDJxEcs4ZYs" 
                    alt="Aceverse Logo" 
                    className="h-8 w-auto object-contain group-hover:scale-105 transition-transform mix-blend-multiply dark:mix-blend-normal dark:invert"
                  />
                  <span className="font-semibold text-xl tracking-tight text-gray-900 dark:text-white">Aceverse</span>
              </button>
          </div>

          <div className="max-w-md mx-auto w-full flex-grow flex flex-col justify-center">
            <h1 className="font-serif-display text-4xl md:text-5xl mb-4 text-gray-900 dark:text-white">
              {isSignUp ? t('login.titleJoin') : t('login.titleBack')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {isSignUp ? t('login.subtitleJoin') : t('login.subtitleBack')}
            </p>

            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md mb-6 flex items-start gap-2 text-sm border border-green-200 dark:border-green-800">
                <CheckCircle size={18} className="mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-md mb-6 flex items-start gap-2 text-sm border border-red-100 dark:border-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 
              CRITICAL FIX FOR MAC/SAFARI: 
              We keep BOTH forms in the DOM at all times. 
              Safari scans the DOM on load; if the form is missing or added later via React state, 
              it often fails to map the Keychain credentials.
            */}
            
            {/* LOGIN FORM (Always in DOM) */}
            <div style={{ display: isSignUp ? 'none' : 'block' }}>
              <form 
                id="login-form"
                onSubmit={handleLoginSubmit} 
                className="space-y-4" 
                method="POST" 
                action="/login"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                    {t('login.email')}
                  </label>
                  <input 
                    id="email"
                    name="username"
                    type="email" 
                    required
                    autoComplete="username"
                    className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="namn@företag.se"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                    {t('login.password')}
                  </label>
                  <input 
                    id="password"
                    name="password"
                    type="password" 
                    required
                    autoComplete="current-password"
                    className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={rememberMe} 
                          onChange={(e) => setRememberMe(e.target.checked)} 
                          className="rounded border-gray-300 text-black focus:ring-black" 
                        />
                        {t('login.remember')}
                    </label>
                    <button type="button" className="text-black dark:text-white font-medium hover:underline">{t('login.forgot')}</button>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-4 font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group mt-4"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>{t('login.btnInit')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                </button>
              </form>
            </div>

            {/* SIGNUP FORM (Always in DOM) */}
            <div style={{ display: isSignUp ? 'block' : 'none' }}>
              <form 
                id="signup-form"
                onSubmit={handleSignUpSubmit} 
                className="space-y-4" 
                method="POST" 
                action="/signup"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="signup-first">{t('login.firstName')}</label>
                    <input id="signup-first" name="given-name" type="text" required={isSignUp} autoComplete="given-name" className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="signup-last">{t('login.lastName')}</label>
                    <input id="signup-last" name="family-name" type="text" required={isSignUp} autoComplete="family-name" className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="signup-email">{t('login.email')}</label>
                  <input id="signup-email" name="email" type="email" required={isSignUp} autoComplete="email" className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="signup-password">{t('login.password')}</label>
                  <input id="signup-password" name="new-password" type="password" required={isSignUp} autoComplete="new-password" className="w-full border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-4 font-medium text-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>{t('login.btnCreate')} <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="bg-white dark:bg-black px-4 text-gray-400">Eller</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => db.loginWithOAuth('google')} className="flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</span>
                </button>
                <button onClick={() => db.loginWithOAuth('apple')} className="flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 4.31-.74c.58.03 2.2.32 3.19 1.83-2.58 1.58-2.18 5.7.83 6.88-.63 1.57-1.42 3.12-2.41 4.26zm-2.84-16.1c.45-2.27 2.4-3.9 4.67-4.18.3 2.62-2.42 5.37-4.67 4.18z"/></svg>
                    <span className="text-sm font-medium">Apple</span>
                </button>
            </div>

            {!isSignUp && (
              <div className="mt-4">
                  <button onClick={handleDemoLogin} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <PlayCircle size={18} /> {t('login.demo')}
                  </button>
              </div>
            )}

            <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? t('login.hasAccount') : t('login.noAccount')} 
              <button 
                onClick={() => { 
                  setIsSignUp(!isSignUp); 
                  setError(''); 
                }} 
                className="text-black dark:text-white font-semibold hover:underline ml-2"
              >
                {isSignUp ? t('login.loginLink') : t('login.register')}
              </button>
            </p>
          </div>
          <div className="text-xs text-gray-400 mt-8 text-center lg:text-left">&copy; 2026 Aceverse</div>
        </RevealOnScroll>
      </div>

      <div className="hidden lg:block w-1/2 bg-beige-100 dark:bg-gray-900 relative overflow-hidden">
        <RevealOnScroll delay={200} className="h-full">
          <img src="https://picsum.photos/1000/1200?random=88" alt="Office Atmosphere" className="w-full h-full object-cover grayscale opacity-80 dark:opacity-40" />
          <div className="absolute inset-0 bg-black/5 dark:bg-black/50" />
          <div className="absolute bottom-16 left-16 right-16">
               <h2 className="font-serif-display text-4xl text-white drop-shadow-md mb-4">"Aceverse förändrade hur vi driver vårt UF-företag."</h2>
               <p className="text-white/90 font-medium">Ludvig S. — Grundare, GreenTech UF</p>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
};

export default Login;
