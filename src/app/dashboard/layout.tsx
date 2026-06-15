'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { BookOpen, LayoutDashboard, Calendar, WifiOff, PlusCircle, LogOut, Layers } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-slate-900 border-r border-slate-800 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">🎓 StudyAI<span className="text-primary-400">-Plus</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
              pathname === href ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}>
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {!isOnline && <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950 border border-orange-800 rounded-lg px-3 py-2">
            <WifiOff size={14} /> Mode hors-ligne
          </div>}
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</div>

        {/* Bottom nav mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={clsx(
              'flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors',
              pathname === href ? 'text-primary-400' : 'text-slate-500'
            )}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
