import { useState, useEffect } from 'react';
import { Settings, Users, GitBranch, Phone, MessageSquare, Zap, Key, Plus, Pencil, X, Check, UserCheck, UserX } from 'lucide-react';
import { useAppSelector } from '../hooks/useAppDispatch';
import { usersAPI } from '../api';
import type { User } from '../types';

type Tab = 'profile' | 'users' | 'pipeline' | 'telephony' | 'whatsapp' | 'ai' | 'api';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const user = useAppSelector(s => s.auth.user);
  const isAdmin = user?.role === 'admin';

  const tabs: { id: Tab; icon: React.ElementType; label: string; adminOnly?: boolean }[] = [
    { id: 'profile', icon: Settings, label: 'Профиль' },
    { id: 'users', icon: Users, label: 'Пользователи', adminOnly: true },
    { id: 'pipeline', icon: GitBranch, label: 'Воронка', adminOnly: true },
    { id: 'telephony', icon: Phone, label: 'Телефония', adminOnly: true },
    { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', adminOnly: true },
    { id: 'ai', icon: Zap, label: 'Настройки ИИ', adminOnly: true },
    { id: 'api', icon: Key, label: 'API / Swagger', adminOnly: true },
  ];

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h1 className="text-xl font-bold text-white">Настройки</h1>
        <p className="text-slate-500 text-sm">Настройка CRM системы</p>
      </div>

      <div className="flex gap-4">
        <div className="w-48 shrink-0">
          <nav className="space-y-0.5">
            {tabs.filter(t => !t.adminOnly || isAdmin).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === id ? 'bg-primary-600/20 text-primary-400' : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {tab === 'profile' && <ProfileTab user={user} />}
          {tab === 'users' && <UsersTab />}
          {tab === 'pipeline' && <PipelineTab />}
          {tab === 'telephony' && <TelephonyTab />}
          {tab === 'whatsapp' && <WhatsAppTab />}
          {tab === 'ai' && <AITab />}
          {tab === 'api' && <APITab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: import('../types').User | null }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Мой профиль</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-700 rounded-xl flex items-center justify-center text-xl font-bold text-white">
          {user ? `${user.first_name[0]}${user.last_name[0]}` : '?'}
        </div>
        <div>
          <div className="font-medium text-white">{user?.first_name} {user?.last_name}</div>
          <div className="text-sm text-slate-400">{user?.email}</div>
          <div className="badge bg-primary-500/10 text-primary-400 mt-1">{user?.role}</div>
        </div>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  sales: 'Продажи',
  viewer: 'Просмотр',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400',
  manager: 'bg-orange-500/10 text-orange-400',
  sales: 'bg-green-500/10 text-green-400',
  viewer: 'bg-slate-500/10 text-slate-400',
};

interface AddUserForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  phone_number: string;
}

const EMPTY_FORM: AddUserForm = {
  first_name: '', last_name: '', email: '',
  password: '', role: 'sales', phone_number: '',
};

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddUserForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const load = () => {
    setLoading(true);
    usersAPI.list()
      .then(r => setUsers((r.data.data as User[]) ?? []))
      .catch(() => setError('Не удалось загрузить пользователей'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setFormError('Заполните все обязательные поля');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await usersAPI.create({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: form.role as User['role'],
        phone_number: form.phone_number || undefined,
      } as Parameters<typeof usersAPI.create>[0]);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      setFormError('Ошибка при создании пользователя (возможно, email уже занят)');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleSave = async (id: string) => {
    try {
      await usersAPI.update(id, { role: editRole as User['role'] });
      setEditId(null);
      load();
    } catch {
      /* ignore */
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await usersAPI.update(u.id, { is_active: !u.is_active } as Partial<User>);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Управление пользователями</h2>
          <button onClick={() => { setShowAdd(true); setFormError(''); setForm(EMPTY_FORM); }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>

        {loading && <div className="text-slate-500 text-sm animate-pulse">Загрузка...</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}

        {!loading && !error && (
          <div className="space-y-2">
            {users.length === 0 && (
              <div className="text-slate-500 text-sm">Нет пользователей</div>
            )}
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/60 hover:border-slate-600 transition-colors">
                <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {u.first_name[0]}{u.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {u.first_name} {u.last_name}
                    {!u.is_active && <span className="ml-2 text-xs text-slate-500">(неактивен)</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </div>

                {editId === u.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="input py-1 text-xs"
                    >
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button onClick={() => handleRoleSave(u.id)}
                      className="p-1 rounded text-green-400 hover:bg-green-500/10" title="Сохранить">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-1 rounded text-slate-500 hover:bg-slate-700" title="Отмена">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${ROLE_COLORS[u.role] ?? 'bg-slate-500/10 text-slate-400'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    <button onClick={() => { setEditId(u.id); setEditRole(u.role); }}
                      className="p-1 rounded text-slate-500 hover:text-primary-400 hover:bg-primary-500/10" title="Изменить роль">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(u)}
                      className={`p-1 rounded transition-colors ${u.is_active ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-green-400 hover:bg-green-500/10'}`}
                      title={u.is_active ? 'Деактивировать' : 'Активировать'}>
                      {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles legend */}
      <div className="card p-4">
        <div className="text-xs text-slate-500 mb-2 font-medium">Уровни доступа</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { role: 'admin', desc: 'Полный доступ ко всем функциям и настройкам' },
            { role: 'manager', desc: 'Управление пользователями, воронками и всеми данными' },
            { role: 'sales', desc: 'Управление контактами, сделками и активностями' },
            { role: 'viewer', desc: 'Только просмотр дашбордов и контактов' },
          ].map(r => (
            <div key={r.role} className="p-2 rounded border border-slate-700">
              <span className={`badge text-xs ${ROLE_COLORS[r.role]}`}>{ROLE_LABELS[r.role]}</span>
              <div className="text-xs text-slate-500 mt-1">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Новый пользователь</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Имя *</label>
                <input className="input" placeholder="Иван"
                  value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Фамилия *</label>
                <input className="input" placeholder="Иванов"
                  value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="ivan@company.ru"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div>
              <label className="label">Пароль *</label>
              <input className="input" type="password" placeholder="Минимум 6 символов"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            <div>
              <label className="label">Роль *</label>
              <select className="input" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Администратор — полный доступ</option>
                <option value="manager">Менеджер — управление командой</option>
                <option value="sales">Продажи — работа со сделками</option>
                <option value="viewer">Просмотр — только чтение</option>
              </select>
            </div>

            <div>
              <label className="label">Телефон</label>
              <input className="input" placeholder="+7 999 000-00-00"
                value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </div>

            {formError && <div className="text-red-400 text-xs">{formError}</div>}

            <div className="flex gap-3 pt-1">
              <button onClick={handleAdd} disabled={saving}
                className="btn-primary flex-1 justify-center">
                {saving ? 'Создание...' : 'Создать пользователя'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-white mb-4">Конфигурация воронки</h2>
      <p className="text-slate-500 text-sm mb-4">
        Создавайте и настраивайте воронки продаж с кастомными стадиями, цветами и вероятностями.
      </p>
      <a href="/pipeline" className="btn-primary inline-flex">Открыть конструктор воронки</a>
    </div>
  );
}

function TelephonyTab() {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Интеграция телефонии</h2>
      <div className="grid gap-3">
        {[
          { name: 'Asterisk / FreeSWITCH', type: 'On-premise', desc: 'SIP/VoIP server integration via AMI/ARI' },
          { name: 'Twilio', type: 'Cloud', desc: 'Programmable voice via REST API & webhooks' },
          { name: 'Zadarma', type: 'Cloud', desc: 'Russian VoIP provider with CRM webhooks' },
          { name: 'Sipuni', type: 'Cloud', desc: 'Russian cloud PBX with API integration' },
        ].map(p => (
          <div key={p.name} className="p-3 rounded-lg border border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-200">{p.name}</div>
              <div className="text-xs text-slate-500">{p.desc}</div>
            </div>
            <span className="badge bg-blue-500/10 text-blue-400">{p.type}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">Настройте провайдера в <code className="text-primary-400">configs/config.yaml</code></p>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Интеграция WhatsApp</h2>
      <div className="grid gap-3">
        {[
          { name: 'Meta WhatsApp Business API', desc: 'Official Graph API. Requires Meta Business account.' },
          { name: 'Wazzup', desc: 'Russian-friendly WhatsApp aggregator with CRM webhooks.' },
          { name: 'Chat-API', desc: 'Unofficial API bridge. Easy setup, limited features.' },
        ].map(p => (
          <div key={p.name} className="p-3 rounded-lg border border-slate-700">
            <div className="text-sm font-medium text-slate-200">{p.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-dark-900 rounded-lg">
        <div className="text-xs text-slate-500">URL вебхука для входящих сообщений:</div>
        <code className="text-xs text-primary-400 block mt-1">POST /api/v1/webhooks/whatsapp</code>
      </div>
    </div>
  );
}

function AITab() {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Настройки ИИ-аналитики</h2>
      <div className="space-y-3">
        <div>
          <label className="label">Провайдер ИИ</label>
          <select className="input">
            <option>OpenAI (GPT-4o-mini)</option>
            <option>OpenAI (GPT-4o)</option>
            <option>Anthropic (Claude)</option>
            <option>Local (Ollama)</option>
          </select>
        </div>
        <div>
          <label className="label">Ключ API</label>
          <input className="input" type="password" placeholder="sk-..." />
        </div>
      </div>
      <p className="text-xs text-slate-600">Задайте переменную AI_API_KEY или настройте в config.yaml</p>
      <div className="p-3 bg-dark-900 rounded-lg space-y-1">
        <div className="text-xs font-medium text-slate-400">Функции ИИ:</div>
        <div className="text-xs text-slate-500">• Оценка вероятности выигрыша сделки (0-100%)</div>
        <div className="text-xs text-slate-500">• Анализ тональности звонков</div>
        <div className="text-xs text-slate-500">• Анализ здоровья воронки</div>
        <div className="text-xs text-slate-500">• Прогноз продаж (взвешенная вероятность)</div>
        <div className="text-xs text-slate-500">• Рекомендации по следующим шагам</div>
      </div>
    </div>
  );
}

function APITab() {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">API и Swagger</h2>
      <p className="text-slate-500 text-sm">Полное REST API с документацией OpenAPI/Swagger.</p>
      <div className="grid grid-cols-2 gap-3">
        <a href="/swagger/index.html" target="_blank" rel="noopener"
          className="btn-primary justify-center">Открыть Swagger UI</a>
        <a href="/api/v1/health" target="_blank" rel="noopener"
          className="btn-secondary justify-center">Проверка API</a>
      </div>
      <div className="p-3 bg-dark-900 rounded-lg space-y-1">
        <div className="text-xs font-medium text-slate-400">Аутентификация:</div>
        <code className="text-xs text-primary-400">Authorization: Bearer &lt;JWT token&gt;</code>
        <div className="text-xs text-slate-500 mt-2">POST /api/v1/auth/login → получить JWT</div>
      </div>
      <div className="p-3 bg-dark-900 rounded-lg">
        <div className="text-xs font-medium text-slate-400 mb-2">Доступные эндпоинты:</div>
        {[
          '/api/v1/auth', '/api/v1/users', '/api/v1/contacts',
          '/api/v1/pipelines', '/api/v1/deals', '/api/v1/activities',
          '/api/v1/telephony', '/api/v1/whatsapp', '/api/v1/analytics',
        ].map(ep => (
          <div key={ep} className="text-xs text-slate-500 font-mono py-0.5">{ep}</div>
        ))}
      </div>
    </div>
  );
}
