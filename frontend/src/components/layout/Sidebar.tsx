import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, GitBranch, Phone, MessageSquare,
  BarChart3, Settings, Zap, ListTodo, ClipboardList,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/contacts', icon: Users, label: 'Контакты' },
  { to: '/deals', icon: Briefcase, label: 'Сделки' },
  { to: '/pipeline', icon: GitBranch, label: 'Воронка' },
  { to: '/activities', icon: ListTodo, label: 'Активности' },
  { to: '/telephony', icon: Phone, label: 'Телефония' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/audit-log', icon: ClipboardList, label: 'Журнал действий' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-dark-950 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">CRM Ticketon</div>
            <div className="text-xs text-slate-500">Платформа продаж</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-1">
          Основное
        </div>
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-3">
          Коммуникации
        </div>
        {navItems.slice(5, 7).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-3">
          Аналитика
        </div>
        {navItems.slice(7).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings className="w-4 h-4 shrink-0" />
          Настройки
        </NavLink>
      </div>
    </aside>
  );
}
