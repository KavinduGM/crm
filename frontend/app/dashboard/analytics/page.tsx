'use client';
import { useEffect, useState } from 'react';
import { ReactNode } from 'react';
import api from '@/lib/api';

interface AnalyticsData {
  overview: {
    total_leads_month: number;
    spam_blocked_month: number;
    sales_pitches_month: number;
    qualified_leads_month: number;
    hot_leads_total: number;
    medium_leads_total: number;
    low_leads_total: number;
    avg_lead_score: number;
    total_spam_ever: number;
  };
  top_businesses: Array<{ company_name: string; lead_count: number; hot_leads: number }>;
}

// ── SVG Icons ───────────────────────────────────────────────────────
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
function IconStar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
function IconShield({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconTrash({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconShieldCheck({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconCheck({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string; icon: ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-sm">{label}</p>
        <span className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const o = data?.overview;
  const totalSubmissions = (o?.qualified_leads_month || 0) + (o?.spam_blocked_month || 0) + (o?.sales_pitches_month || 0);
  const spamRate = totalSubmissions > 0 ? Math.round((o?.spam_blocked_month || 0) / totalSubmissions * 100) : 0;
  const qualifiedRate = totalSubmissions > 0 ? Math.round((o?.qualified_leads_month || 0) / totalSubmissions * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-500 mt-1">Pipeline performance and lead quality metrics</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* This Month Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-6 text-white">
            <p className="text-blue-200 text-sm mb-1">This Month</p>
            <div className="flex items-end gap-6 flex-wrap">
              <div>
                <p className="text-4xl font-bold">{totalSubmissions.toLocaleString()}</p>
                <p className="text-blue-200 text-sm">Total Submissions</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="font-semibold text-lg">{o?.qualified_leads_month || 0}</p>
                  <p className="text-blue-200">Qualified Leads</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{o?.spam_blocked_month || 0}</p>
                  <p className="text-blue-200">Spam Blocked</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{o?.sales_pitches_month || 0}</p>
                  <p className="text-blue-200">Sales Pitches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Hot Leads" value={o?.hot_leads_total || 0} sub="Priority: High (score 70-100)" icon={<IconFire className="w-5 h-5 text-red-600" />} color="bg-red-50" />
            <MetricCard label="Medium Leads" value={o?.medium_leads_total || 0} sub="Priority: Medium (score 40-69)" icon={<IconBolt className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
            <MetricCard label="Low Leads" value={o?.low_leads_total || 0} sub="Priority: Low (score 0-39)" icon={<IconCircle className="w-5 h-5 text-slate-500" />} color="bg-slate-50" />
            <MetricCard label="Avg Lead Score" value={`${o?.avg_lead_score || 0}/100`} sub="Across all qualified leads" icon={<IconStar className="w-5 h-5 text-blue-700" />} color="bg-blue-50" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Spam Blocked (month)" value={o?.spam_blocked_month || 0} sub={`${spamRate}% of submissions`} icon={<IconShield className="w-5 h-5 text-red-600" />} color="bg-red-50" />
            <MetricCard label="Total Spam (ever)" value={o?.total_spam_ever || 0} sub="Auto-deletes after 100" icon={<IconTrash className="w-5 h-5 text-orange-600" />} color="bg-orange-50" />
            <MetricCard label="Spam Block Rate" value={`${spamRate}%`} sub="AI filter efficiency" icon={<IconShieldCheck className="w-5 h-5 text-green-600" />} color="bg-green-50" />
            <MetricCard label="Lead Quality Rate" value={`${qualifiedRate}%`} sub="Legitimate submissions" icon={<IconCheck className="w-5 h-5 text-blue-700" />} color="bg-blue-50" />
          </div>

          {/* Pipeline Funnel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-5">Lead Processing Funnel (This Month)</h2>
            <div className="space-y-4">
              {[
                { label: 'Total Submissions', count: totalSubmissions, color: 'bg-slate-400', pct: 100 },
                { label: 'Blocked by Spam Filter', count: o?.spam_blocked_month || 0, color: 'bg-red-400', pct: spamRate },
                { label: 'Sales Pitches (AI)', count: o?.sales_pitches_month || 0, color: 'bg-orange-400', pct: totalSubmissions > 0 ? Math.round((o?.sales_pitches_month || 0) / totalSubmissions * 100) : 0 },
                { label: 'Qualified Leads (AI)', count: o?.qualified_leads_month || 0, color: 'bg-blue-600', pct: qualifiedRate },
                { label: 'Hot Leads (Score 70+)', count: o?.hot_leads_total || 0, color: 'bg-green-500', pct: (o?.qualified_leads_month || 0) > 0 ? Math.round((o?.hot_leads_total || 0) / (o?.qualified_leads_month || 1) * 100) : 0 },
              ].map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{label}</span>
                    <span className="font-semibold text-slate-900">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Businesses */}
          {data?.top_businesses && data.top_businesses.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Top Businesses by Lead Volume</h2>
              <div className="space-y-3">
                {data.top_businesses.map((biz, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{biz.company_name}</p>
                      <p className="text-xs text-slate-500">{biz.lead_count} qualified leads · {biz.hot_leads} hot</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                        <IconFire className="w-3 h-3" /> {biz.hot_leads} hot
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
