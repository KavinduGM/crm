'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface Lead {
  id: number; name: string; email: string; phone: string;
  business_name: string; form_name: string; form_type: string;
  submission_time: string; priority: string; lead_score: number; status: string;
}

// ── SVG Icons ───────────────────────────────────────────────────────
function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconAI({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IconForm({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconInbox({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

const PRIORITY_TABS = [
  { value: '', label: 'All Leads' },
  { value: 'high', label: 'Hot' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'sales_pitch', label: 'Pitches', isStatus: true },
];

const PRIORITY_BADGE: Record<string, { cls: string; label: string }> = {
  high:   { cls: 'bg-red-50 text-red-700', label: 'Hot' },
  medium: { cls: 'bg-amber-50 text-amber-700', label: 'Medium' },
  low:    { cls: 'bg-slate-100 text-slate-600', label: 'Low' },
};

function LeadsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const priority = searchParams.get('priority') || '';
  const status = searchParams.get('status') || '';
  const formId = searchParams.get('formId');
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => { fetchLeads(); }, [priority, status, formId, page]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (priority) params.append('priority', priority);
      if (status) params.append('status', status);
      if (formId) params.append('formId', formId);
      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
  }

  async function deleteLead(id: number) {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Deleted');
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch { toast.error('Failed'); }
  }

  function switchTab(value: string, isStatus?: boolean) {
    const params = new URLSearchParams();
    if (isStatus) params.set('status', value);
    else if (value) params.set('priority', value);
    router.push(`/dashboard/leads${params.toString() ? '?' + params : ''}`);
  }

  const activeTab = status === 'sales_pitch' ? 'sales_pitch' : priority;
  const titleMap: Record<string, string> = { high: 'Hot Leads', medium: 'Medium Leads', low: 'Low Leads', '': 'All Leads', sales_pitch: 'Sales Pitches' };
  const title = titleMap[activeTab] || 'All Leads';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1">{pagination.total} leads</p>
        </div>
      </div>

      {/* Priority Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm w-fit">
        {PRIORITY_TABS.map(tab => (
          <button key={tab.value}
            onClick={() => switchTab(tab.value, tab.isStatus)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab.value ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="flex justify-center mb-3 text-slate-300">
              <IconInbox />
            </div>
            <p>No leads in this category yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Email', 'Priority', 'Score', 'Business', 'Form', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                          {lead.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-slate-900">{lead.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{lead.email}</td>
                    <td className="px-5 py-4">
                      {lead.priority && (() => {
                        const badge = PRIORITY_BADGE[lead.priority] || { cls: 'bg-slate-100 text-slate-600', label: lead.priority };
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      {lead.lead_score > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${lead.lead_score >= 70 ? 'bg-red-500' : lead.lead_score >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                              style={{ width: `${lead.lead_score}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{lead.lead_score}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{lead.business_name}</td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        {lead.form_type === 'ai' ? <IconAI className="w-3.5 h-3.5 text-blue-600" /> : <IconForm className="w-3.5 h-3.5 text-slate-500" />}
                        {lead.form_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">{formatDate(lead.submission_time)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/leads/${lead.id}`} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition">View</Link>
                        <button onClick={() => deleteLead(lead.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/dashboard/leads?page=${page - 1}${priority ? `&priority=${priority}` : ''}`} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg">Prev</Link>}
              {page < pagination.totalPages && <Link href={`/dashboard/leads?page=${page + 1}${priority ? `&priority=${priority}` : ''}`} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-8 bg-slate-200 rounded animate-pulse w-48" /></div>}>
      <LeadsContent />
    </Suspense>
  );
}
