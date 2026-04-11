import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, GitBranch, Phone, MessageSquare,
  BarChart3, Settings, Zap, ListTodo, ClipboardList, Building2, MapPin, X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/contacts', icon: Users, label: 'Контакты' },
  { to: '/deals', icon: Briefcase, label: 'Сделки' },
  { to: '/pipeline', icon: GitBranch, label: 'Воронка' },
  { to: '/activities', icon: ListTodo, label: 'Активности' },
  { to: '/partners', icon: Building2, label: 'Партнёры' },
  { to: '/venues', icon: MapPin, label: 'Площадки' },
  { to: '/telephony', icon: Phone, label: 'Телефония' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/audit-log', icon: ClipboardList, label: 'Журнал действий' },
];

const NavSection = ({ label, items, onClose }: { label: string; items: typeof navItems; onClose: () => void }) => (
  <>
    <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-3">
      {label}
    </div>
    {items.map(({ to, icon: Icon, label: itemLabel }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onClose}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {itemLabel}
      </NavLink>
    ))}
  </>
);

export default function Sidebar({ isOpen, onClose }: Props) {
  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-30 w-60 bg-dark-950 border-r border-slate-800 flex flex-col shrink-0',
        'transition-transform duration-200 ease-in-out',
        'md:relative md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">CRM Ticketon</div>
            <div className="text-xs text-slate-500">Платформа продаж</div>
          </div>
        </div>
        {/* Close button — only on mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1 text-slate-500 hover:text-white rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-1">
          Основное
        </div>
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        <NavSection label="Евент-партнёры" items={navItems.slice(5, 7)} onClose={onClose} />
        <NavSection label="Коммуникации" items={navItems.slice(7, 9)} onClose={onClose} />
        <NavSection label="Аналитика" items={navItems.slice(9)} onClose={onClose} />
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-slate-800">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Настройки
        </NavLink>
      </div>
    </aside>
  );
}
