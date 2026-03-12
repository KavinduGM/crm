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
        <Link href="/dashboard/businesses/new" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          + Add Business
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-5xl mb-4">🏢</p>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No businesses yet</h3>
          <p className="text-slate-500 mb-6">Create your first business profile to get started.</p>
          <Link href="/dashboard/businesses/new" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">
            Create Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map(biz => (
            <div key={biz.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
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
                  <span className="flex items-center gap-1">📋 {biz.form_count} {biz.form_count === 1 ? 'form' : 'forms'}</span>
                  <span className="flex items-center gap-1">👥 {biz.lead_count} {biz.lead_count === 1 ? 'lead' : 'leads'}</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/businesses/${biz.id}`} className="flex-1 py-2 text-center text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition">
                    Manage
                  </Link>
                  <button onClick={() => deleteBusiness(biz.id, biz.company_name)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition">
                    🗑
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
