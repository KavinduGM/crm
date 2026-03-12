'use client';
import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance & Banking', 'Real Estate', 'Education',
  'E-commerce / Retail', 'Marketing & Advertising', 'Legal Services',
  'Consulting', 'Manufacturing', 'Construction', 'Hospitality & Tourism',
  'Non-profit', 'Media & Entertainment', 'Other',
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const REVENUE_RANGES = ['Under $100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M-$20M', '$20M+'];
const AD_PLATFORMS = ['Google Ads', 'Meta Ads (Facebook/Instagram)', 'LinkedIn Ads', 'TikTok Ads', 'Twitter Ads', 'YouTube Ads', 'Pinterest Ads', 'Snapchat Ads'];

const schema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  industry: z.string().optional(),
  num_employees: z.string().optional(),
  annual_revenue: z.string().optional(),
  notes: z.string().optional(),
  logo_url: z.string().optional(),
  social_links: z.object({
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    discord: z.string().optional(),
    tiktok: z.string().optional(),
  }).optional(),
  paid_platforms: z.array(z.string()).optional(),
  messaging_apps: z.object({
    whatsapp: z.string().optional(),
    telegram: z.string().optional(),
    signal: z.string().optional(),
    wechat: z.string().optional(),
  }).optional(),
});

export type BusinessFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<BusinessFormData>;
  onSubmit: (data: BusinessFormData) => Promise<void>;
  loading: boolean;
  submitLabel?: string;
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
      <h3 className="font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm';
const selectCls = cn(inputCls, 'bg-white cursor-pointer');

export default function BusinessForm({ defaultValues, onSubmit, loading, submitLabel = 'Save Business' }: Props) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<BusinessFormData>({
    resolver: zodResolver(schema),
    defaultValues: { paid_platforms: [], ...defaultValues },
  });

  const platforms = watch('paid_platforms') || [];
  const logoUrl = watch('logo_url');

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string>(defaultValues?.logo_url || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePlatform(p: string) {
    if (platforms.includes(p)) setValue('paid_platforms', platforms.filter(x => x !== p));
    else setValue('paid_platforms', [...platforms, p]);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('logo_url', res.data.url);
    } catch {
      setLogoError('Upload failed. Please try again.');
      setLogoPreview(logoUrl || '');
    } finally {
      setLogoUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeLogo() {
    setLogoPreview('');
    setValue('logo_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      <FieldGroup title="Business Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name" required error={errors.company_name?.message}>
            <input {...register('company_name')} placeholder="Acme Corporation" className={inputCls} />
          </Field>
          <Field label="Email Address" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="contact@company.com" className={inputCls} />
          </Field>
          <Field label="Phone Number" error={errors.phone?.message}>
            <input {...register('phone')} placeholder="+1 (555) 000-0000" className={inputCls} />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <input {...register('website')} placeholder="https://company.com" className={inputCls} />
          </Field>
          <Field label="Industry">
            <select {...register('industry')} className={selectCls}>
              <option value="">Select industry...</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Number of Employees">
            <select {...register('num_employees')} className={selectCls}>
              <option value="">Select range...</option>
              {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Annual Revenue">
            <select {...register('annual_revenue')} className={selectCls}>
              <option value="">Select range...</option>
              {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Additional Notes">
            <textarea {...register('notes')} rows={3} placeholder="Any additional information about this business..." className={cn(inputCls, 'resize-none')} />
          </Field>
        </div>
      </FieldGroup>

      {/* Company Logo Upload */}
      <FieldGroup title="Company Logo">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={handleLogoChange}
          className="hidden"
        />
        <input type="hidden" {...register('logo_url')} />

        <div className="flex items-start gap-5">
          {/* Preview box */}
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-3xl text-slate-300">🏢</span>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">
              Upload your company logo. Supported formats: JPG, PNG, GIF, WebP, SVG. Max size: 5MB.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {logoUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Logo
                  </>
                )}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-500 text-sm font-medium rounded-lg border border-slate-200 hover:border-red-200 transition"
                >
                  Remove
                </button>
              )}
            </div>
            {logoError && <p className="mt-2 text-xs text-red-500">{logoError}</p>}
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Social Media Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'discord', 'tiktok'] as const).map(platform => (
            <Field key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
              <input {...register(`social_links.${platform}`)} placeholder={`https://${platform}.com/yourpage`} className={inputCls} />
            </Field>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="Messaging Apps">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['whatsapp', 'telegram', 'signal', 'wechat'] as const).map(app => (
            <Field key={app} label={app.charAt(0).toUpperCase() + app.slice(1) + ' Link'}>
              <input {...register(`messaging_apps.${app}`)} placeholder={`${app} link or number`} className={inputCls} />
            </Field>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="Paid Advertising Platforms">
        <Controller
          name="paid_platforms"
          control={control}
          render={() => (
            <div className="flex flex-wrap gap-2">
              {AD_PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
                    platforms.includes(p)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  )}>
                  {p}
                </button>
              ))}
            </div>
          )}
        />
      </FieldGroup>

      <div className="flex justify-end pt-2 pb-8">
        <button type="submit" disabled={loading}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
}
