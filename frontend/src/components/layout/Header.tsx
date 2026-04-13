import { Bell, Search, LogOut, Menu, X, Phone, Mail, Calendar, FileText, ListTodo, MessageSquare, DollarSign, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { contactsAPI, dealsAPI, activitiesAPI } from '../../api';
import type { Contact, Deal, Activity } from '../../types';
import { formatCurrency, timeAgo } from '../../utils/format';

interface Props {
  onMenuClick: () => void;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  meeting: <Calendar className="w-3 h-3" />,
  note: <FileText className="w-3 h-3" />,
  task: <ListTodo className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
};

export default function Header({ onMenuClick }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  // ── Search ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setContacts([]);
      setDeals([]);
      setSearchOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [cr, dr] = await Promise.all([
          contactsAPI.list({ search: query, limit: 5 }),
          dealsAPI.list({ search: query, limit: 5 }),
        ]);
        const c = (cr.data as { data?: Contact[] }).data ?? [];
        const d = (dr.data as { data?: Deal[] }).data ?? [];
        setContacts(c);
        setDeals(d);
        setSearchOpen(c.length > 0 || d.length > 0);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    activitiesAPI.list({ status: 'pending' } as Record<string, unknown>)
      .then(r => {
        const now = Date.now();
        const all: Activity[] = (r.data.data as Activity[]) ?? [];
        // Show overdue (past due_date) and due within 24 h
        const relevant = all.filter(a => {
          if (!a.due_date) return false;
          const due = new Date(a.due_date).getTime();
          return due <= now + 24 * 60 * 60 * 1000; // overdue or due within 24 h
        });
        setNotifications(relevant.slice(0, 15));
      })
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const overdueCount = notifications.filter(a => {
    if (!a.due_date) return false;
    return new Date(a.due_date).getTime() < Date.now();
  }).length;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-14 bg-dark-950 border-b border-slate-800 flex items-center px-4 gap-3 shrink-0 relative z-40">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 text-slate-500 hover:text-white rounded-lg hover:bg-dark-800 transition shrink-0"
        aria-label="Открыть меню"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Search ── */}
      <div className="flex-1 max-w-sm relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-slate-500 border-t-primary-400 rounded-full animate-spin" />
        )}
        <input
          className="input pl-9 py-1.5 text-sm bg-dark-800 w-full"
          placeholder="Поиск контактов, сделок..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => (contacts.length > 0 || deals.length > 0) && setSearchOpen(true)}
        />

        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-dark-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
            {contacts.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider bg-dark-800 border-b border-slate-700">
                  Контакты
                </div>
                {contacts.map(c => (
                  <button key={c.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-dark-800 transition text-left"
                    onClick={() => { navigate(`/contacts/${c.id}`); setSearchOpen(false); setQuery(''); }}>
                    <div className="w-6 h-6 bg-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate">{c.first_name} {c.last_name}</div>
                      {c.company && <div className="text-xs text-slate-500 truncate">{c.company}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {deals.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider bg-dark-800 border-b border-slate-700">
                  Сделки
                </div>
                {deals.map(d => (
                  <button key={d.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-dark-800 transition text-left"
                    onClick={() => { navigate(`/deals/${d.id}`); setSearchOpen(false); setQuery(''); }}>
                    <div className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      <DollarSign className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate">{d.title}</div>
                      <div className="text-xs text-slate-500">{formatCurrency(d.value)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {contacts.length === 0 && deals.length === 0 && !searching && (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">Ничего не найдено</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* ── Notifications ── */}
      <div className="relative shrink-0" ref={notifRef}>
        <button
          className="relative p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-dark-800 transition"
          onClick={() => setNotifOpen(v => !v)}
          title="Уведомления"
        >
          <Bell className="w-4 h-4" />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-dark-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="text-sm font-semibold text-white">Уведомления</span>
              {overdueCount > 0 && (
                <span className="badge bg-red-500/10 text-red-400 text-xs">{overdueCount} просрочено</span>
              )}
              <button onClick={() => setNotifOpen(false)} className="text-slate-500 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Нет новых уведомлений
                </div>
              ) : (
                notifications.map(a => {
                  const isOverdue = a.due_date && new Date(a.due_date).getTime() < Date.now();
                  return (
                    <button key={a.id}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-800 transition text-left border-b border-slate-800 last:border-0"
                      onClick={() => { navigate('/activities'); setNotifOpen(false); }}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {ACTIVITY_ICONS[a.type] ?? <ListTodo className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate font-medium">{a.subject}</div>
                        <div className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                          {isOverdue
                            ? `Просрочено · ${a.due_date ? timeAgo(a.due_date) : ''}`
                            : `Срок: ${a.due_date ? new Date(a.due_date).toLocaleString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}`
                          }
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-700">
                <button className="text-xs text-primary-400 hover:text-primary-300 transition"
                  onClick={() => { navigate('/activities'); setNotifOpen(false); }}>
                  Перейти ко всем активностям →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
          {user ? `${user.first_name[0]}${user.last_name[0]}` : '?'}
        </div>
        <span className="hidden sm:block text-sm text-slate-300 max-w-[100px] truncate">
          {user ? `${user.first_name}` : ''}
        </span>
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-dark-800 transition"
          title="Выход"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
