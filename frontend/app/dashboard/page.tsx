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

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high:   { label: '🔥 Hot',    color: 'bg-red-50 text-red-700 border border-red-200' },
  medium: { label: '⚡ Medium', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  low:    { label: '🟡 Low',   color: 'bg-slate-100 text-slate-600 border border-slate-200' },
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
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {admin?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-1">AI pipeline is active · All leads processed through 3 filter layers</p>
      </div>

      {/* Priority Lead Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/dashboard/leads?priority=high" className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-red-100 text-sm font-medium">🔥 Hot Leads</p>
            <p className="text-xs text-red-100 bg-red-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 70–100</p>
          </div>
          <p className="text-4xl font-bold">{stats?.hot_leads || 0}</p>
          <p className="text-red-100 text-xs mt-1">Highest priority — act now</p>
        </Link>
        <Link href="/dashboard/leads?priority=medium" className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-amber-100 text-sm font-medium">⚡ Medium Leads</p>
            <p className="text-xs text-amber-100 bg-amber-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 40–69</p>
          </div>
          <p className="text-4xl font-bold">{stats?.medium_leads || 0}</p>
          <p className="text-amber-100 text-xs mt-1">Follow up within 48 hours</p>
        </Link>
        <Link href="/dashboard/leads?priority=low" className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-200 text-sm font-medium">🟡 Low Leads</p>
            <p className="text-xs text-slate-300 bg-slate-700 bg-opacity-40 px-2 py-0.5 rounded-full">Score 0–39</p>
          </div>
          <p className="text-4xl font-bold">{stats?.low_leads || 0}</p>
          <p className="text-slate-300 text-xs mt-1">Add to nurture campaign</p>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'This Week', value: stats?.week_leads || 0, icon: '📊', color: 'bg-indigo-50', href: '/dashboard/leads' },
          { label: 'Today', value: stats?.today_leads || 0, icon: '📬', color: 'bg-green-50' },
          { label: 'Spam Blocked', value: stats?.spam_count || 0, icon: '🚫', color: 'bg-red-50', href: '/dashboard/spam' },
          { label: 'Sales Pitches', value: stats?.sales_pitch_count || 0, icon: '📢', color: 'bg-orange-50', href: '/dashboard/sales-pitches' },
        ].map(({ label, value, icon, color, href }) => {
          const card = (
            <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm ${href ? 'hover:shadow-md transition cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
                <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-lg`}>{icon}</div>
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
            <Link href="/dashboard/leads" className="text-indigo-600 text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {!stats?.recent_leads?.length ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p className="text-3xl mb-2">📭</p>
                <p>No leads yet. Share your forms to start capturing leads!</p>
              </div>
            ) : stats.recent_leads.map(lead => (
              <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
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
                  {lead.lead_score > 0 && <p className="text-xs font-bold text-indigo-600 mb-0.5">Score {lead.lead_score}</p>}
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
              <Link href="/dashboard/businesses/new" className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl text-indigo-700 font-medium text-sm hover:bg-indigo-100 transition"><span>🏢</span> Add Business</Link>
              <Link href="/dashboard/analytics" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-100 transition"><span>📊</span> Analytics</Link>
              <Link href="/dashboard/spam" className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 font-medium text-sm hover:bg-red-100 transition"><span>🚫</span> Spam Folder ({stats?.spam_count || 0})</Link>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Pipeline Status</h2>
            <div className="space-y-3">
              {['Layer 1 – Spam Filter', 'Layer 2 – Intent Filter', 'Layer 3 – AI Analyzer', 'Lead Scoring Engine'].map((l, i) => (
                <div key={l} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${['bg-red-400','bg-orange-400','bg-indigo-400','bg-green-400'][i]}`} />
                    <span className="text-slate-700 text-xs">{l}</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">✓ Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
