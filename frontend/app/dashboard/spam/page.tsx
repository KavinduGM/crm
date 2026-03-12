'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface SpamLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  spam_score: number;
  spam_reasons: string[];
  submission_time: string;
  ip_address: string;
  company_name: string;
  business_id: number;
  marked_not_spam: boolean;
  is_reviewed: boolean;
}

function IconShieldX({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
    </svg>
  );
}
function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconX({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconWarning({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default function SpamPage() {
  const [leads, setLeads] = useState<SpamLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SpamLead | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchSpam(); }, [page]);

  async function fetchSpam() {
    setLoading(true);
    try {
      const res = await api.get(`/spam?page=${page}&limit=20`);
      setLeads(res.data.data);
      setTotal(res.data.pagination.total);
    } catch { toast.error('Failed to load spam'); }
    finally { setLoading(false); }
  }

  async function markNotSpam(id: number) {
    setProcessing(id);
    try {
      const res = await api.post(`/spam/${id}/mark-not-spam`);
      toast.success(`Lead moved to CRM as ${res.data.status} (${res.data.priority} priority)`);
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotal(t => t - 1);
      setSelected(null);
    } catch { toast.error('Failed to process lead'); }
    finally { setProcessing(null); }
  }

  async function deleteSpam(id: number) {
    if (!confirm('Permanently delete this spam entry?')) return;
    setProcessing(id);
    try {
      await api.delete(`/spam/${id}`);
      toast.success('Deleted');
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotal(t => t - 1);
      setSelected(null);
    } catch { toast.error('Failed to delete'); }
    finally { setProcessing(null); }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-red-600 bg-red-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  }

  const formatReason = (r: string) => r.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconShieldX className="w-6 h-6 text-red-500" /> Spam Folder
          </h1>
          <p className="text-slate-500 mt-1">{total} spam entries · Auto-deletes oldest when over 100 · Reviewing teaches the system</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center gap-2">
            <IconWarning className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              These submissions were blocked by the AI spam filter. Mark as &quot;Not Spam&quot; if incorrectly classified.
            </p>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="flex justify-center mb-3 text-slate-300">
                <IconShieldX className="w-12 h-12" />
              </div>
              <p>No spam here. Your filters are working great!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {leads.map(lead => (
                <div key={lead.id}
                  onClick={() => setSelected(lead)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${selected?.id === lead.id ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
                    <IconShieldX className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm truncate">{lead.name || 'Unknown'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getScoreColor(lead.spam_score)}`}>
                        {lead.spam_score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{lead.email} · {lead.company_name}</p>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">{formatDate(lead.submission_time)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {Math.ceil(total / 20) > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
              <div className="flex gap-2">
                {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm bg-slate-100 rounded-lg">Prev</button>}
                {page < Math.ceil(total / 20) && <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm bg-slate-100 rounded-lg">Next</button>}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Spam Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm mb-5">
              <div><p className="text-slate-500 text-xs">Name</p><p className="font-medium">{selected.name || '-'}</p></div>
              <div><p className="text-slate-500 text-xs">Email</p><p className="font-medium break-all">{selected.email}</p></div>
              {selected.phone && <div><p className="text-slate-500 text-xs">Phone</p><p className="font-medium">{selected.phone}</p></div>}
              <div><p className="text-slate-500 text-xs">Business</p><p className="font-medium">{selected.company_name}</p></div>
              <div><p className="text-slate-500 text-xs">IP Address</p><p className="font-mono text-xs">{selected.ip_address}</p></div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Spam Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${selected.spam_score}%` }} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreColor(selected.spam_score)}`}>{selected.spam_score}/100</span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-2">Detection Reasons</p>
                <div className="flex flex-wrap gap-1">
                  {(selected.spam_reasons || []).map((r, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-lg">{formatReason(r)}</span>
                  ))}
                </div>
              </div>
              {selected.message && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Message</p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg max-h-24 overflow-y-auto">{selected.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => markNotSpam(selected.id)}
                disabled={processing === selected.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {processing === selected.id
                  ? 'Processing...'
                  : <><IconCheck className="w-4 h-4" /> Not Spam — Move to CRM</>}
              </button>
              <p className="text-xs text-slate-400 text-center">This teaches the system to trust this domain</p>
              <button
                onClick={() => deleteSpam(selected.id)}
                disabled={processing === selected.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition disabled:opacity-60"
              >
                <IconTrash className="w-4 h-4" /> Delete Permanently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
