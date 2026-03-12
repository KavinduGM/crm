'use client';
import AiForm from '@/components/public/AiForm';

const MOCK_BUSINESS = {
  company_name: 'Acme Digital Agency',
  email: 'hello@acme.com',
  logo_url: undefined,
  social_links: {
    linkedin: 'https://linkedin.com/company/acme',
    twitter: 'https://twitter.com/acmedigi',
  },
  messaging_apps: {
    whatsapp: '+1234567890',
  },
};

const MOCK_FORM = {
  name: 'AI Chat',
  branding: {
    primary_color: '#8b5cf6',
    description: 'Chat with our AI assistant to tell us about your project.',
  },
  contact_info: {
    email: 'hello@acme.com',
    social_links: { linkedin: 'https://linkedin.com/company/acme' },
    messaging_apps: { whatsapp: '+1234567890' },
  },
  thank_you_message: 'Thank you! Our team will review your request and reach out shortly.',
};

export default function DemoAiForm() {
  return (
    <AiForm
      business={MOCK_BUSINESS}
      form={MOCK_FORM}
      companySlug="demo"
    />
  );
}
