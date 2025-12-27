
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, TrendingUp, Users, Mic, Clock, Loader2 } from 'lucide-react';
import { DashboardView, User } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

interface OverviewProps {
    user: User;
    setView: (view: DashboardView) => void;
}

interface ActivityItem {
    action: string;
    target: string;
    time: string;
    timestamp: number;
}

const Overview: React.FC<OverviewProps> = ({ user, setView }) => {
  const [stats, setStats] = useState({
    leadsCount: 0,
    pitchCount: 0,
    ideaCount: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffInMs = now.getTime() - then.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return `Nu`;
    if (diffInMins < 60) return `${diffInMins}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return then.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await db.getUserData(user.id);
            
            // Stats
            setStats({
                leadsCount: Array.isArray(data.leads) ? data.leads.length : 0,
                pitchCount: Array.isArray(data.pitches) ? data.pitches.length : 0,
                ideaCount: Array.isArray(data.ideas) ? data.ideas.length : 0
            });

            // Activity Aggregation
            const rawActivities: ActivityItem[] = [
                ...(data.leads || []).map(l => ({
                    action: t('dashboard.overviewContent.act1'),
                    target: l.company || l.name,
                    time: formatRelativeTime(l.created_at),
                    timestamp: new Date(l.created_at).getTime()
                })),
                ...(data.pitches || []).map(p => ({
                    action: t('dashboard.overviewContent.act2'),
                    target: p.name,
                    time: formatRelativeTime(p.created_at),
                    timestamp: new Date(p.created_at).getTime()
                })),
                ...(data.ideas || []).map(i => ({
                    action: t('dashboard.overviewContent.act3'),
                    target: i.title,
                    time: formatRelativeTime(i.created_at),
                    timestamp: new Date(i.created_at).getTime()
                })),
                ...(data.reports || []).map(r => ({
                    action: "Analys klar",
                    target: r.title,
                    time: formatRelativeTime(r.created_at),
                    timestamp: new Date(r.created_at).getTime()
                }))
            ];

            // Sort by timestamp descending and take top 5
            setActivities(rawActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));

        } catch (error) {
            console.error("Kunde inte hämta översiktsdata", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user.id, t]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div>;

  const firstName = user.firstName || 'Entreprenör';
  const companyName = user.company || 'ditt företag';

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">
          {t('dashboard.overviewContent.greeting', {name: firstName})}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('dashboard.overviewContent.subtitle', {company: companyName})}
        </p>
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
                {activities.length > 0 ? activities.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-black dark:bg-white"></div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{item.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.target}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap pl-2">{item.time}</span>
                    </div>
                )) : (
                    <div className="text-center py-8 opacity-40">
                        <Clock size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-xs font-bold uppercase tracking-widest">Ingen aktivitet än</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
