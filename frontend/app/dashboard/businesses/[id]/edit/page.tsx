'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import BusinessForm, { BusinessFormData } from '@/components/forms/BusinessForm';

export default function EditBusinessPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get(`/businesses/${id}`).then(r => {
      const b = r.data.data;
      setBusiness({
        company_name: b.company_name || '',
        email: b.email || '',
        phone: b.phone || '',
        website: b.website || '',
        industry: b.industry || '',
        num_employees: b.num_employees || '',
        annual_revenue: b.annual_revenue || '',
        notes: b.notes || '',
        logo_url: b.logo_url || '',
        social_links: b.social_links || {},
        paid_platforms: b.paid_platforms || [],
        messaging_apps: b.messaging_apps || {},
      });
    }).catch(() => toast.error('Failed to load business')).finally(() => setFetching(false));
  }, [id]);

  async function onSubmit(data: BusinessFormData) {
    setLoading(true);
    try {
      await api.put(`/businesses/${id}`, data);
      toast.success('Business updated!');
      router.push(`/dashboard/businesses/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="p-8"><div className="h-8 bg-slate-200 rounded animate-pulse w-48" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/businesses/${id}`} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">← Back</Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Business</h1>
      </div>
      {business && <BusinessForm defaultValues={business} onSubmit={onSubmit} loading={loading} submitLabel="Update Business" />}
    </div>
  );
}
