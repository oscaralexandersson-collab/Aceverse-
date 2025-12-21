
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, TrendingUp, Users, Mic, Clock, Loader2 } from 'lucide-react';
import { DashboardView, User } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

interface OverviewProps {
    user: User;
    setView: (view: DashboardView) => void;
}

const Overview: React.FC<OverviewProps> = ({ user, setView }) => {
  const [stats, setStats] = useState({
    leadsCount: 0,
    pitchCount: 0,
    ideaCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const loadStats = async () => {
        try {
            const data = await db.getUserData(user.id);
            setStats({
                leadsCount: data.leads.length,
                pitchCount: data.pitches.length,
                ideaCount: data.ideas.length
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    loadStats();
  }, [user.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">{t('dashboard.overviewContent.greeting', {name: user.firstName})}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('dashboard.overviewContent.subtitle', {company: user.company || 'ditt företag'})}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{t('dashboard.overviewContent.statLeads')}</span>
                <Users size={20} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.leadsCount}</span>
                <span className="text-green-600 text-sm font-medium flex items-center mb-1">
                    <TrendingUp size={14} className="mr-1" /> {t('dashboard.overviewContent.increase')}
                </span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{t('dashboard.overviewContent.statPitch')}</span>
                <Mic size={20} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.pitchCount}</span>
                <span className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.overviewContent.total')}</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{t('dashboard.overviewContent.statIdeas')}</span>
                <Clock size={20} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.ideaCount}</span>
                <span className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.overviewContent.total')}</span>
            </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
            <h3 className="font-serif-display text-2xl text-gray-900 dark:text-white">{t('dashboard.overviewContent.actionsTitle')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
                <button 
                    onClick={() => setView('ideas')}
                    className="group bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors text-left shadow-sm"
                >
                    <div className="w-10 h-10 bg-beige-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                        <ArrowUpRight size={20} />
                    </div>
                    <h4 className="font-medium text-lg mb-1 text-gray-900 dark:text-white">{t('dashboard.overviewContent.actValidate')}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overviewContent.actValidateDesc')}</p>
                </button>

                <button 
                    onClick={() => setView('crm')}
                    className="group bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors text-left shadow-sm"
                >
                    <div className="w-10 h-10 bg-beige-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                        <Users size={20} />
                    </div>
                    <h4 className="font-medium text-lg mb-1 text-gray-900 dark:text-white">{t('dashboard.overviewContent.actLeads')}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overviewContent.actLeadsDesc')}</p>
                </button>
            </div>

            <div className="bg-black dark:bg-white dark:text-black text-white rounded-lg p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-serif-display text-2xl mb-2">{t('dashboard.overviewContent.promoTitle')}</h3>
                    <p className="text-gray-400 dark:text-gray-600 mb-6 max-w-md">{t('dashboard.overviewContent.promoDesc')}</p>
                    <button 
                        onClick={() => setView('pitch')}
                        className="bg-white text-black dark:bg-black dark:text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        {t('dashboard.overviewContent.promoBtn')}
                    </button>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-gray-800 dark:bg-gray-200 rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-6 shadow-sm h-fit">
            <h3 className="font-serif-display text-xl mb-6 text-gray-900 dark:text-white">{t('dashboard.overviewContent.activityTitle')}</h3>
            <div className="space-y-6">
                {[
                    { action: t('dashboard.overviewContent.act1'), target: "Acme Corp", time: "2h" },
                    { action: t('dashboard.overviewContent.act2'), target: "v2_final.pdf", time: "5h" },
                    { action: t('dashboard.overviewContent.act3'), target: "SaaS Platform", time: "1d" },
                    { action: t('dashboard.overviewContent.act4'), target: "Marketing Strategy", time: "1d" }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-black dark:bg-white"></div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.target}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">{item.time}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
