'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { clearAuth, getAdmin } from '@/lib/auth';
import toast from 'react-hot-toast';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '▦', exact: true },
  { href: '/dashboard/businesses', label: 'Businesses', icon: '🏢' },
  { href: '/dashboard/leads', label: 'All Leads', icon: '👥' },
];

const phase2Nav = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
  { href: '/dashboard/spam', label: 'Spam Folder', icon: '🚫' },
  { href: '/dashboard/sales-pitches', label: 'Sales Pitches', icon: '📢' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = getAdmin();

  function logout() {
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">CRM Platform</p>
          <p className="text-indigo-300 text-xs mt-0.5">Phase 2 — AI Pipeline</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {/* Core */}
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 py-2">Core</p>
        {nav.map(({ href, label, icon, exact }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive(href, exact)
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}>
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}

        {/* Pipeline */}
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 py-2 mt-4">AI Pipeline</p>
        {phase2Nav.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive(href)
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}>
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}

        {/* Quick Lead Views */}
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-3 py-2 mt-4">Lead Views</p>
        {[
          { href: '/dashboard/leads?priority=high', label: '🔥 Hot Leads' },
          { href: '/dashboard/leads?priority=medium', label: '⚡ Medium Leads' },
          { href: '/dashboard/leads?priority=low', label: '🟡 Low Leads' },
        ].map(({ href, label }) => (
          <Link key={href} href={href}
            className="flex items-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {admin?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{admin?.name}</p>
            <p className="text-slate-400 text-xs truncate">{admin?.email}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
