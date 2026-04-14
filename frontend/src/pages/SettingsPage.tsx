import { useState, useEffect, useCallback } from 'react';
import { Settings, Users, GitBranch, Phone, MessageSquare, Zap, Key, Plus, Pencil, X, Check, UserCheck, UserX, Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAppSelector } from '../hooks/useAppDispatch';
import { usersAPI, settingsAPI } from '../api';
import type { SettingsCategory } from '../api';
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

// ---------------------------------------------------------------------------
// Generic integration settings hook
// ---------------------------------------------------------------------------
function useIntegrationSettings(category: SettingsCategory) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    settingsAPI.get(category)
      .then(r => setFields((r.data.data as Record<string, string>) ?? {}))
      .catch(() => setFields({}))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const set = (key: string, value: string) =>
    setFields(f => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await settingsAPI.save(category, fields);
      setSaveMsg({ ok: true, text: 'Настройки сохранены' });
      load(); // reload to get masked key from server
    } catch {
      setSaveMsg({ ok: false, text: 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await settingsAPI.test(category);
      setTestResult({ ok: r.data.success, text: r.data.message });
    } catch {
      setTestResult({ ok: false, text: 'Ошибка при проверке соединения' });
    } finally {
      setTesting(false);
    }
  };

  return { fields, set, loading, saving, testing, saveMsg, testResult, save, test };
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function StatusBanner({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
      result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {result.ok
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {result.text}
    </div>
  );
}

function ApiKeyInput({ value, onChange, placeholder = 'Введите ключ API' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="input pr-10"
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function IntegrationFooter({ saving, testing, onSave, onTest, saveMsg, testResult }: {
  saving: boolean; testing: boolean;
  onSave: () => void; onTest: () => void;
  saveMsg: { ok: boolean; text: string } | null;
  testResult: { ok: boolean; text: string } | null;
}) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          onClick={onTest}
          disabled={testing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Проверка...' : 'Проверить соединение'}
        </button>
      </div>
      <StatusBanner result={saveMsg} />
      <StatusBanner result={testResult} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Telephony tab
// ---------------------------------------------------------------------------
function TelephonyTab() {
  const { fields, set, loading, saving, testing, saveMsg, testResult, save, test } =
    useIntegrationSettings('telephony');

  const providers = [
    { value: 'asterisk', label: 'Asterisk / FreeSWITCH', desc: 'On-premise SIP/VoIP сервер (AMI/ARI)' },
    { value: 'twilio',   label: 'Twilio',                desc: 'Облако — REST API и вебхуки' },
    { value: 'zadarma',  label: 'Zadarma',               desc: 'Российский VoIP провайдер' },
    { value: 'sipuni',   label: 'Sipuni',                desc: 'Российская облачная АТС' },
  ];

  if (loading) return <div className="card p-5 text-slate-500 text-sm animate-pulse">Загрузка...</div>;

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Интеграция телефонии</h2>

      <div className="space-y-3">
        <div>
          <label className="label">Провайдер</label>
          <select className="input" value={fields.provider ?? ''} onChange={e => set('provider', e.target.value)}>
            <option value="">— выберите провайдера —</option>
            {providers.map(p => (
              <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">URL API</label>
          <input
            className="input"
            placeholder="https://your-pbx.example.com/api"
            value={fields.api_url ?? ''}
            onChange={e => set('api_url', e.target.value)}
          />
        </div>

        <div>
          <label className="label">API ключ</label>
          <ApiKeyInput
            value={fields.api_key ?? ''}
            onChange={v => set('api_key', v)}
            placeholder="Токен авторизации телефонии"
          />
        </div>

        <div>
          <label className="label">URL вебхука (входящие события)</label>
          <input
            className="input"
            placeholder="https://your-crm.com/api/v1/webhooks/telephony"
            value={fields.webhook_url ?? ''}
            onChange={e => set('webhook_url', e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1">
            Укажите этот URL в настройках вашей АТС: <code className="text-primary-400">POST /api/v1/webhooks/telephony</code>
          </p>
        </div>
      </div>

      <IntegrationFooter
        saving={saving} testing={testing}
        onSave={save} onTest={test}
        saveMsg={saveMsg} testResult={testResult}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp tab
// ---------------------------------------------------------------------------
function WhatsAppTab() {
  const { fields, set, loading, saving, testing, saveMsg, testResult, save, test } =
    useIntegrationSettings('whatsapp');

  const providers = [
    { value: 'meta',     label: 'Meta WhatsApp Business API', desc: 'Официальный Graph API' },
    { value: 'wazzup',   label: 'Wazzup',                     desc: 'Российский агрегатор' },
    { value: 'chatapi',  label: 'Chat-API',                   desc: 'Неофициальный мост' },
  ];

  if (loading) return <div className="card p-5 text-slate-500 text-sm animate-pulse">Загрузка...</div>;

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-white">Интеграция WhatsApp</h2>

      <div className="space-y-3">
        <div>
          <label className="label">Провайдер</label>
          <select className="input" value={fields.provider ?? ''} onChange={e => set('provider', e.target.value)}>
            <option value="">— выберите провайдера —</option>
            {providers.map(p => (
              <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
            ))}
          </select>
        </div>

        {(fields.provider === 'meta' || !fields.provider) && (
          <div>
            <label className="label">Phone ID <span className="text-slate-600">(Meta)</span></label>
            <input
              className="input"
              placeholder="123456789012345"
              value={fields.phone_id ?? ''}
              onChange={e => set('phone_id', e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1">
              Находится в Meta Business Suite → WhatsApp → Phone number ID
            </p>
          </div>
        )}

        {(fields.provider === 'wazzup' || fields.provider === 'chatapi') && (
          <div>
            <label className="label">URL API</label>
            <input
              className="input"
              placeholder="https://api.wazzup24.com/v3"
              value={fields.api_url ?? ''}
              onChange={e => set('api_url', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="label">API ключ / Access Token</label>
          <ApiKeyInput
            value={fields.api_key ?? ''}
            onChange={v => set('api_key', v)}
            placeholder="Токен авторизации WhatsApp"
          />
        </div>

        <div>
          <label className="label">URL вебхука (входящие сообщения)</label>
          <input
            className="input"
            placeholder="https://your-crm.com/api/v1/webhooks/whatsapp"
            value={fields.webhook_url ?? ''}
            onChange={e => set('webhook_url', e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-1">
            Укажите этот URL в настройках WhatsApp провайдера: <code className="text-primary-400">POST /api/v1/webhooks/whatsapp</code>
          </p>
        </div>
      </div>

      <IntegrationFooter
        saving={saving} testing={testing}
        onSave={save} onTest={test}
        saveMsg={saveMsg} testResult={testResult}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI tab
// ---------------------------------------------------------------------------
function AITab() {
  const { fields, set, loading, saving, testing, saveMsg, testResult, save, test } =
    useIntegrationSettings('ai');

  const providers = [
    { value: 'openai',    label: 'OpenAI',             models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { value: 'anthropic', label: 'Anthropic (Claude)',  models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6'] },
    { value: 'ollama',    label: 'Ollama (локальный)',  models: ['llama3', 'mistral', 'gemma2'] },
    { value: 'openrouter',label: 'OpenRouter',          models: ['auto'] },
  ];

  const selectedProvider = providers.find(p => p.value === (fields.provider || 'openai')) ?? providers[0];

  const defaultBaseURLs: Record<string, string> = {
    openai:     'https://api.openai.com/v1/chat/completions',
    anthropic:  'https://api.anthropic.com/v1/messages',
    ollama:     'http://localhost:11434/api/chat',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  };

  const handleProviderChange = (v: string) => {
    set('provider', v);
    if (!fields.base_url || Object.values(defaultBaseURLs).includes(fields.base_url)) {
      set('base_url', defaultBaseURLs[v] ?? '');
    }
  };

  if (loading) return <div className="card p-5 text-slate-500 text-sm animate-pulse">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-white">Настройки ИИ-аналитики</h2>

        <div className="space-y-3">
          <div>
            <label className="label">Провайдер ИИ</label>
            <select className="input" value={fields.provider ?? 'openai'} onChange={e => handleProviderChange(e.target.value)}>
              {providers.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Модель</label>
            <select className="input" value={fields.model ?? selectedProvider.models[0]} onChange={e => set('model', e.target.value)}>
              {selectedProvider.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">API ключ</label>
            <ApiKeyInput
              value={fields.api_key ?? ''}
              onChange={v => set('api_key', v)}
              placeholder={fields.provider === 'anthropic' ? 'sk-ant-...' : fields.provider === 'ollama' ? 'не требуется' : 'sk-...'}
            />
          </div>

          <div>
            <label className="label">Base URL <span className="text-slate-600">(необязательно)</span></label>
            <input
              className="input"
              placeholder={defaultBaseURLs[fields.provider ?? 'openai']}
              value={fields.base_url ?? ''}
              onChange={e => set('base_url', e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1">
              Оставьте пустым для использования стандартного URL провайдера
            </p>
          </div>
        </div>

        <IntegrationFooter
          saving={saving} testing={testing}
          onSave={save} onTest={test}
          saveMsg={saveMsg} testResult={testResult}
        />
      </div>

      <div className="card p-4">
        <div className="text-xs font-medium text-slate-400 mb-2">Активные функции ИИ:</div>
        {[
          'Оценка вероятности выигрыша сделки (0–100%)',
          'Анализ тональности звонков (позитивная / нейтральная / негативная)',
          'Анализ здоровья воронки продаж',
          'Взвешенный прогноз выручки',
          'Рекомендации по следующим шагам',
        ].map(f => (
          <div key={f} className="flex items-start gap-1.5 text-xs text-slate-500 py-0.5">
            <Check className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" /> {f}
          </div>
        ))}
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
