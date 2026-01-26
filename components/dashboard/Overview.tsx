
import React, { useEffect, useState } from 'react';
import { 
    ArrowUpRight, TrendingUp, Users, Mic, Clock, Loader2, Target, 
    CheckCircle2, Sparkles, ChevronRight, Zap, Briefcase, Globe,
    Plus, X, Calendar as CalendarIcon, AlertCircle, Check
} from 'lucide-react';
import { DashboardView, User, Recommendation, Task } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface OverviewProps {
    user: User;
    setView: (view: DashboardView, metadata?: any) => void;
    onPlanEvent?: (prompt: string) => void;
}

interface ActivityItem {
    action: string;
    target: string;
    time: string;
    timestamp: number;
}

const Overview: React.FC<OverviewProps> = ({ user, setView, onPlanEvent }) => {
  const { activeWorkspace, viewScope } = useWorkspace();
  const [stats, setStats] = useState({ leadsCount: 0, pitchCount: 0, ideaCount: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });

  const { t } = useLanguage();

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
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

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await db.getUserData(user.id);
        const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
        const recs = await db.getRecommendations(user.id, workspaceId);
        
        const filterScope = (item: any) => {
            const itemId = item.workspace_id;
            if (viewScope === 'personal') return !itemId;
            return activeWorkspace?.id && itemId === activeWorkspace.id;
        };

        const filteredContacts = (data.contacts || []).filter(filterScope);
        const filteredIdeas = (data.ideas || []).filter(filterScope);
        const filteredSales = (data.salesEvents || []).filter(filterScope);
        const filteredProjects = (data.pitchProjects || []).filter(filterScope);
        const filteredTasks = (data.tasks || []).filter(filterScope).filter(t => t.status === 'pending');

        setStats({
            leadsCount: filteredContacts.length,
            pitchCount: filteredProjects.length, 
            ideaCount: filteredIdeas.length
        });
        setRecommendations(recs);
        setTasks(filteredTasks.sort((a,b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }));

        const rawActivities: ActivityItem[] = [
            ...filteredSales.map(s => ({ action: "Ny försäljning", target: `${s.amount} kr`, time: formatRelativeTime(s.occurred_at), timestamp: new Date(s.occurred_at).getTime() })),
            ...filteredContacts.map(l => ({ action: t('dashboard.overviewContent.act1'), target: l.name, time: formatRelativeTime(l.created_at), timestamp: new Date(l.created_at).getTime() })),
            ...filteredProjects.map(p => ({ action: t('dashboard.overviewContent.act2'), target: p.title, time: formatRelativeTime(p.created_at), timestamp: new Date(p.created_at).getTime() })),
            ...filteredIdeas.map(i => ({ action: t('dashboard.overviewContent.act3'), target: i.title, time: formatRelativeTime(i.created_at), timestamp: new Date(i.created_at).getTime() }))
        ];

        setActivities(rawActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));

    } catch (error) {
        console.error("Data load failed", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id, t, activeWorkspace, viewScope]);

  const handleRecommendationClick = (rec: Recommendation) => {
      if (rec.linked_tool) {
          setView(rec.linked_tool, rec.metadata);
      } else if (rec.kind === 'UF_EVENT' && onPlanEvent) {
          onPlanEvent(`Hjälp mig planera inför ${rec.title}. ${rec.description}`);
      } else {
          setView('crm');
      }
  };

  const handleTaskClick = (task: Task) => {
      if (task.linked_tool) {
          setView(task.linked_tool, task.metadata);
      }
  };

  const handleCompleteTask = async (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await db.completeTask(taskId);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    setIsSavingTask(true);
    try {
        const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
        const task = await db.createTask(user.id, workspaceId, {
            title: newTask.title,
            description: newTask.description,
            due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
            status: 'pending'
        });
        setTasks(prev => [task, ...prev].sort((a,b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }));
        setShowTaskModal(false);
        setNewTask({ title: '', description: '', dueDate: '' });
    } catch (err) {
        console.error(err);
    } finally {
        setIsSavingTask(false);
    }
  };

  const isOverdue = (dateStr?: string) => {
      if (!dateStr) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(dateStr) < today;
  };

  const isToday = (dateStr?: string) => {
      if (!dateStr) return false;
      return new Date(dateStr).toDateString() === new Date().toDateString();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="animate-fadeIn pb-24">
      
      {/* ADD TASK MODAL */}
      {showTaskModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-3xl animate-slideUp border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black">
                              <Plus size={20} />
                          </div>
                          <h2 className="font-serif-display text-2xl">Ny Uppgift</h2>
                      </div>
                      <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"><X size={24}/></button>
                  </div>

                  <form onSubmit={handleCreateTask} className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Titel *</label>
                          <input 
                              autoFocus 
                              required 
                              value={newTask.title} 
                              onChange={e => setNewTask({...newTask, title: e.target.value})}
                              placeholder="Vad behöver göras?" 
                              className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-lg border-2 border-transparent focus:border-black dark:focus:border-white transition-all dark:text-white"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Beskrivning</label>
                          <textarea 
                              value={newTask.description} 
                              onChange={e => setNewTask({...newTask, description: e.target.value})}
                              placeholder="Detaljer (valfritt)..." 
                              className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-sm border-2 border-transparent focus:border-black dark:focus:border-white transition-all resize-none dark:text-white"
                              rows={3}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Deadline</label>
                          <div className="relative">
                              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <input 
                                  type="date" 
                                  value={newTask.dueDate} 
                                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                                  className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-black dark:focus:border-white transition-all dark:text-white"
                              />
                          </div>
                      </div>
                      <button 
                          type="submit" 
                          disabled={isSavingTask || !newTask.title.trim()} 
                          className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                      >
                          {isSavingTask ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Spara Uppgift'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <div className="mb-8">
        <h1 className="font-serif-display text-4xl mb-2 text-gray-900 dark:text-white">
          {t('dashboard.overviewContent.greeting', {name: user.firstName})}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('dashboard.overviewContent.subtitle', {company: user.company || 'Ditt UF-företag'})}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-8">
              
              {/* Recommendations Banner */}
              {recommendations.length > 0 && (
                <div className="grid gap-4">
                    {recommendations.map(rec => (
                        <div key={rec.id} className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-100 p-6 rounded-3xl text-white dark:text-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl hover:scale-[1.01] transition-transform">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/10 dark:bg-black/5 rounded-2xl flex items-center justify-center shrink-0">
                                    <Sparkles size={24} className="text-blue-400 dark:text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{rec.title}</h4>
                                    <p className="text-sm opacity-70">{rec.description}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRecommendationClick(rec)} 
                                className="px-6 py-3 bg-white dark:bg-black text-black dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shrink-0"
                            >
                                {rec.ctaLabel}
                            </button>
                        </div>
                    ))}
                </div>
              )}

              {/* Tasks / Action Center */}
              <section className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <Target size={20} />
                          </div>
                          <h3 className="font-serif-display text-2xl">Action Center</h3>
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">{tasks.length} Uppgifter</span>
                          <button onClick={() => setShowTaskModal(true)} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-110 transition-transform shadow-lg">
                              <Plus size={18} />
                          </button>
                      </div>
                  </div>

                  {tasks.length > 0 ? (
                      <div className="space-y-3">
                          {tasks.map(task => {
                              const overdue = isOverdue(task.due_date);
                              const today = isToday(task.due_date);
                              
                              return (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskClick(task)}
                                    className="group flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-black dark:hover:border-white transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {overdue && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>}
                                    <div className="flex items-start gap-4">
                                        <button 
                                            onClick={(e) => handleCompleteTask(e, task.id)}
                                            className="w-7 h-7 rounded-full border-2 border-gray-300 dark:border-gray-600 mt-1 flex items-center justify-center hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group/btn"
                                        >
                                            <Check size={16} className="text-green-500 opacity-0 group-hover/btn:opacity-100 scale-75 group-hover/btn:scale-100 transition-all" />
                                        </button>
                                        <div>
                                            <h4 className={`font-bold text-gray-900 dark:text-white text-sm ${overdue ? 'text-red-600 dark:text-red-400' : ''}`}>{task.title}</h4>
                                            {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{task.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {task.due_date && (
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                                                today ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-white dark:bg-gray-700 text-gray-400 border border-black/5'
                                            }`}>
                                                <CalendarIcon size={10} />
                                                {today ? 'Idag' : overdue ? 'Försenad' : new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                        {task.linked_tool && (
                                            <div className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all">
                                                <ArrowUpRight size={18} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem]">
                          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 size={32} className="text-green-500" />
                          </div>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Allt klart för idag!</p>
                          <button onClick={() => setShowTaskModal(true)} className="mt-4 text-xs font-bold text-black dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity">Lägg till något nytt</button>
                      </div>
                  )}
              </section>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Nätverk" value={stats.leadsCount} unit="Kontakter" icon={<Users size={20} />} trend="+5" />
                <StatCard label="Pitchar" value={stats.pitchCount} unit="Skapade" icon={<Mic size={20} />} trend="+1" />
                <StatCard label="Idébank" value={stats.ideaCount} unit="Koncept" icon={<Clock size={20} />} />
              </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
              {/* Quick Navigation */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 italic">Verktyg</h3>
                  <div className="grid grid-cols-1 gap-2">
                      <ToolLink icon={<Zap size={16}/>} label="UF-Kompassen" onClick={() => setView('ideas')} />
                      <ToolLink icon={<Briefcase size={16}/>} label="CRM & Sälj" onClick={() => setView('crm')} />
                      <ToolLink icon={<Globe size={16}/>} label="Marketing Engine" onClick={() => setView('marketing')} />
                      <ToolLink icon={<Target size={16}/>} label="Pitch Studio" onClick={() => setView('pitch')} />
                  </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
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
    </div>
  );
};

const StatCard = ({ label, value, unit, icon, trend }: any) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-black dark:hover:border-white transition-all">
        <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{label}</span>
            <div className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
            <div className="flex items-end gap-2">
                <span className="text-4xl font-serif-display text-gray-900 dark:text-white">{value}</span>
                <span className="text-gray-400 text-[10px] font-bold uppercase mb-1.5">{unit}</span>
            </div>
            {trend && <span className="text-green-500 text-[10px] font-black bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mb-1">{trend}</span>}
        </div>
    </div>
);

const ToolLink = ({ icon, label, onClick }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-black dark:group-hover:text-white group-hover:bg-white dark:group-hover:bg-black shadow-sm transition-all">{icon}</div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-black dark:hover:text-white">{label}</span>
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-black dark:hover:text-white transform group-hover:translate-x-1 transition-all" />
    </button>
);

export default Overview;
