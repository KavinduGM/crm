'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface AiAnalysis {
  intent?: string;
  service_requested?: string;
  urgency?: string;
  budget_signal?: string;
  location?: string;
  project_size?: string;
  summary?: string;
  service_relevance?: number;
  conversion_probability?: number;
  estimated_value?: string;
  key_signals?: string[];
}

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  answers: Array<{ question: string; answer: string }>;
  submission_time: string;
  source_url: string;
  ip_address: string;
  business_name: string;
  form_name: string;
  form_type: string;
  status: string;
  priority: string;
  lead_score: number | null;
  ai_analysis: AiAnalysis | string | null;
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

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high:   { label: 'High Priority', cls: 'bg-red-50 text-red-700' },
    medium: { label: 'Medium Priority', cls: 'bg-amber-50 text-amber-700' },
    low:    { label: 'Low Priority', cls: 'bg-slate-100 text-slate-600' },
  };
  const { label, cls } = map[priority] || { label: priority, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    qualified:   { label: 'Qualified', cls: 'bg-green-50 text-green-700' },
    sales_pitch: { label: 'Sales Pitch', cls: 'bg-purple-50 text-purple-700' },
    pending:     { label: 'Pending', cls: 'bg-slate-100 text-slate-600' },
    spam:        { label: 'Spam', cls: 'bg-red-50 text-red-700' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#94a3b8';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    immediate: 'bg-red-100 text-red-700',
    soon: 'bg-orange-100 text-orange-700',
    flexible: 'bg-blue-100 text-blue-700',
    unknown: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${map[urgency] || map.unknown}`}>
      {urgency}
    </span>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/leads/${id}`).then(r => setLead(r.data.data))
      .catch(() => toast.error('Lead not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function deleteLead() {
    if (!confirm('Delete this lead permanently?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      router.push('/dashboard/leads');
    } catch {
      toast.error('Failed to delete lead');
    }
  }

  if (loading) return <div className="p-8"><div className="h-8 bg-slate-200 rounded animate-pulse w-48" /></div>;
  if (!lead) return <div className="p-8 text-slate-500">Lead not found.</div>;

  function parseJson<T>(val: unknown, fallback: T): T {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val as T;
    if (typeof val === 'string') {
      try { return JSON.parse(val) as T; } catch { return fallback; }
    }
    return fallback;
  }

  const answers = parseJson<Array<{ question: string; answer: string }>>(lead.answers, []);

  let ai: AiAnalysis | null = null;
  if (lead.ai_analysis) {
    ai = parseJson<AiAnalysis | null>(lead.ai_analysis, null);
  }

  const convProb = ai?.conversion_probability ?? null;
  const convProbPct = convProb !== null ? Math.min(Math.round(convProb), 100) : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/leads" className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">
          Back to Leads
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{lead.name || 'Unknown Lead'}</h1>
            <p className="text-slate-500 mt-1 text-sm">Submitted {formatDate(lead.submission_time)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {lead.status && <StatusBadge status={lead.status} />}
              {lead.priority && <PriorityBadge priority={lead.priority} />}
            </div>
          </div>
          <button
            onClick={deleteLead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-medium transition flex-shrink-0"
          >
            <IconTrash className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Lead Score */}
      {lead.lead_score !== null && lead.lead_score !== undefined && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <h2 className="font-semibold text-slate-900 mb-3">Lead Score</h2>
          <ScoreBar score={lead.lead_score} />
          <p className="text-xs text-slate-400 mt-2">
            {lead.lead_score >= 70 ? 'High-value lead — prioritize follow-up immediately.' :
             lead.lead_score >= 40 ? 'Medium-value lead — worth nurturing.' :
             'Low-score lead — lower priority.'}
          </p>
        </div>
      )}

      {/* AI Analysis */}
      {ai && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center text-white">
              <IconAI className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-900">AI Analysis</h2>
            <span className="ml-auto text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Powered by GPT-4o-mini</span>
          </div>

          {/* Summary */}
          {ai.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800 leading-relaxed">{ai.summary}</p>
            </div>
          )}

          {/* Key metrics row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {ai.intent && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Intent</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{ai.intent.replace(/_/g, ' ')}</p>
              </div>
            )}
            {ai.service_requested && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Service Requested</p>
                <p className="text-sm font-medium text-slate-900">{ai.service_requested}</p>
              </div>
            )}
            {ai.urgency && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Urgency</p>
                <UrgencyBadge urgency={ai.urgency} />
              </div>
            )}
            {ai.budget_signal && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Budget Signal</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{ai.budget_signal.replace(/_/g, ' ')}</p>
              </div>
            )}
            {ai.location && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Location</p>
                <p className="text-sm font-medium text-slate-900">{ai.location}</p>
              </div>
            )}
            {ai.project_size && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Project Size</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{ai.project_size}</p>
              </div>
            )}
          </div>

          {/* Probability + Value */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {convProbPct !== null && (
              <div className="border border-slate-100 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-2">Conversion Probability</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${convProbPct}%`,
                        backgroundColor: convProbPct >= 70 ? '#22c55e' : convProbPct >= 40 ? '#f59e0b' : '#94a3b8'
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{convProbPct}%</span>
                </div>
              </div>
            )}
            {ai.estimated_value && (
              <div className="border border-slate-100 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
                <p className="text-sm font-semibold text-green-700">{ai.estimated_value}</p>
              </div>
            )}
          </div>

          {/* Key signals */}
          {ai.key_signals && ai.key_signals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Signals</p>
              <div className="flex flex-wrap gap-2">
                {ai.key_signals.map((signal, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Name</p>
            <p className="font-medium text-slate-900 mt-0.5">{lead.name || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <a href={`mailto:${lead.email}`} className="font-medium text-blue-700 hover:underline mt-0.5 block">{lead.email}</a>
          </div>
          <div>
            <p className="text-slate-500">Phone</p>
            <p className="font-medium text-slate-900 mt-0.5">{lead.phone || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Business</p>
            <p className="font-medium text-slate-900 mt-0.5">{lead.business_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Form</p>
            <p className="font-medium text-slate-900 mt-0.5 flex items-center gap-1.5">
              {lead.form_type === 'ai'
                ? <IconAI className="w-3.5 h-3.5 text-blue-600" />
                : <IconForm className="w-3.5 h-3.5 text-slate-500" />}
              {lead.form_name}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Source</p>
            <p className="font-medium text-slate-900 mt-0.5 truncate">{lead.source_url || '-'}</p>
          </div>
        </div>
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <h2 className="font-semibold text-slate-900 mb-4">Form Responses</h2>
          <div className="space-y-4">
            {answers.map((a, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{a.question}</p>
                <p className="text-slate-900 text-sm">{a.answer || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Metadata</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">IP Address</p>
            <p className="font-mono text-slate-900 mt-0.5">{lead.ip_address || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Submission Time</p>
            <p className="text-slate-900 mt-0.5">{formatDate(lead.submission_time)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-500">Source URL</p>
            <p className="text-slate-900 mt-0.5 break-all">{lead.source_url || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
