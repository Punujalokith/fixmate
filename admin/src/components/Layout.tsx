import clsx from 'clsx';
import { Bot, CalendarCheck, FolderTree, LayoutDashboard, LogOut, Menu, ScrollText, Star, Store, Users, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/providers', label: 'Providers', icon: Store },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/ai', label: 'AI usage', icon: Bot },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-brand-700 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <Wrench className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-bold text-white">FixMate</p>
          <p className="text-xs text-slate-400">Admin console</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.fullName ?? 'Admin'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Log out" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="relative">{sidebar}</div>
          <button className="flex-1 bg-slate-900/40" onClick={() => setOpen(false)} aria-label="Close menu" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold">FixMate Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
