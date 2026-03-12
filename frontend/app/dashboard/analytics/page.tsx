'use client';
import { useEffect, useState } from 'react';
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

function MetricCard({ label, value, sub, icon, color }: { label: string; value: number | string; sub?: string; icon: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-sm">{label}</p>
        <span className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-lg`}>{icon}</span>
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
            <p className="text-indigo-100 text-sm mb-1">This Month</p>
            <div className="flex items-end gap-6 flex-wrap">
              <div>
                <p className="text-4xl font-bold">{totalSubmissions.toLocaleString()}</p>
                <p className="text-indigo-200 text-sm">Total Submissions</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="font-semibold text-lg">{o?.qualified_leads_month || 0}</p>
                  <p className="text-indigo-200">Qualified Leads</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{o?.spam_blocked_month || 0}</p>
                  <p className="text-indigo-200">Spam Blocked</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{o?.sales_pitches_month || 0}</p>
                  <p className="text-indigo-200">Sales Pitches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="🔥 Hot Leads" value={o?.hot_leads_total || 0} sub="Priority: High (score 70-100)" icon="🔥" color="bg-red-50" />
            <MetricCard label="⚡ Medium Leads" value={o?.medium_leads_total || 0} sub="Priority: Medium (score 40-69)" icon="⚡" color="bg-yellow-50" />
            <MetricCard label="🟡 Low Leads" value={o?.low_leads_total || 0} sub="Priority: Low (score 0-39)" icon="🟡" color="bg-slate-50" />
            <MetricCard label="Avg Lead Score" value={`${o?.avg_lead_score || 0}/100`} sub="Across all qualified leads" icon="⭐" color="bg-indigo-50" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Spam Blocked (month)" value={o?.spam_blocked_month || 0} sub={`${spamRate}% of submissions`} icon="🚫" color="bg-red-50" />
            <MetricCard label="Total Spam (ever)" value={o?.total_spam_ever || 0} sub="Auto-deletes after 100" icon="🗑" color="bg-orange-50" />
            <MetricCard label="Spam Block Rate" value={`${spamRate}%`} sub="Layer 1 efficiency" icon="🛡" color="bg-green-50" />
            <MetricCard label="Lead Quality Rate" value={`${qualifiedRate}%`} sub="Legitimate submissions" icon="✅" color="bg-blue-50" />
          </div>

          {/* Pipeline Funnel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-5">Lead Processing Funnel (This Month)</h2>
            <div className="space-y-4">
              {[
                { label: 'Total Submissions', count: totalSubmissions, color: 'bg-slate-400', pct: 100 },
                { label: '🚫 Blocked by Spam Filter (Layer 1)', count: o?.spam_blocked_month || 0, color: 'bg-red-400', pct: spamRate },
                { label: '📢 Sales Pitches (Layer 2)', count: o?.sales_pitches_month || 0, color: 'bg-orange-400', pct: totalSubmissions > 0 ? Math.round((o?.sales_pitches_month || 0) / totalSubmissions * 100) : 0 },
                { label: '✅ Qualified Leads (Layer 3 AI)', count: o?.qualified_leads_month || 0, color: 'bg-indigo-500', pct: qualifiedRate },
                { label: '🔥 Hot Leads (Score 70+)', count: o?.hot_leads_total || 0, color: 'bg-green-500', pct: (o?.qualified_leads_month || 0) > 0 ? Math.round((o?.hot_leads_total || 0) / (o?.qualified_leads_month || 1) * 100) : 0 },
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
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{biz.company_name}</p>
                      <p className="text-xs text-slate-500">{biz.lead_count} qualified leads · {biz.hot_leads} hot</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg font-medium">
                        🔥 {biz.hot_leads} hot
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
