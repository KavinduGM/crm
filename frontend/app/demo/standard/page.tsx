'use client';
import StandardForm from '@/components/public/StandardForm';

const MOCK_BUSINESS = {
  company_name: 'Acme Digital Agency',
  email: 'hello@acme.com',
  logo_url: undefined,
  social_links: {
    linkedin: 'https://linkedin.com/company/acme',
    twitter: 'https://twitter.com/acmedigi',
    instagram: 'https://instagram.com/acmedigi',
  },
  messaging_apps: {
    whatsapp: '+1234567890',
  },
};

const MOCK_FORM = {
  id: 1,
  name: 'Get In Touch',
  form_type: 'standard' as const,
  branding: {
    primary_color: '#6366f1',
    font: 'Inter',
    description: "We'd love to hear from you. Fill out the form and our team will be in touch within 24 hours.",
  },
  fields: [
    { id: 'f1', type: 'text',     label: 'Full Name',            placeholder: 'John Smith',              required: true  },
    { id: 'f2', type: 'email',    label: 'Email Address',        placeholder: 'john@example.com',        required: true  },
    { id: 'f3', type: 'tel',      label: 'Phone Number',         placeholder: '+1 (555) 000-0000',       required: false },
    { id: 'f4', type: 'select',   label: 'Service Needed',       options: ['Web Design', 'SEO & Growth', 'Social Media', 'Branding', 'App Development'], required: true },
    { id: 'f5', type: 'textarea', label: 'Tell us about your project', placeholder: 'Briefly describe what you need and your timeline…', required: false },
  ],
  contact_info: {
    email: 'hello@acme.com',
    social_links: { linkedin: 'https://linkedin.com/company/acme', twitter: 'https://twitter.com/acmedigi' },
    messaging_apps: { whatsapp: '+1234567890' },
  },
  thank_you_message: 'Thank you! We will get back to you within 24 hours.',
};

export default function DemoStandardForm() {
  return (
    <StandardForm
      business={MOCK_BUSINESS}
      form={MOCK_FORM}
      companySlug="demo"
    />
  );
}
