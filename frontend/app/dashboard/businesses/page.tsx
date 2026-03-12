'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Business {
  id: number;
  company_name: string;
  slug: string;
  email: string;
  industry: string;
  form_count: number;
  lead_count: number;
  created_at: string;
  is_active: boolean;
}

function IconBuilding({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconForms({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconUsers({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const res = await api.get('/businesses');
      setBusinesses(res.data.data);
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }

  async function deleteBusiness(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This will also delete all forms and leads.`)) return;
    try {
      await api.delete(`/businesses/${id}`);
      toast.success('Business deleted');
      setBusinesses(prev => prev.filter(b => b.id !== id));
    } catch {
      toast.error('Failed to delete business');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
          <p className="text-slate-500 mt-1">Manage your business profiles and their contact forms.</p>
        </div>
        <Link href="/dashboard/businesses/new" className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          + Add Business
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-center mb-4 text-slate-300">
            <IconBuilding className="w-14 h-14" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No businesses yet</h3>
          <p className="text-slate-500 mb-6">Create your first business profile to get started.</p>
          <Link href="/dashboard/businesses/new" className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition">
            Create Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map(biz => (
            <div key={biz.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                    {biz.company_name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${biz.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {biz.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">{biz.company_name}</h3>
                {biz.industry && <p className="text-slate-500 text-sm mb-3">{biz.industry}</p>}
                {biz.email && <p className="text-slate-400 text-xs mb-4 truncate">{biz.email}</p>}

                <div className="flex gap-4 text-sm text-slate-600 mb-5">
                  <span className="flex items-center gap-1.5">
                    <IconForms className="w-3.5 h-3.5 text-slate-400" />
                    {biz.form_count} {biz.form_count === 1 ? 'form' : 'forms'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                    {biz.lead_count} {biz.lead_count === 1 ? 'lead' : 'leads'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/businesses/${biz.id}`} className="flex-1 py-2 text-center text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 font-medium transition">
                    Manage
                  </Link>
                  <button onClick={() => deleteBusiness(biz.id, biz.company_name)} className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Public URL */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 truncate">
                  /form/{biz.slug}/contact-us
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
