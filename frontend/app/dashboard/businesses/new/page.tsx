'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import BusinessForm, { BusinessFormData } from '@/components/forms/BusinessForm';

export default function NewBusinessPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(data: BusinessFormData) {
    setLoading(true);
    try {
      const res = await api.post('/businesses', data);
      toast.success('Business created successfully!');
      router.push(`/dashboard/businesses/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create business';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">
          ← Back to Businesses
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add New Business</h1>
        <p className="text-slate-500 mt-1">Create a new business profile to start capturing leads.</p>
      </div>
      <BusinessForm onSubmit={onSubmit} loading={loading} submitLabel="Create Business" />
    </div>
  );
}
