import { useState } from 'react';
import { Settings, Users, GitBranch, Phone, MessageSquare, Zap, Key } from 'lucide-react';
import { useAppSelector } from '../hooks/useAppDispatch';

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

function UsersTab() {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-white mb-4">Управление пользователями</h2>
      <p className="text-slate-500 text-sm">Управляйте участниками команды и их правами доступа.</p>
      <div className="mt-4 p-3 bg-dark-900 rounded-lg">
        <div className="text-xs text-slate-500">Роли:</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { role: 'Администратор', desc: 'Полный доступ ко всем функциям и настройкам' },
            { role: 'Менеджер', desc: 'Управление пользователями, воронками и всеми данными' },
            { role: 'Продажи', desc: 'Управление контактами, сделками и активностями' },
            { role: 'Просмотр', desc: 'Только просмотр дашбордов и контактов' },
          ].map(r => (
            <div key={r.role} className="p-2 rounded border border-slate-700">
              <div className="text-xs font-medium text-slate-200">{r.role}</div>
              <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
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
