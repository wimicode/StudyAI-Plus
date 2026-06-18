'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { BookOpen, LayoutDashboard, Calendar, WifiOff, PlusCircle, LogOut, NotebookPen } from 'lucide-react';
import { clsx } from 'clsx';

const nav = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { href: '/dashboard/sources', label: 'Sources', icon: PlusCircle },
  { href: '/dashboard/courses', label: 'Cours', icon: BookOpen },
  { href: '/dashboard/planner', label: 'Planning', icon: Calendar },
  { href: '/dashboard/offline', label: 'Hors-ligne', icon: WifiOff },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isOnline = useOnlineStatus();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar desktop — posée dans la marge, sans fond opaque */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen p-5 pl-8">
        <Link href="/dashboard" className="mb-10 flex items-center gap-2.5">
          <NotebookPen className="text-primary-500" size={28} strokeWidth={2.2} />
          <span className="font-serif text-2xl font-semibold text-ink-800">
            StudyAI<span className="text-primary-500">-Plus</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx('nav-link', pathname === href && 'nav-link-active')}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {!isOnline && (
            <div className="flex items-center gap-2 text-xs text-rust-600 bg-rust-500/10 border border-rust-500/20 rounded-lg px-3 py-2">
              <WifiOff size={14} /> Mode hors-ligne
            </div>
          )}
          <p className="text-xs text-ink-400 px-3 truncate">{user?.email}</p>
          <button onClick={handleSignOut} className="nav-link nav-link-danger w-full">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</div>

        {/* Bottom nav mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper-50 border-t border-ink-700/10 flex">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={clsx(
              'flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors',
              pathname === href ? 'text-primary-500 font-medium' : 'text-ink-400'
            )}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
