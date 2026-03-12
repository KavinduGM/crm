'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import FormBuilder from '@/components/forms/FormBuilder';

export default function NewFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(data: unknown) {
    setLoading(true);
    try {
      await api.post(`/forms/business/${id}`, data);
      toast.success('Form created!');
      router.push(`/dashboard/businesses/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create form';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/businesses/${id}`} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">← Back to Business</Link>
        <h1 className="text-2xl font-bold text-slate-900">Create Contact Form</h1>
        <p className="text-slate-500 mt-1">Configure your form type, fields, and branding.</p>
      </div>
      <FormBuilder onSubmit={onSubmit} loading={loading} />
    </div>
  );
}
