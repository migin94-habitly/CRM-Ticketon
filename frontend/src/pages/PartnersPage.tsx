import { useEffect, useState } from 'react';
import { Plus, Search, Building2, Phone, Mail, MapPin, TrendingUp } from 'lucide-react';
import { partnersAPI } from '../api';
import type { Partner } from '../types';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import PartnerModal from '../components/partners/PartnerModal';
import ImportExportBar from '../components/ImportExportBar';

const statusRu: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Активный',  cls: 'bg-green-500/10 text-green-400' },
  inactive: { label: 'Неактивный', cls: 'bg-slate-500/10 text-slate-400' },
  prospect: { label: 'Лид',       cls: 'bg-yellow-500/10 text-yellow-400' },
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const load = () => {
    setLoading(true);
    partnersAPI.list({ search, status: statusFilter })
      .then(r => setPartners((r.data.data as Partner[]) || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить партнёра?')) return;
    try {
      await partnersAPI.delete(id);
      toast.success('Партнёр удалён');
      load();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-400" />
            Партнёры
          </h1>
          <p className="text-slate-500 text-sm">{partners.length} организаторов мероприятий</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportExportBar
            entityName="партнёров"
            filename="partners"
            onExport={() => partnersAPI.exportCSV() as Promise<{ data: Blob }>}
            onImport={(file) => partnersAPI.importCSV(file) as ReturnType<typeof partnersAPI.importCSV>}
            onImportSuccess={load}
          />
          <button className="btn-primary text-sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Добавить партнёра
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 text-sm"
            placeholder="Поиск по названию, контакту, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="active">Активный</option>
          <option value="inactive">Неактивный</option>
          <option value="prospect">Лид</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Загрузка...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Партнёры не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map(p => {
            const st = statusRu[p.status] || { label: p.status, cls: 'bg-slate-500/10 text-slate-400' };
            return (
              <div key={p.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <a href={`/partners/${p.id}`} className="text-sm font-semibold text-white hover:text-primary-400 transition block truncate">
                      {p.name}
                    </a>
                    {p.contact_person && (
                      <div className="text-xs text-slate-500 mt-0.5">{p.contact_person}</div>
                    )}
                  </div>
                  <span className={`badge ml-2 shrink-0 ${st.cls}`}>{st.label}</span>
                </div>

                <div className="space-y-1">
                  {p.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      {p.phone}
                    </div>
                  )}
                  {p.city && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      {p.city.name}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1 border-t border-slate-700/50">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{p.deals_count ?? 0} сделок</span>
                  </div>
                  {(p.total_revenue ?? 0) > 0 && (
                    <div className="text-xs text-green-400">
                      {formatCurrency(p.total_revenue ?? 0, 'KZT')}
                    </div>
                  )}
                  {(p.commission_rate ?? 0) > 0 && (
                    <div className="text-xs text-slate-500 ml-auto">
                      {p.commission_rate}% комиссия
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <a href={`/partners/${p.id}`} className="btn-secondary text-xs py-1 flex-1 justify-center">
                    Подробнее
                  </a>
                  <button className="btn-secondary text-xs py-1 px-3" onClick={() => { setEditing(p); setModalOpen(true); }}>
                    Ред.
                  </button>
                  <button className="btn-danger text-xs py-1 px-3" onClick={() => handleDelete(p.id)}>
                    Удал.
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <PartnerModal
          partner={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}
