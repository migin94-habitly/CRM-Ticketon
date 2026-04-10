import { Bell, Search, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-14 bg-dark-950 border-b border-slate-800 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input pl-9 py-1.5 text-sm bg-dark-800"
          placeholder="Search contacts, deals..."
        />
      </div>

      <div className="flex-1" />

      <button className="relative p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-dark-800 transition">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full" />
      </button>

      <div className="flex items-center gap-2 ml-2">
        <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
          {user ? `${user.first_name[0]}${user.last_name[0]}` : '?'}
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-dark-800 transition"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
