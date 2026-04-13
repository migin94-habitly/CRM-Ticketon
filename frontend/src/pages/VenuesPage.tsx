import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Users } from 'lucide-react';
import { venuesAPI, citiesAPI } from '../api';
import type { Venue, City } from '../types';
import toast from 'react-hot-toast';
import VenueModal from '../components/venues/VenueModal';
import ImportExportBar from '../components/ImportExportBar';

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);

  const load = () => {
    setLoading(true);
    venuesAPI.list({ search, city_id: cityFilter })
      .then(r => setVenues((r.data.data as Venue[]) || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    citiesAPI.list().then(r => setCities((r.data.data as City[]) || []));
  }, []);

  useEffect(() => { load(); }, [search, cityFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить площадку?')) return;
    try {
      await venuesAPI.delete(id);
      toast.success('Площадка удалена');
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
            <MapPin className="w-5 h-5 text-primary-400" />
            Площадки
          </h1>
          <p className="text-slate-500 text-sm">{venues.length} площадок</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportExportBar
            entityName="площадок"
            filename="venues"
            onExport={() => venuesAPI.exportCSV() as Promise<{ data: Blob }>}
            onImport={venuesAPI.importCSV}
            onImportSuccess={load}
          />
          <button className="btn-primary text-sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Добавить площадку
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 text-sm"
            placeholder="Поиск по названию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input text-sm w-44" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          <option value="">Все города</option>
          {cities.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Загрузка...</div>
      ) : venues.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Площадки не найдены</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Площадка</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Адрес</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Город</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Вместимость</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {venues.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{v.name}</div>
                    {v.description && (
                      <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{v.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{v.address || '—'}</td>
                  <td className="px-4 py-3">
                    {v.city ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        {v.city.name}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {v.capacity ? (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        {v.capacity.toLocaleString('ru')}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => { setEditing(v); setModalOpen(true); }}>
                        Ред.
                      </button>
                      <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDelete(v.id)}>
                        Удал.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <VenueModal
          venue={editing}
          cities={cities}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}
