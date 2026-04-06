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
import { formatCurrency, formatDuration } from '../utils/format';

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
  if (!metrics) return <div className="text-slate-500">Failed to load metrics</div>;

  const conversionUp = metrics.conversion_rate >= 30;

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm">Sales performance overview</p>
        </div>
        <div className="flex gap-1 bg-dark-800 p-1 rounded-lg border border-slate-700">
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(metrics.won_value)}
          icon={DollarSign}
          color="text-green-400"
          bg="bg-green-500/10"
          change={`${metrics.won_deals} won deals`}
          up
        />
        <KPICard
          title="Conversion Rate"
          value={`${metrics.conversion_rate.toFixed(1)}%`}
          icon={Target}
          color={conversionUp ? 'text-primary-400' : 'text-orange-400'}
          bg={conversionUp ? 'bg-primary-500/10' : 'bg-orange-500/10'}
          change={conversionUp ? 'Above target' : 'Below target'}
          up={conversionUp}
        />
        <KPICard
          title="Total Contacts"
          value={metrics.total_contacts.toLocaleString()}
          icon={Users}
          color="text-blue-400"
          bg="bg-blue-500/10"
          change={`+${metrics.new_contacts_today} today`}
          up
        />
        <KPICard
          title="Calls Made"
          value={metrics.total_calls.toLocaleString()}
          icon={Phone}
          color="text-purple-400"
          bg="bg-purple-500/10"
          change={formatDuration(metrics.total_call_duration)}
          up
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Revenue by Month</h3>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics.revenue_by_month}>
              <defs>
                <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [formatCurrency(v), 'Won']}
              />
              <Area type="monotone" dataKey="won" stroke="#6366f1" strokeWidth={2} fill="url(#wonGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Pipeline Stages</h3>
          <div className="space-y-3">
            {metrics.pipeline_breakdown.map((s) => (
              <div key={s.stage_id}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{s.stage_name}</span>
                  <span>{s.count} deals</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${metrics.total_deals > 0 ? (s.count / metrics.total_deals) * 100 : 0}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {metrics.pipeline_breakdown.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={metrics.pipeline_breakdown} dataKey="count" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                    {metrics.pipeline_breakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(v: number, _: string, p: { payload: { stage_name: string } }) => [v, p.payload.stage_name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Activities</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={metrics.activity_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top performers */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-400" />
            <h3 className="font-semibold text-white">Top Performers</h3>
          </div>
          <div className="space-y-3">
            {metrics.top_performers.slice(0, 4).map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className="text-xs text-slate-600 w-4 font-bold">{i + 1}</div>
                <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.deals_won} won · {formatCurrency(p.revenue)}</div>
                </div>
                <div className="text-xs text-green-400 font-semibold">{p.calls_made} calls</div>
              </div>
            ))}
            {metrics.top_performers.length === 0 && (
              <div className="text-slate-500 text-xs">No data yet</div>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary-400" />
            <h3 className="font-semibold text-white">AI Insights</h3>
          </div>
          <div className="space-y-2.5">
            {metrics.ai_insights.map((insight, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-400">
                <div className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                {insight}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-500">Messages: {metrics.total_messages}</div>
              <div className="text-xs text-slate-500">Avg deal: {formatCurrency(metrics.avg_deal_value)}</div>
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
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-dark-800 rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card h-64 col-span-2" />
        <div className="card h-64" />
      </div>
    </div>
  );
}
