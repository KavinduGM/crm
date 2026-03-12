'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StandardForm from './StandardForm';
import AiForm from './AiForm';

interface Business {
  id: number;
  company_name: string;
  slug: string;
  email: string;
  logo_url: string;
  social_links: Record<string, string>;
  messaging_apps: Record<string, string>;
}

interface Form {
  id: number;
  name: string;
  form_type: 'standard' | 'ai';
  fields: Array<{ id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[] }>;
  branding: { primary_color: string; font: string; description: string; logo_url?: string };
  contact_info: { email?: string; messaging_apps?: Record<string, string>; social_links?: Record<string, string> };
  ai_config: { generated_questions?: unknown[]; industry?: string; services?: string };
  thank_you_message: string;
}

// MySQL JSON columns may come back as raw strings — parse them safely
function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

function normalizeForm(raw: Record<string, unknown>): Form {
  return {
    id: raw.id as number,
    name: (raw.name as string) || 'Contact Us',
    form_type: (raw.form_type as 'standard' | 'ai') || 'standard',
    fields: parseJson<Form['fields']>(raw.fields, []),
    branding: {
      primary_color: '#6366f1',
      font: 'Inter',
      description: '',
      ...parseJson<Partial<Form['branding']>>(raw.branding, {}),
    },
    contact_info: parseJson<Form['contact_info']>(raw.contact_info, {}),
    ai_config: parseJson<Form['ai_config']>(raw.ai_config, {}),
    thank_you_message: (raw.thank_you_message as string) || 'Thank you! We will be in touch shortly.',
  };
}

function normalizeBusiness(raw: Record<string, unknown>): Business {
  return {
    id: raw.id as number,
    company_name: (raw.company_name as string) || 'Company',
    slug: (raw.slug as string) || '',
    email: (raw.email as string) || '',
    logo_url: (raw.logo_url as string) || '',
    social_links: parseJson<Record<string, string>>(raw.social_links, {}),
    messaging_apps: parseJson<Record<string, string>>(raw.messaging_apps, {}),
  };
}

export default function PublicFormWrapper({ companySlug }: { companySlug: string }) {
  const [data, setData] = useState<{ business: Business; form: Form } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/public/${companySlug}`)
      .then(r => {
        const raw = r.data.data;
        if (!raw || !raw.form || !raw.business) {
          setNotFound(true);
          return;
        }
        setData({
          business: normalizeBusiness(raw.business as Record<string, unknown>),
          form: normalizeForm(raw.form as Record<string, unknown>),
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [companySlug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Form Not Found</h1>
        <p className="text-slate-500">This contact form doesn&apos;t exist or has been deactivated.</p>
      </div>
    </div>
  );

  if (data.form.form_type === 'ai') {
    return <AiForm business={data.business} form={data.form} companySlug={companySlug} />;
  }

  return <StandardForm business={data.business} form={data.form} companySlug={companySlug} />;
}
