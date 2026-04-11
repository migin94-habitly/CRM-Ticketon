import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, DollarSign, Filter } from 'lucide-react';
import { dealsAPI } from '../api';
import type { Deal } from '../types';
import { formatCurrency, formatDate, priorityColor } from '../utils/format';
import DealModal from '../components/deals/DealModal';
import toast from 'react-hot-toast';

export default function DealsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    dealsAPI.list({ page, limit: 20, search })
      .then((r) => {
        setDeals(r.data.data || []);
        setTotal(r.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить эту сделку?')) return;
    await dealsAPI.delete(id);
    toast.success('Сделка удалена');
    load();
  };

  const totalValue = deals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Сделки</h1>
          <p className="text-slate-500 text-sm">{total} сделок · {formatCurrency(totalValue)} в воронке</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate('/pipeline')}>
            Вид воронки
          </button>
          <button className="btn-primary" onClick={() => { setEditDeal(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Новая сделка
          </button>
        </div>
      </div>

      <div className="card p-3 flex gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 py-1.5 text-sm" placeholder="Поиск сделок..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Filter className="w-4 h-4 text-slate-500 self-center" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Сделка</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Контакт</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Стадия</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Сумма</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Приоритет</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Дата закрытия</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Загрузка...</td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Сделки не найдены</td></tr>
            ) : deals.map((d) => (
              <tr key={d.id} className="table-row cursor-pointer" onClick={() => navigate(`/deals/${d.id}`)}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{d.title}</div>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {d.contact ? `${d.contact.first_name} ${d.contact.last_name}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {d.stage && (
                    <span className="badge" style={{ background: `${d.stage.color}20`, color: d.stage.color }}>
                      {d.stage.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-green-400" />
                    {formatCurrency(d.value, d.currency)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${priorityColor(d.priority)}`}>{{high:'Высокий',medium:'Средний',low:'Низкий'}[d.priority]||d.priority}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {d.close_date ? formatDate(d.close_date) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setEditDeal(d); setShowModal(true); }}
                      className="text-xs text-slate-500 hover:text-primary-400 px-2 py-1 rounded hover:bg-dark-700">Ред.</button>
                    <button onClick={(e) => handleDelete(d.id, e)}
                      className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded hover:bg-dark-700">Удал.</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">Показано {(page-1)*20+1}–{Math.min(page*20, total)} из {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary py-1 px-3 text-xs">Назад</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20>=total} className="btn-secondary py-1 px-3 text-xs">Вперёд</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <DealModal deal={editDeal} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
