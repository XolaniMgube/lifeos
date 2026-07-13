'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { createClient } from '@/lib/supabase';
import { features } from '@/config/features';

const navItems = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { href: '/gym', label: 'Training', icon: 'dumbbell', soon: !features.gym },
  { href: '/goals', label: 'Goals', icon: 'target', soon: !features.goals },
  { href: '/habits', label: 'Habits', icon: 'check', soon: true },
  { href: '/finance', label: 'Finance', icon: 'wallet', soon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const userEmail = useStore((s) => s.userEmail);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-line bg-bg-surface/85 backdrop-blur-xl md:flex">
        <div className="px-5 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <span className="display-font grid h-10 w-10 place-items-center rounded-xl border border-line bg-bg-raised text-xl font-medium text-ink-primary shadow-sm">X</span>
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-primary">Life OS</span>
              <span className="mt-0.5 block text-[10px] text-ink-tertiary">Your daily space</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3">
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-faint">Workspace</p>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.soon ? '#' : item.href}
                onClick={(event) => item.soon && event.preventDefault()}
                aria-disabled={item.soon || undefined}
                tabIndex={item.soon ? -1 : undefined}
                className={`group relative mb-1 flex items-center justify-between overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-bg-inset text-ink-primary shadow-[inset_0_0_0_1px_rgb(var(--line)/0.65)]'
                    : 'text-ink-secondary hover:bg-bg-inset/55 hover:text-ink-primary'
                } ${item.soon ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {isActive && !item.soon && <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-accent" />}
                <span className="flex items-center gap-3.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'bg-bg-inset/70 text-ink-tertiary group-hover:text-ink-secondary'}`}>
                    <Icon name={item.icon} />
                  </span>
                  <span className="block text-[13px] font-medium">{item.label}</span>
                </span>
                {item.soon && (
                  <span className="text-[10px] uppercase tracking-wider text-ink-faint">soon</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-4 rounded-2xl border border-line bg-bg-inset/45 p-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="display-font grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-primary text-sm font-medium text-bg-base">X</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-primary">Your space</p>
              <p className="mt-0.5 truncate text-[10px] text-ink-tertiary" title={userEmail ?? undefined}>{userEmail ?? 'Signed in'}</p>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-line/70 pt-2">
            <button onClick={toggleTheme} className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[10px] text-ink-tertiary transition-colors hover:bg-bg-surface hover:text-ink-primary">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} /> {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button onClick={handleSignOut} className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[10px] text-ink-tertiary transition-colors hover:bg-bg-surface hover:text-ink-primary">
              <Icon name="logout" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bg-surface/90 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 pb-1 pt-2">
          {[navItems[0], navItems[1], navItems[3], navItems[2]].map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.soon ? '#' : item.href}
                onClick={(event) => item.soon && event.preventDefault()}
                aria-disabled={item.soon || undefined}
                tabIndex={item.soon ? -1 : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-ink-tertiary active:bg-bg-inset/70'
                } ${item.soon ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <span className={`grid h-7 w-9 place-items-center rounded-full ${isActive ? 'bg-accent/10' : ''}`}><Icon name={item.icon} /></span>
                <span>{item.label}{item.soon ? ' · soon' : ''}</span>
              </Link>
            );
          })}
          <button
            onClick={toggleTheme}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] text-ink-tertiary active:bg-bg-inset/70 transition-colors"
          >
            <span className="grid h-7 w-9 place-items-center rounded-full"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></span>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>
    </>
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
    case 'logout':
      return <svg {...props} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
    default:
      return null;
  }
}
