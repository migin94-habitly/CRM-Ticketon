import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, GitBranch, Phone, MessageSquare,
  BarChart3, Settings, Zap, ListTodo,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppDispatch';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/deals', icon: Briefcase, label: 'Deals' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/activities', icon: ListTodo, label: 'Activities' },
  { to: '/telephony', icon: Phone, label: 'Telephony' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <aside className="w-60 bg-dark-950 border-r border-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">CRM Ticketon</div>
            <div className="text-xs text-slate-500">Sales Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider px-3 py-2 mt-1">
          Main
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
          Communications
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
          Intelligence
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

      {/* User */}
      <div className="p-3 border-t border-slate-800">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </NavLink>
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-slate-600 capitalize">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
