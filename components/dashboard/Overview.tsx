
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, TrendingUp, Users, Mic, Clock, Loader2, Target, CheckCircle2 } from 'lucide-react';
import { DashboardView, User, Recommendation } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';

interface OverviewProps {
    user: User;
    setView: (view: DashboardView) => void;
    onPlanEvent?: (prompt: string) => void;
}

interface ActivityItem {
    action: string;
    target: string;
    time: string;
    timestamp: number;
}

const Overview: React.FC<OverviewProps> = ({ user, setView, onPlanEvent }) => {
  const [stats, setStats] = useState({ leadsCount: 0, pitchCount: 0, ideaCount: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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
            const recs = await db.getRecommendations(user.id);
            
            setStats({
                leadsCount: (data.contacts || []).length,
                pitchCount: (data.pitches || []).length,
                ideaCount: (data.ideas || []).length
            });
            setRecommendations(recs.slice(0, 2)); // Top 2 important actions

            // Activity Aggregation
            const rawActivities: ActivityItem[] = [
                ...(data.salesEvents || []).map(s => ({ action: "Ny försäljning", target: `${s.amount} kr`, time: formatRelativeTime(s.occurred_at), timestamp: new Date(s.occurred_at).getTime() })),
                ...(data.contacts || []).map(l => ({ action: t('dashboard.overviewContent.act1'), target: l.name, time: formatRelativeTime(l.created_at), timestamp: new Date(l.created_at).getTime() })),
                ...(data.pitches || []).map(p => ({ action: t('dashboard.overviewContent.act2'), target: p.name, time: formatRelativeTime(p.created_at), timestamp: new Date(p.created_at).getTime() })),
                ...(data.ideas || []).map(i => ({ action: t('dashboard.overviewContent.act3'), target: i.title, time: formatRelativeTime(i.created_at), timestamp: new Date(i.created_at).getTime() }))
            ];

            setActivities(rawActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));

        } catch (error) {
            console.error("Data load failed", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user.id, t]);

  const handleRecommendationClick = (rec: Recommendation) => {
      if (rec.kind === 'UF_EVENT' && onPlanEvent) {
          // Trigger special planning flow for UF events
          onPlanEvent(`Hjälp mig planera inför ${rec.title}. ${rec.description}`);
      } else {
          // Default behavior
          setView('crm');
      }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">
          {t('dashboard.overviewContent.greeting', {name: user.firstName})}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('dashboard.overviewContent.subtitle', {company: user.company || 'Ditt UF-företag'})}
        </p>
      </div>

      {/* Recommendations Banner */}
      {recommendations.length > 0 && (
        <div className="grid gap-4 mb-8">
            {recommendations.map(rec => (
                <div key={rec.id} className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-200 shrink-0">
                            {rec.kind === 'UF_EVENT' || rec.kind === 'DEADLINE' ? <Clock size={20}/> : <Target size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{rec.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{rec.description}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleRecommendationClick(rec)} 
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-blue-700 transition-all shrink-0"
                    >
                        {rec.ctaLabel}
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest">Nätverk</span>
                <Users size={20} className="text-gray-400" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.leadsCount}</span>
                <span className="text-green-600 text-xs font-bold uppercase bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Kontakter</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest">Pitchar</span>
                <Mic size={20} className="text-gray-400" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.pitchCount}</span>
                <span className="text-gray-400 text-xs font-bold uppercase">Skapade</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest">Idébank</span>
                <Clock size={20} className="text-gray-400" />
            </div>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{stats.ideaCount}</span>
                <span className="text-gray-400 text-xs font-bold uppercase">Koncept</span>
            </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
            <h3 className="font-serif-display text-2xl text-gray-900 dark:text-white">{t('dashboard.overviewContent.actionsTitle')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
                <button onClick={() => setView('ideas')} className="group bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors text-left shadow-sm">
                    <div className="w-10 h-10 bg-beige-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors"><ArrowUpRight size={20} /></div>
                    <h4 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">{t('dashboard.overviewContent.actValidate')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.overviewContent.actValidateDesc')}</p>
                </button>

                <button onClick={() => setView('crm')} className="group bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors text-left shadow-sm">
                    <div className="w-10 h-10 bg-beige-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors"><Users size={20} /></div>
                    <h4 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">CRM & Sälj</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hantera kunder och logga försäljning.</p>
                </button>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm h-fit">
            <h3 className="font-serif-display text-xl mb-6 text-gray-900 dark:text-white">{t('dashboard.overviewContent.activityTitle')}</h3>
            <div className="space-y-6">
                {activities.length > 0 ? activities.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-2 rounded-full bg-black dark:bg-white shrink-0"></div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate">{item.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.target}</p>
                        </div>
                        <span className="ml-auto text-[10px] font-bold uppercase text-gray-400 whitespace-nowrap pl-2">{item.time}</span>
                    </div>
                )) : (
                    <div className="text-center py-8 opacity-40">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-gray-300" />
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
