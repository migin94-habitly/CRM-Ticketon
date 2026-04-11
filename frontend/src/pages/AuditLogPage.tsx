import { useEffect, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { auditLogAPI } from '../api';
import type { AuditLog } from '../types';
import { formatDateTime } from '../utils/format';

const actionRu: Record<string, string> = {
  login: 'Вход',
  logout: 'Выход',
  create: 'Создание',
  update: 'Обновление',
  delete: 'Удаление',
  view: 'Просмотр',
  export: 'Экспорт',
  import: 'Импорт',
};

const entityRu: Record<string, string> = {
  contact: 'Контакт',
  deal: 'Сделка',
  activity: 'Активность',
  pipeline: 'Воронка',
  user: 'Пользователь',
  call: 'Звонок',
  whatsapp: 'WhatsApp',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    auditLogAPI.list()
      .then(r => setLogs((r.data.data as AuditLog[]) || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.user_email.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.entity_type || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      l.user_first_name.toLowerCase().includes(q) ||
      l.user_last_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-400" />
            Журнал действий
          </h1>
          <p className="text-slate-500 text-sm">История действий пользователей</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 text-sm w-64"
            placeholder="Поиск по пользователю, действию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{search ? 'Ничего не найдено' : 'Журнал пуст'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Дата</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Пользователь</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Действие</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Объект</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Описание</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="table-row">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200 text-xs font-medium">
                      {log.user_first_name} {log.user_last_name}
                    </div>
                    <div className="text-slate-500 text-xs">{log.user_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-primary-500/10 text-primary-400">
                      {actionRu[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {log.entity_type ? (entityRu[log.entity_type] || log.entity_type) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                    {log.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-slate-600 text-right">
        Показано записей: {filtered.length} из {logs.length}
      </div>
    </div>
  );
}
