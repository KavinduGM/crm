'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import FormBuilder from '@/components/forms/FormBuilder';

export default function EditFormPage() {
  const { id, formId } = useParams<{ id: string; formId: string }>();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get(`/forms/${formId}`).then(r => setForm(r.data.data))
      .catch(() => toast.error('Failed to load form'))
      .finally(() => setFetching(false));
  }, [formId]);

  async function onSubmit(data: unknown) {
    setLoading(true);
    try {
      await api.put(`/forms/${formId}`, data);
      toast.success('Form updated!');
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/businesses/${id}`} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">← Back to Business</Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Form</h1>
      </div>
      {form && <FormBuilder onSubmit={onSubmit} loading={loading} defaultValues={form} />}
    </div>
  );
}
