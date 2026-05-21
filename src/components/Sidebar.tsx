'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

const navItems = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { href: '/gym', label: 'Gym', icon: 'dumbbell' },
  { href: '/habits', label: 'Habits', icon: 'check', soon: true },
  { href: '/goals', label: 'Goals', icon: 'target', soon: true },
  { href: '/finance', label: 'Finance', icon: 'wallet', soon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  return (
    <aside className="w-64 border-r border-line bg-bg-surface flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6 border-b border-line">
        <div className="flex items-baseline gap-2">
          <span className="display-font text-2xl font-medium text-ink-primary">X</span>
          <span className="text-xs uppercase tracking-widest text-ink-tertiary">Life OS</span>
        </div>
        <p className="text-xs text-ink-tertiary mt-1 italic display-font">consistency over intensity</p>
      </div>

      <nav className="flex-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.soon ? '#' : item.href}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5 ${
                isActive
                  ? 'bg-bg-inset text-ink-primary'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-inset/50'
              } ${item.soon ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className="flex items-center gap-3">
                <Icon name={item.icon} />
                {item.label}
              </span>
              {item.soon && (
                <span className="text-[10px] uppercase tracking-wider text-ink-faint">soon</span>
              )}
              {isActive && !item.soon && (
                <span className="w-1 h-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-line">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-inset/50 transition-colors"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          {theme === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </div>
    </aside>
  );
}

function Icon({ name }: { name: string }) {
  const props = { width: 16, height: 16, strokeWidth: 1.5, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...props} viewBox="0 0 24 24"><path d="M3 12L12 4l9 8M5 10v10h14V10" /></svg>;
    case 'tasks':
      return <svg {...props} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12l2 2 4-4" /></svg>;
    case 'dumbbell':
      return <svg {...props} viewBox="0 0 24 24"><path d="M6 5v14M3 8v8M9 4v16M15 4v16M18 5v14M21 8v8M9 12h6" /></svg>;
    case 'check':
      return <svg {...props} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>;
    case 'target':
      return <svg {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
    case 'wallet':
      return <svg {...props} viewBox="0 0 24 24"><path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 7V5a2 2 0 012-2h11M17 13h.01" /></svg>;
    case 'sun':
      return <svg {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5L19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>;
    case 'moon':
      return <svg {...props} viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 0111.2 3a7 7 0 109.8 9.8z" /></svg>;
    default:
      return null;
  }
}
