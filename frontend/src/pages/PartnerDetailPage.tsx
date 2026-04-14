import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, Phone, Mail, MapPin, Globe, FileText,
  TrendingUp, Target, Percent, Ticket, ArrowLeft, Edit2,
  Calendar, MessageSquare, ListTodo, CheckCircle2, Clock
} from 'lucide-react';
import { partnersAPI } from '../api';
import type { Partner, PartnerStats, Deal, Activity } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import PartnerModal from '../components/partners/PartnerModal';
import PartnerDocuments from '../components/partners/PartnerDocuments';
import { useAppSelector } from '../hooks/useAppDispatch';

const statusRu: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Активный',  cls: 'bg-green-500/10 text-green-400' },
  inactive: { label: 'Неактивный', cls: 'bg-slate-500/10 text-slate-400' },
  prospect: { label: 'Лид',       cls: 'bg-yellow-500/10 text-yellow-400' },
};

const priorityRu: Record<string, string> = {
  high: 'Высокий', medium: 'Средний', low: 'Низкий'
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  call:     <Phone className="w-3.5 h-3.5" />,
  email:    <Mail className="w-3.5 h-3.5" />,
  meeting:  <Calendar className="w-3.5 h-3.5" />,
  note:     <FileText className="w-3.5 h-3.5" />,
  task:     <ListTodo className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
};

const activityTypeColors: Record<string, string> = {
  call:     'bg-green-500/10 text-green-400',
  email:    'bg-blue-500/10 text-blue-400',
  meeting:  'bg-purple-500/10 text-purple-400',
  note:     'bg-yellow-500/10 text-yellow-400',
  task:     'bg-orange-500/10 text-orange-400',
  whatsapp: 'bg-emerald-500/10 text-emerald-400',
};

const activityTypeRu: Record<string, string> = {
  call: 'Звонок', email: 'Email', meeting: 'Встреча',
  note: 'Заметка', task: 'Задача', whatsapp: 'WhatsApp',
};

interface DealSummary extends Partial<Deal> {
  stage_name: string;
  stage_color: string;
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [recentDeals, setRecentDeals] = useState<DealSummary[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const userRole = useAppSelector((s) => s.auth.user?.role ?? '');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pr, sr, ar] = await Promise.all([
        partnersAPI.get(id),
        partnersAPI.getStats(id),
        partnersAPI.getActivities(id),
      ]);
      setPartner(pr.data.data as Partner);
      const sd = sr.data.data as { stats: PartnerStats; recent_deals: DealSummary[] };
      setStats(sd.stats);
      setRecentDeals(sd.recent_deals || []);
      setActivities((ar.data.data as Activity[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Загрузка...</div>;
  if (!partner) return <div className="text-slate-500 p-8">Партнёр не найден</div>;

  const st = statusRu[partner.status] || { label: partner.status, cls: 'bg-slate-500/10 text-slate-400' };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link to="/partners" className="text-slate-500 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{partner.name}</h1>
            <span className={`badge ${st.cls}`}>{st.label}</span>
          </div>
          {partner.city && (
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {partner.city.name}, {partner.city.country}
            </div>
          )}
        </div>
        <button className="btn-secondary text-sm" onClick={() => setEditOpen(true)}>
          <Edit2 className="w-3.5 h-3.5" /> Редактировать
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <div className="text-2xl font-bold text-white">{stats.total_deals}</div>
            <div className="text-xs text-slate-500">Всего сделок</div>
            <div className="text-xs text-slate-600">{stats.won_deals} выиграно · {stats.lost_deals} проиграно</div>
          </div>
          <div className="stat-card">
            <Target className="w-5 h-5 text-green-400" />
            <div className="text-2xl font-bold text-white">{stats.conversion_rate.toFixed(1)}%</div>
            <div className="text-xs text-slate-500">Конверсия</div>
            <div className="text-xs text-slate-600">{stats.active_deals} активных</div>
          </div>
          <div className="stat-card">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_revenue, 'KZT')}</div>
            <div className="text-xs text-slate-500">Выручка</div>
            <div className="text-xs text-slate-600">ср. {formatCurrency(stats.avg_deal_value, 'KZT')}</div>
          </div>
          <div className="stat-card">
            <Ticket className="w-5 h-5 text-yellow-400" />
            <div className="text-2xl font-bold text-white">{stats.total_tickets.toLocaleString('ru')}</div>
            <div className="text-xs text-slate-500">Билетов</div>
            <div className="text-xs text-slate-600">{partner.commission_rate}% комиссия</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-white">Информация о партнёре</h3>
          <div className="space-y-2.5">
            {partner.contact_person && (
              <InfoRow icon={<Building2 className="w-4 h-4 text-slate-500" />} label="Контактное лицо" value={partner.contact_person} />
            )}
            {partner.email && (
              <InfoRow icon={<Mail className="w-4 h-4 text-slate-500" />} label="Email" value={partner.email} />
            )}
            {partner.phone && (
              <InfoRow icon={<Phone className="w-4 h-4 text-slate-500" />} label="Телефон" value={partner.phone} />
            )}
            {partner.website && (
              <InfoRow icon={<Globe className="w-4 h-4 text-slate-500" />} label="Сайт" value={partner.website} />
            )}
            {partner.contract_number && (
              <InfoRow icon={<FileText className="w-4 h-4 text-slate-500" />} label="Договор №" value={partner.contract_number} />
            )}
            {partner.contract_date && (
              <InfoRow icon={<FileText className="w-4 h-4 text-slate-500" />} label="Дата договора" value={formatDate(partner.contract_date)} />
            )}
            {partner.commission_rate > 0 && (
              <InfoRow icon={<Percent className="w-4 h-4 text-slate-500" />} label="Комиссия" value={`${partner.commission_rate}%`} />
            )}
          </div>
          {partner.notes && (
            <div className="pt-2 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Заметки</div>
              <p className="text-sm text-slate-400">{partner.notes}</p>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">Сделки партнёра</h3>
          {recentDeals.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">Сделок нет</div>
          ) : (
            <div className="space-y-2">
              {recentDeals.map(d => (
                <Link
                  key={d.id}
                  to={`/deals/${d.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: d.stage_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition">
                      {d.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{d.stage_name}</span>
                      {d.event_name && (
                        <span className="text-xs text-slate-600">· {d.event_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-green-400">
                      {formatCurrency(d.value ?? 0, 'KZT')}
                    </div>
                    {d.priority && (
                      <div className="text-xs text-slate-500">{priorityRu[d.priority] || d.priority}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Активности партнёра */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Активности партнёра</h3>
        {activities.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-6">Активностей нет</div>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div
                key={a.id}
                className={`flex items-start gap-3 p-3 rounded-lg border border-slate-700/30 ${a.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activityTypeColors[a.type] || 'bg-slate-500/10 text-slate-400'}`}>
                  {activityTypeIcons[a.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{a.subject}</div>
                  {a.description && <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-600">{activityTypeRu[a.type] || a.type}</span>
                    {a.due_date && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />{formatDateTime(a.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {a.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <span className="badge text-xs bg-yellow-500/10 text-yellow-400">Ожидание</span>
                  )}
                  <span className="text-xs text-slate-600">{formatDateTime(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PartnerDocuments
        partnerId={partner.id}
        canUpload={['admin', 'manager', 'sales'].includes(userRole)}
        canDelete={['admin', 'manager'].includes(userRole)}
      />

      {editOpen && (
        <PartnerModal
          partner={partner}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-300">{value}</div>
      </div>
    </div>
  );
}

function formatDate(s?: string) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
