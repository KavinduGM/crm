'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  answers: Array<{ question: string; answer: string }>;
  submission_time: string;
  business_name: string;
  pipeline_log: Array<{ layer: number; name: string; reasons?: string[] }>;
}

export default function SalesPitchesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchPitches(); }, [page]);

  async function fetchPitches() {
    setLoading(true);
    try {
      // Leads with status=sales_pitch
      const res = await api.get(`/leads?status=sales_pitch&page=${page}&limit=20`);
      setLeads(res.data.data);
      setTotal(res.data.pagination.total);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  async function deleteLead(id: number) {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Deleted');
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">📢 Sales Pitches Inbox</h1>
        <p className="text-slate-500 mt-1">{total} outbound sales &amp; marketing messages captured by Layer 2 Intent Filter</p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-orange-50 px-6 py-3 border-b border-orange-100">
            <p className="text-sm text-orange-700 font-medium">
              📢 These are outbound sales/marketing emails, NOT real leads. They are kept here for review.
            </p>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-5xl mb-3">📭</p>
              <p>No sales pitches detected yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {leads.map(lead => (
                <div key={lead.id}
                  onClick={() => setSelected(lead)}
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${selected?.id === lead.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-bold flex-shrink-0">
                    📢
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{lead.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.email} · {lead.business_name}</p>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">{formatDate(lead.submission_time)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-sm mb-5">
              <div><p className="text-slate-500 text-xs">Name</p><p className="font-medium">{selected.name || '—'}</p></div>
              <div><p className="text-slate-500 text-xs">Email</p><p className="font-medium break-all">{selected.email}</p></div>
              <div><p className="text-slate-500 text-xs">Business</p><p className="font-medium">{selected.business_name}</p></div>
              <div><p className="text-slate-500 text-xs">Received</p><p className="font-medium">{formatDate(selected.submission_time)}</p></div>

              {/* Detection signals */}
              {selected.pipeline_log && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">Detection Signals</p>
                  {(selected.pipeline_log.find(l => l.layer === 2)?.reasons || []).map((r, i) => (
                    <span key={i} className="inline-block text-xs mr-1 mb-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-lg">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {selected.answers && selected.answers.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">Responses</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.answers.map((a, i) => (
                      <div key={i} className="text-xs bg-slate-50 p-2 rounded-lg">
                        <p className="text-slate-500">{a.question}</p>
                        <p className="text-slate-800 mt-0.5">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => deleteLead(selected.id)}
              className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition">
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
