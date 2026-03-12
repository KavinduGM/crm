'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const DEFAULT_FIELDS = [
  { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true },
  { id: 'email', type: 'email', label: 'Email Address', placeholder: 'your@email.com', required: true },
  { id: 'phone', type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
  { id: 'service', type: 'select', label: 'Service Needed', required: true, options: ['General Inquiry', 'Support', 'Sales', 'Partnership', 'Other'] },
  { id: 'message', type: 'textarea', label: 'Project Details / Message', placeholder: 'Tell us about your project...', required: true },
];

const SOCIAL_PLATFORMS = ['facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'discord', 'tiktok'] as const;
const MESSAGING_APPS = ['whatsapp', 'telegram', 'signal', 'wechat'] as const;
const FONTS = ['Inter', 'Roboto', 'Poppins', 'Lato', 'Montserrat', 'Open Sans'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Real Estate', 'Education', 'E-commerce', 'Marketing', 'Legal', 'Consulting', 'Other'];

type FormField = typeof DEFAULT_FIELDS[number];

interface FormData {
  name: string;
  form_type: 'standard' | 'ai';
  fields: FormField[];
  branding: { primary_color: string; font: string; description: string; logo_url: string };
  contact_info: {
    email: string;
    messaging_apps: Record<string, string>;
    social_links: Record<string, string>;
  };
  ai_config: { industry: string; category: string; services: string; goal: string; target_customer: string; generated_questions: unknown[] };
  thank_you_message: string;
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition';

// MySQL returns JSON columns as raw strings — parse safely
function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

export default function FormBuilder({ onSubmit, loading, defaultValues }: {
  onSubmit: (data: FormData) => Promise<void>;
  loading: boolean;
  defaultValues?: Partial<FormData>;
}) {
  const [step, setStep] = useState<'type' | 'design' | 'ai-config'>('type');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string>(
    parseJson<{ logo_url?: string }>(defaultValues?.branding, {}).logo_url || ''
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/upload/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateBranding('logo_url', res.data.url);
    } catch {
      setLogoError('Upload failed. Please try again.');
      setLogoPreview(formData.branding.logo_url || '');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  function removeLogo() {
    setLogoPreview('');
    updateBranding('logo_url', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  const [formData, setFormData] = useState<FormData>({
    name: defaultValues?.name || 'Contact Us',
    form_type: defaultValues?.form_type || 'standard',
    fields: parseJson(defaultValues?.fields, JSON.parse(JSON.stringify(DEFAULT_FIELDS))),
    branding: parseJson(defaultValues?.branding, { primary_color: '#6366f1', font: 'Inter', description: "Fill out the form below and we'll get back to you shortly.", logo_url: '' }),
    contact_info: parseJson(defaultValues?.contact_info, { email: '', messaging_apps: {}, social_links: {} }),
    ai_config: parseJson(defaultValues?.ai_config, { industry: '', category: '', services: '', goal: '', target_customer: '', generated_questions: [] }),
    thank_you_message: defaultValues?.thank_you_message || 'Thank you for contacting us. Our team will get back to you shortly.',
  });

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  function updateBranding(key: string, value: string) {
    setFormData(prev => ({ ...prev, branding: { ...prev.branding, [key]: value } }));
  }

  function updateContactInfo(section: string, key: string, value: string) {
    setFormData(prev => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [section]: typeof prev.contact_info[section as keyof typeof prev.contact_info] === 'object'
          ? { ...(prev.contact_info[section as keyof typeof prev.contact_info] as Record<string, string>), [key]: value }
          : value,
      },
    }));
  }

  function updateAiConfig(key: string, value: string) {
    setFormData(prev => ({ ...prev, ai_config: { ...prev.ai_config, [key]: value } }));
  }

  function addField() {
    const newField: FormField = { id: `field_${Date.now()}`, type: 'text', label: 'New Field', placeholder: '', required: false } as FormField;
    update('fields', [...formData.fields, newField]);
  }

  function removeField(id: string) {
    update('fields', formData.fields.filter(f => f.id !== id));
  }

  function updateField(id: string, key: string, value: unknown) {
    update('fields', formData.fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  }

  async function generateAiQuestions() {
    const { industry, services, goal, target_customer } = formData.ai_config;
    if (!industry || !services) {
      toast.error('Please fill in Industry and Services first');
      return;
    }
    setGeneratingAI(true);
    try {
      const res = await api.post('/forms/generate-ai-questions', {
        industry, services: services.split(',').map(s => s.trim()), goal, target_customer,
        category: formData.ai_config.category,
      });
      setFormData(prev => ({ ...prev, ai_config: { ...prev.ai_config, generated_questions: res.data.data.questions } }));
      toast.success(`Generated ${res.data.data.questions.length} AI questions!`);
    } catch {
      toast.error('Failed to generate questions');
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim()) { toast.error('Form name is required'); return; }
    if (formData.form_type === 'ai' && formData.ai_config.generated_questions.length === 0) {
      toast.error('Please generate AI questions first');
      return;
    }
    await onSubmit(formData);
  }

  return (
    <div className="space-y-6">
      {/* Form Name */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Form Name</label>
        <input value={formData.name} onChange={e => update('name', e.target.value)}
          placeholder="Contact Us" className={inputCls} />
      </div>

      {/* Form Type */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Form Type</h3>
        <div className="grid grid-cols-2 gap-4">
          {(['standard', 'ai'] as const).map(type => (
            <button key={type} type="button" onClick={() => { update('form_type', type); setStep(type === 'ai' ? 'ai-config' : 'design'); }}
              className={cn(
                'p-5 rounded-xl border-2 text-left transition',
                formData.form_type === type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
              )}>
              <div className="text-3xl mb-3">{type === 'ai' ? '🤖' : '📝'}</div>
              <p className="font-semibold text-slate-900">{type === 'ai' ? 'AI Powered Form' : 'Standard Form'}</p>
              <p className="text-sm text-slate-500 mt-1">
                {type === 'ai' ? 'Conversational AI that guides visitors step-by-step' : 'Traditional form with customizable fields'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Standard Form Fields */}
      {formData.form_type === 'standard' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Form Fields</h3>
            <button type="button" onClick={addField} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition">
              + Add Field
            </button>
          </div>
          <div className="space-y-3">
            {formData.fields.map((field, idx) => (
              <div key={field.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Label</label>
                    <input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Type</label>
                    <select value={field.type} onChange={e => updateField(field.id, 'type', e.target.value)} className={cn(inputCls, 'bg-white')}>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 pb-2.5">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} className="rounded" />
                      Required
                    </label>
                  </div>
                  {field.type === 'select' && (
                    <div className="col-span-3">
                      <label className="text-xs text-slate-500 mb-1 block">Options (comma separated)</label>
                      <input
                        value={(field as { options?: string[] }).options?.join(', ') || ''}
                        onChange={e => updateField(field.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="Option 1, Option 2, Option 3"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => removeField(field.id)} disabled={idx < 2}
                  className="text-red-400 hover:text-red-600 transition p-1 disabled:opacity-30 disabled:cursor-not-allowed mt-5">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Config */}
      {formData.form_type === 'ai' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">AI Form Configuration</h3>
          <p className="text-sm text-slate-500 mb-5">Configure the AI assistant with details about your business so it can ask relevant qualifying questions.</p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Industry <span className="text-red-500">*</span></label>
              <select value={formData.ai_config.industry} onChange={e => updateAiConfig('industry', e.target.value)} className={cn(inputCls, 'bg-white')}>
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Category</label>
              <input value={formData.ai_config.category} onChange={e => updateAiConfig('category', e.target.value)} placeholder="e.g. Web Development Agency" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Services / Products <span className="text-red-500">*</span></label>
              <input value={formData.ai_config.services} onChange={e => updateAiConfig('services', e.target.value)}
                placeholder="Website Design, Mobile Apps, SEO, Branding (comma separated)" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Form Goal</label>
              <input value={formData.ai_config.goal} onChange={e => updateAiConfig('goal', e.target.value)} placeholder="Qualify leads for web projects" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Target Customer</label>
              <input value={formData.ai_config.target_customer} onChange={e => updateAiConfig('target_customer', e.target.value)} placeholder="Small to medium businesses" className={inputCls} />
            </div>
          </div>

          <button type="button" onClick={generateAiQuestions} disabled={generatingAI}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
            {generatingAI ? (
              <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating AI Questions...</span>
            ) : '✨ Generate AI Questions'}
          </button>

          {formData.ai_config.generated_questions.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700 mb-3">Generated Questions ({formData.ai_config.generated_questions.length})</p>
              <div className="space-y-2">
                {(formData.ai_config.generated_questions as Array<{ question: string; options?: string[] }>).map((q, i) => (
                  <div key={i} className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm font-medium text-indigo-900">{i + 1}. {q.question}</p>
                    {q.options && <div className="flex flex-wrap gap-1.5 mt-2">{q.options.map((o, j) => <span key={j} className="text-xs px-2 py-1 bg-white text-indigo-700 rounded-md border border-indigo-200">{o}</span>)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branding */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Branding</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={formData.branding.primary_color} onChange={e => updateBranding('primary_color', e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
              <input value={formData.branding.primary_color} onChange={e => updateBranding('primary_color', e.target.value)} className={cn(inputCls, 'flex-1')} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Font</label>
            <select value={formData.branding.font} onChange={e => updateBranding('font', e.target.value)} className={cn(inputCls, 'bg-white')}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Form Logo</label>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  : <span className="text-lg text-slate-300">🏢</span>}
              </div>
              <div className="flex gap-2 flex-1">
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-60 flex items-center gap-1.5">
                  {logoUploading
                    ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading...</>
                    : <>↑ Upload</>}
                </button>
                {logoPreview && (
                  <button type="button" onClick={removeLogo}
                    className="px-3 py-2 text-red-500 text-xs font-medium rounded-lg border border-slate-200 hover:bg-red-50 transition">
                    Remove
                  </button>
                )}
              </div>
            </div>
            {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Form Description</label>
            <textarea value={formData.branding.description} onChange={e => updateBranding('description', e.target.value)}
              rows={2} className={cn(inputCls, 'resize-none')} />
          </div>
        </div>
      </div>

      {/* Contact Info (Right Panel) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Right Panel - Contact Info</h3>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Display Email</label>
          <input value={formData.contact_info.email} onChange={e => setFormData(prev => ({ ...prev, contact_info: { ...prev.contact_info, email: e.target.value } }))}
            placeholder="contact@company.com" className={inputCls} />
        </div>
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Quick Connect (Messaging Apps)</p>
          <div className="grid grid-cols-2 gap-3">
            {MESSAGING_APPS.map(app => (
              <div key={app}>
                <label className="text-xs text-slate-500 mb-1 block">{app.charAt(0).toUpperCase() + app.slice(1)}</label>
                <input value={(formData.contact_info.messaging_apps || {})[app] || ''}
                  onChange={e => updateContactInfo('messaging_apps', app, e.target.value)}
                  placeholder="Link or number" className={inputCls} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Social Links</p>
          <div className="grid grid-cols-2 gap-3">
            {SOCIAL_PLATFORMS.map(platform => (
              <div key={platform}>
                <label className="text-xs text-slate-500 mb-1 block">{platform.charAt(0).toUpperCase() + platform.slice(1)}</label>
                <input value={(formData.contact_info.social_links || {})[platform] || ''}
                  onChange={e => updateContactInfo('social_links', platform, e.target.value)}
                  placeholder="https://..." className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thank You Message */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <label className="block text-sm font-semibold text-slate-900 mb-2">Thank You Message</label>
        <textarea value={formData.thank_you_message} onChange={e => update('thank_you_message', e.target.value)}
          rows={3} className={cn(inputCls, 'resize-none')} />
      </div>

      {/* Submit */}
      <div className="flex justify-end pb-8">
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span>
          ) : 'Save Form'}
        </button>
      </div>
    </div>
  );
}
