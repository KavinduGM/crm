'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

interface Stats {
  total_leads: number; today_leads: number; week_leads: number;
  hot_leads: number; medium_leads: number; low_leads: number;
  total_businesses: number; total_forms: number;
  spam_count: number; sales_pitch_count: number;
  recent_leads: Array<{ id: number; name: string; email: string; submission_time: string; company_name: string; priority: string; lead_score: number }>;
}

function IconFire({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}
function IconBolt({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconCircle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  );
}
function IconChart({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconInbox({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}
function IconShield({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
    </svg>
  );
}
function IconMegaphone({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}
function IconBuilding({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconCheck({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high:   { label: 'Hot',    color: 'bg-red-50 text-red-700 border border-red-200' },
  medium: { label: 'Medium', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  low:    { label: 'Low',    color: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.low;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const admin = getAdmin();

  useEffect(() => {
    api.get('/leads/stats').then(r => setStats(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8"><div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}</div>
    </div></div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {admin?.name?.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-1">AI pipeline is active · All leads processed automatically</p>
      </div>

      {/* Priority Lead Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/dashboard/leads?priority=high" className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconFire className="w-4 h-4 text-red-100" />
              <p className="text-red-100 text-sm font-medium">Hot Leads</p>
            </div>
            <p className="text-xs text-red-100 bg-red-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 70-100</p>
          </div>
          <p className="text-4xl font-bold">{stats?.hot_leads || 0}</p>
          <p className="text-red-100 text-xs mt-1">Highest priority — act now</p>
        </Link>
        <Link href="/dashboard/leads?priority=medium" className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconBolt className="w-4 h-4 text-amber-100" />
              <p className="text-amber-100 text-sm font-medium">Medium Leads</p>
            </div>
            <p className="text-xs text-amber-100 bg-amber-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 40-69</p>
          </div>
          <p className="text-4xl font-bold">{stats?.medium_leads || 0}</p>
          <p className="text-amber-100 text-xs mt-1">Follow up within 48 hours</p>
        </Link>
        <Link href="/dashboard/leads?priority=low" className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconCircle className="w-4 h-4 text-slate-300" />
              <p className="text-slate-200 text-sm font-medium">Low Leads</p>
            </div>
            <p className="text-xs text-slate-300 bg-slate-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 0-39</p>
          </div>
          <p className="text-4xl font-bold">{stats?.low_leads || 0}</p>
          <p className="text-slate-300 text-xs mt-1">Add to nurture campaign</p>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {([
          { label: 'This Week', value: stats?.week_leads || 0, icon: <IconChart className="w-5 h-5 text-blue-700" />, color: 'bg-blue-50', href: '/dashboard/leads' },
          { label: 'Today', value: stats?.today_leads || 0, icon: <IconInbox className="w-5 h-5 text-green-600" />, color: 'bg-green-50', href: '' },
          { label: 'Spam Blocked', value: stats?.spam_count || 0, icon: <IconShield className="w-5 h-5 text-red-600" />, color: 'bg-red-50', href: '/dashboard/spam' },
          { label: 'Sales Pitches', value: stats?.sales_pitch_count || 0, icon: <IconMegaphone className="w-5 h-5 text-orange-600" />, color: 'bg-orange-50', href: '/dashboard/sales-pitches' },
        ] as const).map(({ label, value, icon, color, href }) => {
          const card = (
            <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm ${href ? 'hover:shadow-md transition cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
                <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
            </div>
          );
          return href ? <Link key={label} href={href}>{card}</Link> : <div key={label}>{card}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Leads</h2>
            <Link href="/dashboard/leads" className="text-blue-700 text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {!stats?.recent_leads?.length ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <div className="flex justify-center mb-3 text-slate-300">
                  <IconInbox className="w-10 h-10" />
                </div>
                <p>No leads yet. Share your forms to start capturing leads!</p>
              </div>
            ) : stats.recent_leads.map(lead => (
              <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                  {lead.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-900 text-sm truncate">{lead.name || 'Unknown'}</p>
                    {lead.priority && <PriorityBadge priority={lead.priority} />}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {lead.lead_score > 0 && <p className="text-xs font-bold text-blue-700 mb-0.5">Score {lead.lead_score}</p>}
                  <p className="text-xs text-slate-400">{formatDate(lead.submission_time)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions + Pipeline */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/dashboard/businesses/new" className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700 font-medium text-sm hover:bg-blue-100 transition">
                <IconBuilding className="w-4 h-4" /> Add Business
              </Link>
              <Link href="/dashboard/analytics" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-100 transition">
                <IconChart className="w-4 h-4 text-slate-600" /> Analytics
              </Link>
              <Link href="/dashboard/spam" className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 font-medium text-sm hover:bg-red-100 transition">
                <IconShield className="w-4 h-4" /> Spam Folder ({stats?.spam_count || 0})
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Pipeline Status</h2>
            <div className="space-y-3">
              {['Honeypot Check', 'AI Classifier', 'Lead Scorer', 'Auto-Archive'].map((l, i) => (
                <div key={l} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${['bg-red-400', 'bg-blue-500', 'bg-blue-600', 'bg-green-400'][i]}`} />
                    <span className="text-slate-700 text-xs">{l}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <IconCheck className="w-3 h-3" /> Active
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
