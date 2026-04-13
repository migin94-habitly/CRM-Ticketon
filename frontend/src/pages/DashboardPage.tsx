import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, Users, Phone, MessageSquare, DollarSign,
  Target, Zap, Award, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { analyticsAPI } from '../api';
import type { DashboardMetrics } from '../types';
import { formatCurrency, formatCurrencyCompact, formatDuration } from '../utils/format';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsAPI.dashboard(period)
      .then((r) => setMetrics(r.data.data || null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <DashboardSkeleton />;
  if (!metrics) return <div className="text-slate-500">Ошибка загрузки метрик</div>;

  const pipelineBreakdown = metrics.pipeline_breakdown ?? [];
  const activityBreakdown = metrics.activity_breakdown ?? [];
  const revenueByMonth = metrics.revenue_by_month ?? [];
  const topPerformers = metrics.top_performers ?? [];
  const aiInsights = metrics.ai_insights ?? [];

  const conversionUp = metrics.conversion_rate >= 30;

  const PERIOD_LABELS: Record<string, string> = { week: 'Неделя', month: 'Месяц', quarter: 'Квартал', year: 'Год' };

  const ACTIVITY_LABELS: Record<string, string> = {
    call: 'Звонки', email: 'Email', meeting: 'Встречи',
    note: 'Заметки', task: 'Задачи', whatsapp: 'WhatsApp',
  };
  const translatedActivity = activityBreakdown.map(a => ({ ...a, type: ACTIVITY_LABELS[a.type] ?? a.type }));

  // Use sum of funnel stage counts as denominator to avoid skew from orphaned deals
  const totalInFunnel = pipelineBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Главная</h1>
          <p className="text-slate-500 text-sm">Обзор показателей продаж</p>
        </div>
        <div className="flex gap-1 bg-dark-800 p-1 rounded-lg border border-slate-700">
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {PERIOD_LABELS[p] || p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Общая выручка"
          value={formatCurrency(metrics.won_value)}
          icon={DollarSign}
          color="text-green-400"
          bg="bg-green-500/10"
          change={`${metrics.won_deals} закрытых сделок`}
          up
        />
        <KPICard
          title="Конверсия"
          value={`${metrics.conversion_rate.toFixed(1)}%`}
          icon={Target}
          color={conversionUp ? 'text-primary-400' : 'text-orange-400'}
          bg={conversionUp ? 'bg-primary-500/10' : 'bg-orange-500/10'}
          change={conversionUp ? 'Выше целевого' : 'Ниже целевого'}
          up={conversionUp}
        />
        <KPICard
          title="Всего контактов"
          value={metrics.total_contacts.toLocaleString()}
          icon={Users}
          color="text-blue-400"
          bg="bg-blue-500/10"
          change={`+${metrics.new_contacts_today} сегодня`}
          up
        />
        <KPICard
          title="Звонков совершено"
          value={metrics.total_calls.toLocaleString()}
          icon={Phone}
          color="text-purple-400"
          bg="bg-purple-500/10"
          change={formatDuration(metrics.total_call_duration)}
          up
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Выручка по месяцам</h3>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrencyCompact} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [formatCurrency(v), 'Выручка']}
              />
              <Area type="monotone" dataKey="won" stroke="#6366f1" strokeWidth={2} fill="url(#wonGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-white mb-4">Этапы воронки</h3>
          <div className="space-y-3">
            {pipelineBreakdown.map((s) => (
              <div key={s.stage_id}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{s.stage_name || '—'}</span>
                  <span>{s.count} сделок</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${totalInFunnel > 0 ? (s.count / totalInFunnel) * 100 : 0}%`,
                      background: s.color || '#6366f1',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {pipelineBreakdown.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pipelineBreakdown} dataKey="count" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                    {pipelineBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(v: number) => [v, 'Сделок']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-white mb-4">Активности</h3>
          {translatedActivity.every(a => a.count === 0) ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-xs">
              Нет активностей за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={translatedActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => [v, 'Кол-во']} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-400" />
            <h3 className="font-semibold text-white">Лучшие сотрудники</h3>
          </div>
          <div className="space-y-3">
            {topPerformers.slice(0, 4).map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className="text-xs text-slate-600 w-4 font-bold">{i + 1}</div>
                <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.deals_won} выиграл · {formatCurrency(p.revenue)}</div>
                </div>
                <div className="text-xs text-green-400 font-semibold">{p.calls_made} звонков</div>
              </div>
            ))}
            {topPerformers.length === 0 && (
              <div className="text-slate-500 text-xs">Нет данных</div>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary-400" />
            <h3 className="font-semibold text-white">ИИ-аналитика</h3>
          </div>
          <div className="space-y-2.5">
            {aiInsights.map((insight, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-400">
                <div className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                {insight}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-500">Сообщений: {metrics.total_messages}</div>
              <div className="text-xs text-slate-500">Средняя сделка: {formatCurrency(metrics.avg_deal_value)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  change: string;
  up: boolean;
}

function KPICard({ title, value, icon: Icon, color, bg, change, up }: KPICardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className={`flex items-center gap-0.5 text-xs ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-xs text-slate-600">{change}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="h-7 bg-dark-800 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-24 sm:h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card h-56 lg:col-span-2" />
        <div className="card h-56" />
      </div>
    </div>
  );
}
