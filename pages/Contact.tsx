
import React, { useState, useRef } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, ArrowRight, Copy } from 'lucide-react';
import { db } from '../services/db';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const CONTACT_EMAIL = 'info.aceverse@gmail.com';

const Contact: React.FC = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        await db.submitContactRequest({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
        });

        const response = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                _subject: `${t('contact.form.newMsg')}: ${formData.subject || 'No subject'}`, 
                message: formData.message,
                _template: 'table', 
                _captcha: 'false'
            })
        });

        if (!response.ok) {
            console.warn("Email sending via FormSubmit failed, but saved to DB.");
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        
        setIsSent(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
        console.error("Submission failed", error);
        alert("Error occurred. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <section className="pt-24 pb-20 px-6 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-8 whitespace-pre-line">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {t('contact.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Contact Details */}
          <div className="lg:col-span-4 space-y-12">
            <RevealOnScroll>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-6 uppercase">{t('contact.details.tag')}</h3>
                <div className="space-y-8">
                  <div className="group">
                    <h4 className="font-serif-display text-2xl mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      {t('contact.details.email')} <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </h4>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white border-b border-gray-200 dark:border-gray-700 pb-1 hover:border-black dark:hover:border-white transition-all">
                      {CONTACT_EMAIL}
                    </a>
                  </div>

                  <div className="group">
                    <h4 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">{t('contact.details.phone')}</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">070-548-05-60</p>
                    <p className="text-xs text-gray-400">09:00 - 17:00 (CET)</p>
                  </div>

                  <div className="group">
                    <h4 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">{t('contact.details.visit')}</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Sveavägen 42<br/>
                      111 34 Stockholm<br/>
                      Sweden
                    </p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
            
            <RevealOnScroll delay={200}>
              <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-transparent dark:border-gray-800">
                <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{t('contact.details.schoolTitle')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {t('contact.details.schoolDesc')}
                </p>
                <button 
                  onClick={scrollToForm}
                  className="text-sm font-semibold underline decoration-1 underline-offset-4 hover:decoration-2 text-black dark:text-white"
                >
                  {t('contact.details.schoolBtn')}
                </button>
              </div>
            </RevealOnScroll>
          </div>

          {/* Form */}
          <div className="lg:col-span-8" ref={formRef}>
             <RevealOnScroll delay={300}>
                <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 relative overflow-hidden min-h-[600px]">
                   {isSent ? (
                     <div className="absolute inset-0 bg-beige-50 dark:bg-gray-800 z-10 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                       <div className="w-24 h-24 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mb-8 shadow-xl animate-[slideUp_0.5s_ease-out_forwards]">
                         <CheckCircle size={40} strokeWidth={1.5} />
                       </div>
                       <h3 className="font-serif-display text-4xl mb-4 text-gray-900 dark:text-white animate-[slideUp_0.6s_ease-out_forwards]">{t('contact.form.successTitle')}</h3>
                       <p className="text-gray-600 dark:text-gray-300 mb-10 max-w-md text-lg leading-relaxed animate-[slideUp_0.7s_ease-out_forwards]">
                         {t('contact.form.successDesc')}
                       </p>
                       <button 
                          onClick={() => setIsSent(false)}
                          className="text-black dark:text-white font-semibold border-b-2 border-black dark:border-white pb-1 hover:opacity-70 transition-opacity animate-[slideUp_0.8s_ease-out_forwards]"
                       >
                         {t('contact.form.newMsg')}
                       </button>
                     </div>
                   ) : (
                      <form onSubmit={handleSubmit} className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="group">
                            <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 group-focus-within:text-black dark:group-focus-within:text-gray-300">{t('contact.form.name')}</label>
                            <input 
                              type="text" 
                              name="name"
                              required
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full border-b border-gray-200 dark:border-gray-700 py-3 text-lg focus:border-black dark:focus:border-white outline-none transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent text-gray-900 dark:text-white"
                              placeholder="Max Jensen"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 group-focus-within:text-black dark:group-focus-within:text-gray-300">{t('contact.form.email')}</label>
                            <input 
                              type="email" 
                              name="email"
                              required
                              value={formData.email}
                              onChange={handleChange}
                              className="w-full border-b border-gray-200 dark:border-gray-700 py-3 text-lg focus:border-black dark:focus:border-white outline-none transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent text-gray-900 dark:text-white"
                              placeholder="name@company.com"
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 group-focus-within:text-black dark:group-focus-within:text-gray-300">{t('contact.form.subject')}</label>
                          <select 
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full border-b border-gray-200 dark:border-gray-700 py-3 text-lg focus:border-black dark:focus:border-white outline-none transition-colors bg-transparent cursor-pointer text-gray-900 dark:text-white"
                          >
                            <option value="" className="dark:bg-gray-900">{t('contact.form.subjects.default')}</option>
                            <option value="Support & Hjälp" className="dark:bg-gray-900">{t('contact.form.subjects.support')}</option>
                            <option value="Sälj & Partnerskap" className="dark:bg-gray-900">{t('contact.form.subjects.sales')}</option>
                            <option value="Press & Media" className="dark:bg-gray-900">{t('contact.form.subjects.press')}</option>
                            <option value="Övrigt" className="dark:bg-gray-900">{t('contact.form.subjects.other')}</option>
                          </select>
                        </div>

                        <div className="group">
                          <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 group-focus-within:text-black dark:group-focus-within:text-gray-300">{t('contact.form.message')}</label>
                          <textarea 
                            name="message"
                            required
                            value={formData.message}
                            onChange={handleChange}
                            rows={4}
                            className="w-full border-b border-gray-200 dark:border-gray-700 py-3 text-lg focus:border-black dark:focus:border-white outline-none transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent resize-none text-gray-900 dark:text-white"
                            placeholder="..."
                          />
                        </div>

                        <div className="pt-4">
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-black dark:bg-white text-white dark:text-black px-10 py-5 rounded-full font-medium text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-black/10 dark:shadow-white/10"
                          >
                            {isSubmitting ? (
                              <><Loader2 className="animate-spin" size={20} /> {t('contact.form.sending')}</>
                            ) : (
                              <>{t('contact.form.btn')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                          </button>
                        </div>
                      </form>
                   )}
                </div>
             </RevealOnScroll>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
