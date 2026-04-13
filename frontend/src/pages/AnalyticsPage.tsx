import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Zap, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { analyticsAPI } from '../api';
import type { DashboardMetrics } from '../types';
import { formatCurrency, formatCurrencyCompact } from '../utils/format';

interface ForecastItem { month: string; forecast: number; pipeline: number; }

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAPI.dashboard(period),
      analyticsAPI.forecast(),
    ]).then(([dm, fc]) => {
      setMetrics(dm.data.data || null);
      const fcData = (fc.data.data as { forecast?: ForecastItem[] })?.forecast || [];
      setForecast(fcData);
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="text-slate-500 animate-pulse">Загрузка аналитики...</div>;
  if (!metrics) return <div className="text-slate-500">Ошибка загрузки</div>;

  const ACTIVITY_LABELS: Record<string, string> = {
    call: 'Звонки', email: 'Email', meeting: 'Встречи',
    note: 'Заметки', task: 'Задачи', whatsapp: 'WhatsApp',
  };
  const translatedActivity = (metrics.activity_breakdown ?? []).map(a => ({
    ...a, type: ACTIVITY_LABELS[a.type] ?? a.type,
  }));
  const hasActivity = translatedActivity.some(a => a.count > 0);

  const totalInFunnel = (metrics.pipeline_breakdown ?? []).reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Аналитика и ИИ</h1>
          <p className="text-slate-500 text-sm">Глубокая аналитика продаж</p>
        </div>
        <div className="flex gap-1 bg-dark-800 p-1 rounded-lg border border-slate-700">
          {(['week', 'month', 'quarter', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${period === p ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {({week:'Неделя',month:'Месяц',quarter:'Квартал',year:'Год'} as Record<string,string>)[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 border border-primary-500/30 bg-primary-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-white">ИИ-аналитика продаж</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {metrics.ai_insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
              {insight}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.won_value)}</div>
          <div className="text-xs text-slate-500">Выручка (выиграно)</div>
          <div className="text-xs text-green-400">{metrics.won_deals} сделок закрыто</div>
        </div>
        <div className="stat-card">
          <Target className="w-5 h-5 text-primary-400" />
          <div className="text-2xl font-bold text-white">{metrics.conversion_rate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Конверсия</div>
          <div className="text-xs text-slate-500">{metrics.total_deals} сделок всего</div>
        </div>
        <div className="stat-card">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.avg_deal_value)}</div>
          <div className="text-xs text-slate-500">Средняя сделка</div>
          <div className="text-xs text-slate-500">Воронка: {formatCurrency(metrics.total_value)}</div>
        </div>
        <div className="stat-card">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div className="text-2xl font-bold text-white">{metrics.total_calls}</div>
          <div className="text-xs text-slate-500">Звонки</div>
          <div className="text-xs text-slate-500">{metrics.total_messages} сообщений</div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" /> Динамика выручки
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={metrics.revenue_by_month}>
            <defs>
              <linearGradient id="wonG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrencyCompact} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(v: number) => [formatCurrency(v)]} />
            <Area type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} fill="url(#wonG)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {forecast.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" /> Прогноз ИИ (взвешенная воронка)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrencyCompact} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number) => [formatCurrency(v)]} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="pipeline" fill="#6366f1" opacity={0.5} radius={[4,4,0,0]} name="Воронка" />
              <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Прогноз ИИ" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-600 mt-2">Прогноз = воронка × вероятность выигрыша</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Разбивка активностей</h3>
          {!hasActivity ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Нет активностей за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={translatedActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="type" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => [v, 'Кол-во']} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Эффективность менеджеров</h3>
          <div className="space-y-3">
            {metrics.top_performers.map((p, i) => (
              <div key={p.user_id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-2">
                    <span className="text-slate-600 w-3">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="text-green-400">{formatCurrency(p.revenue)}</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{
                      width: `${metrics.top_performers[0]?.revenue > 0
                        ? (p.revenue / metrics.top_performers[0].revenue) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
            {metrics.top_performers.length === 0 && (
              <div className="text-slate-500 text-sm">Нет данных</div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Здоровье воронки</h3>
        {(metrics.pipeline_breakdown ?? []).length === 0 ? (
          <div className="text-slate-500 text-sm">Нет данных по этапам воронки</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(metrics.pipeline_breakdown ?? []).map(stage => (
                <div key={stage.stage_id || stage.stage_name} className="p-3 rounded-lg border border-slate-700/50"
                  style={{ borderLeftColor: stage.color || '#6366f1', borderLeftWidth: 3 }}>
                  <div className="text-xs text-slate-500">{stage.stage_name || '—'}</div>
                  <div className="text-lg font-bold text-white mt-1">{stage.count}</div>
                  <div className="text-xs text-slate-400">{formatCurrency(stage.value)}</div>
                  {totalInFunnel > 0 && (
                    <div className="mt-2 h-1 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(stage.count / totalInFunnel) * 100}%`, background: stage.color || '#6366f1' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalInFunnel > 0 && (
              <p className="text-xs text-slate-600 mt-3">Итого в воронке: {totalInFunnel} сделок</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
