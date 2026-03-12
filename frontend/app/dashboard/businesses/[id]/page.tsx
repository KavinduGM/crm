'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Business {
  id: number;
  company_name: string;
  slug: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  num_employees: string;
  annual_revenue: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

interface Form {
  id: number;
  name: string;
  form_type: string;
  is_active: boolean;
  lead_count: number;
  created_at: string;
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/businesses/${id}`),
      api.get(`/forms/business/${id}`),
    ]).then(([bRes, fRes]) => {
      setBusiness(bRes.data.data);
      setForms(fRes.data.data);
    }).catch(() => toast.error('Failed to load business')).finally(() => setLoading(false));
  }, [id]);

  async function deleteForm(formId: number) {
    if (!confirm('Delete this form? All associated leads will also be deleted.')) return;
    try {
      await api.delete(`/forms/${formId}`);
      toast.success('Form deleted');
      setForms(prev => prev.filter(f => f.id !== formId));
    } catch {
      toast.error('Failed to delete form');
    }
  }

  if (loading) return <div className="p-8"><div className="h-8 bg-slate-200 rounded animate-pulse w-48" /></div>;
  if (!business) return <div className="p-8 text-slate-500">Business not found.</div>;

  const publicUrl = `${window.location.origin}/${business.slug}/contact-us`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">← Back to Businesses</Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {business.company_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{business.company_name}</h1>
              <p className="text-slate-500 text-sm">{business.industry} · Created {formatDate(business.created_at)}</p>
            </div>
          </div>
          <Link href={`/dashboard/businesses/${id}/edit`} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition">
            ✏️ Edit
          </Link>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Business Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {business.email && <div><p className="text-slate-500">Email</p><p className="text-slate-900 font-medium">{business.email}</p></div>}
          {business.phone && <div><p className="text-slate-500">Phone</p><p className="text-slate-900 font-medium">{business.phone}</p></div>}
          {business.website && <div><p className="text-slate-500">Website</p><a href={business.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">{business.website}</a></div>}
          {business.num_employees && <div><p className="text-slate-500">Employees</p><p className="text-slate-900 font-medium">{business.num_employees}</p></div>}
          {business.annual_revenue && <div><p className="text-slate-500">Revenue</p><p className="text-slate-900 font-medium">{business.annual_revenue}</p></div>}
        </div>
        {business.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-500 text-sm">Notes</p>
            <p className="text-slate-700 text-sm mt-1">{business.notes}</p>
          </div>
        )}
      </div>

      {/* Public URL */}
      <div className="bg-indigo-50 rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-900 mb-1">Public Form URL</p>
          <p className="text-indigo-600 text-sm font-mono">{publicUrl}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied!'); }}
            className="px-4 py-2 bg-white text-indigo-600 text-sm font-medium rounded-xl border border-indigo-200 hover:bg-indigo-50 transition">
            Copy URL
          </button>
          <a href={`/${business.slug}/contact-us`} target="_blank" rel="noreferrer"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition">
            Preview →
          </a>
        </div>
      </div>

      {/* Forms */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Contact Forms ({forms.length})</h2>
          <Link href={`/dashboard/businesses/${id}/forms/new`} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
            + Create Form
          </Link>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="mb-4">No forms yet. Create your first contact form.</p>
            <Link href={`/dashboard/businesses/${id}/forms/new`} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
              Create Form
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {forms.map(form => (
              <div key={form.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${form.form_type === 'ai' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                  {form.form_type === 'ai' ? '🤖' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{form.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.form_type === 'ai' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {form.form_type === 'ai' ? 'AI Powered' : 'Standard'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{form.lead_count} leads · Created {formatDate(form.created_at)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/dashboard/businesses/${id}/forms/${form.id}`} className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium">
                    Edit
                  </Link>
                  <Link href={`/dashboard/leads?formId=${form.id}`} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition font-medium">
                    Leads
                  </Link>
                  <button onClick={() => deleteForm(form.id)} className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition text-sm">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
