import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { dealsAPI } from '../api';
import type { Deal } from '../types';
import { formatCurrency, formatDate, priorityColor } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
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
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    dealsAPI.list({ page, limit: 20, search: debouncedSearch })
      .then((r) => {
        setDeals(r.data.data || []);
        setTotal(r.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

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
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Сделки</h1>
          <p className="text-slate-500 text-sm">{total} сделок · {formatCurrency(totalValue)} в воронке</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm py-1.5" onClick={() => navigate('/pipeline')}>
            Воронка
          </button>
          <button className="btn-primary text-sm py-1.5" onClick={() => { setEditDeal(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Новая сделка
          </button>
        </div>
      </div>

      <div className="card p-3 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 py-1.5 text-sm" placeholder="Поиск сделок..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Filter className="w-4 h-4 text-slate-500 self-center shrink-0" />
      </div>

      <div className="card overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Сделка</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Контакт</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Стадия</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Сумма</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Приоритет</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Дата</th>
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
                <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                  {d.contact ? `${d.contact.first_name} ${d.contact.last_name}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {d.stage && (
                    <span className="badge" style={{ background: `${d.stage.color}20`, color: d.stage.color }}>
                      {d.stage.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-green-400 font-medium">{formatCurrency(d.value, d.currency)}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`badge ${priorityColor(d.priority)}`}>{{high:'Высокий',medium:'Средний',low:'Низкий'}[d.priority]||d.priority}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
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

      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Загрузка...</div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Сделки не найдены</div>
        ) : deals.map((d) => (
          <div key={d.id} className="card p-4 cursor-pointer" onClick={() => navigate(`/deals/${d.id}`)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-medium text-slate-200 text-sm leading-snug">{d.title}</div>
              <span className="text-green-400 font-semibold text-sm shrink-0">{formatCurrency(d.value, d.currency)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {d.stage && (
                <span className="badge text-[10px]" style={{ background: `${d.stage.color}20`, color: d.stage.color }}>{d.stage.name}</span>
              )}
              <span className={`badge text-[10px] ${priorityColor(d.priority)}`}>{{high:'Высокий',medium:'Средний',low:'Низкий'}[d.priority]||d.priority}</span>
            </div>
            {d.contact && (
              <div className="text-xs text-slate-500 mb-2">{d.contact.first_name} {d.contact.last_name}</div>
            )}
            <div className="flex gap-2 pt-1 border-t border-slate-700/30" onClick={e => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); setEditDeal(d); setShowModal(true); }}
                className="text-xs text-slate-500 hover:text-primary-400 py-1 px-2 rounded hover:bg-dark-700">Редактировать</button>
              <button onClick={(e) => handleDelete(d.id, e)}
                className="text-xs text-slate-500 hover:text-red-400 py-1 px-2 rounded hover:bg-dark-700">Удалить</button>
            </div>
          </div>
        ))}
        {total > 20 && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">{(page-1)*20+1}–{Math.min(page*20, total)} из {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary py-1 px-3 text-xs">←</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20>=total} className="btn-secondary py-1 px-3 text-xs">→</button>
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
