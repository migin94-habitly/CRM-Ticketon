import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Mail, Briefcase, Filter } from 'lucide-react';
import { contactsAPI } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import type { Contact } from '../types';
import { formatDate, statusColor, initials } from '../utils/format';
import ContactModal from '../components/contacts/ContactModal';
import ImportExportBar from '../components/ImportExportBar';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    contactsAPI.list({ page, limit: 20, search: debouncedSearch, status })
      .then((r) => {
        setContacts(r.data.data || []);
        setTotal(r.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, status]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить этот контакт?')) return;
    await contactsAPI.delete(id);
    toast.success('Контакт удалён');
    load();
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Контакты</h1>
          <p className="text-slate-500 text-sm">{total} контактов всего</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportExportBar
            entityName="контактов"
            filename="contacts"
            onExport={() => contactsAPI.exportCSV() as Promise<{ data: Blob }>}
            onImport={contactsAPI.importCSV}
            onImportSuccess={load}
          />
          <button className="btn-primary text-sm py-1.5" onClick={() => { setEditContact(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Добавить контакт
          </button>
        </div>
      </div>

      <div className="card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input pl-9 py-1.5 text-sm"
            placeholder="Поиск по имени, email, телефону..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            className="input py-1.5 text-sm w-36"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Все статусы</option>
            <option value="new">Новый</option>
            <option value="active">Активный</option>
            <option value="inactive">Неактивный</option>
            <option value="lost">Потерян</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Контакт</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Компания</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Статус</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Источник</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Сделки</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Добавлен</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Загрузка...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">Контакты не найдены</td></tr>
            ) : contacts.map((c) => (
              <tr key={c.id} className="table-row cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials(c.first_name, c.last_name)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{c.first_name} {c.last_name}</div>
                      {c.email && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Mail className="w-3 h-3" />{c.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1 text-slate-400">
                    {c.company && <><Briefcase className="w-3 h-3" /><span>{c.company}</span></>}
                    {c.position && <span className="text-slate-600">· {c.position}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(c.status)}`}>{{new:'Новый',active:'Активный',inactive:'Неактивный',lost:'Потерян'}[c.status]||c.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.source || '—'}</td>
                <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{c.deals_count || 0}</td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="p-1 rounded text-slate-500 hover:text-primary-400 hover:bg-dark-700">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setEditContact(c); setShowModal(true); }}
                      className="text-xs text-slate-500 hover:text-primary-400 px-2 py-1 rounded hover:bg-dark-700">Ред.</button>
                    <button onClick={(e) => handleDelete(c.id, e)}
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
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1 px-3 text-xs">Назад</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20>=total} className="btn-secondary py-1 px-3 text-xs">Вперёд</button>
            </div>
          </div>
        )}
      </div>

      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Загрузка...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Контакты не найдены</div>
        ) : contacts.map((c) => (
          <div key={c.id} className="card p-4 cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials(c.first_name, c.last_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-200 text-sm">{c.first_name} {c.last_name}</div>
                {c.email && <div className="text-xs text-slate-500 truncate">{c.email}</div>}
              </div>
              <span className={`badge text-[10px] shrink-0 ${statusColor(c.status)}`}>{{new:'Новый',active:'Активный',inactive:'Неактивный',lost:'Потерян'}[c.status]||c.status}</span>
            </div>
            {c.company && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                <Briefcase className="w-3 h-3 shrink-0" />{c.company}
              </div>
            )}
            <div className="flex gap-2 pt-1 border-t border-slate-700/30" onClick={e => e.stopPropagation()}>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-400 py-1 px-2 rounded hover:bg-dark-700">
                  <Phone className="w-3 h-3" />{c.phone}
                </a>
              )}
              <button onClick={(e) => { e.stopPropagation(); setEditContact(c); setShowModal(true); }}
                className="text-xs text-slate-500 hover:text-primary-400 py-1 px-2 rounded hover:bg-dark-700 ml-auto">Ред.</button>
              <button onClick={(e) => handleDelete(c.id, e)}
                className="text-xs text-slate-500 hover:text-red-400 py-1 px-2 rounded hover:bg-dark-700">Удал.</button>
            </div>
          </div>
        ))}
        {total > 20 && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">{(page-1)*20+1}–{Math.min(page*20, total)} из {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1 px-3 text-xs">←</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20>=total} className="btn-secondary py-1 px-3 text-xs">→</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ContactModal
          contact={editContact}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
