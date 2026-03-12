'use client';
import { useState } from 'react';
import api from '@/lib/api';
import ContactPanel from './ContactPanel';
import CaptchaWidget from './CaptchaWidget';
import { cn } from '@/lib/utils';

interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface Props {
  business: { company_name: string; email?: string; social_links?: Record<string, string>; messaging_apps?: Record<string, string>; logo_url?: string };
  form: { name: string; fields: Field[]; branding: { primary_color: string; font: string; description: string }; contact_info?: { email?: string; messaging_apps?: Record<string, string>; social_links?: Record<string, string> }; thank_you_message: string };
  companySlug: string;
}

export default function StandardForm({ business, form, companySlug }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ captchaId: string; answer: string } | null>(null);
  // Honeypot: hidden field that bots fill but humans leave empty
  const [honeypot, setHoneypot] = useState('');

  const primaryColor = form.branding?.primary_color || '#6366f1';
  const ci = form.contact_info || {};
  const email = ci.email || business.email || '';
  const messaging = ci.messaging_apps || business.messaging_apps || {};
  const social = ci.social_links || business.social_links || {};
  const fields = form.fields || [];

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
      if (field.type === 'email' && values[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field.id])) {
        newErrors[field.id] = 'Invalid email address';
      }
    });
    // Captcha is NOT a hard gate — user can submit without completing it
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const emailField = fields.find(f => f.type === 'email');
      const nameField = fields.find(f => f.id === 'full_name' || f.label.toLowerCase().includes('name'));
      const phoneField = fields.find(f => f.type === 'tel' || f.id === 'phone');

      const answers = fields.map(field => ({
        question: field.label,
        answer: values[field.id] || '',
      }));

      await api.post(`/public/${companySlug}/submit`, {
        name: nameField ? values[nameField.id] : '',
        email: emailField ? values[emailField.id] : '',
        phone: phoneField ? values[phoneField.id] : '',
        answers,
        honeypot,
        // If captcha wasn't completed, send empty strings — backend treats as optional
        captchaId: captchaData?.captchaId ?? '',
        captchaAnswer: captchaData?.answer ?? '',
      });

      setSubmitted(true);
    } catch {
      setErrors({ _global: 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm';

  if (submitted) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6" style={{ backgroundColor: `${primaryColor}20` }}>
          ✅
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h2>
        <p className="text-slate-600">{form.thank_you_message}</p>
      </div>
    </div>
  );

  return (
    // Fix 1: h-screen with overflow-hidden so the PAGE never scrolls
    <div className="h-screen bg-slate-50 flex items-center justify-center p-3 overflow-hidden">
      <div
        className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row"
        style={{ maxHeight: 'calc(100vh - 1.5rem)' }}
      >
        {/* Left: Form — scrolls internally, page stays fixed */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900">{business.company_name}</h1>
            <p className="text-slate-500 mt-1 text-sm">{form.branding?.description}</p>
          </div>

          {errors._global && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{errors._global}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — hidden from humans, bots fill it automatically */}
            <div aria-hidden="true" style={{ display: 'none' }}>
              <input
                type="text"
                name="honeypot"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={values[field.id] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className={cn(inputCls, 'resize-none', errors[field.id] ? 'border-red-300' : 'border-slate-200')}
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={values[field.id] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className={cn(inputCls, 'bg-white cursor-pointer', errors[field.id] ? 'border-red-300' : 'border-slate-200')}
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.id] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    className={cn(inputCls, errors[field.id] ? 'border-red-300' : 'border-slate-200')}
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                )}

                {errors[field.id] && <p className="mt-1 text-xs text-red-500">{errors[field.id]}</p>}
              </div>
            ))}

            {/* Human Verification — optional, non-blocking */}
            <CaptchaWidget
              primaryColor={primaryColor}
              onVerified={(id, ans) => setCaptchaData({ captchaId: id, answer: ans })}
              onReset={() => setCaptchaData(null)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-white font-semibold rounded-xl transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Right: Contact Panel — fixed height, scrolls if needed */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0 overflow-y-auto">
          <ContactPanel
            companyName={business.company_name}
            email={email}
            primaryColor={primaryColor}
            messagingApps={messaging}
            socialLinks={social}
            logoUrl={business.logo_url}
          />
        </div>
      </div>
    </div>
  );
}
