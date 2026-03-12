import { Metadata } from 'next';
import PublicFormWrapper from '@/components/public/PublicFormWrapper';
import FormErrorBoundary from '@/components/public/FormErrorBoundary';

interface Props {
  params: Promise<{ company_slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company_slug } = await params;
  return {
    title: `Contact Us`,
    description: `Get in touch with us via our contact form.`,
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { company_slug } = await params;
  return (
    <FormErrorBoundary>
      <PublicFormWrapper companySlug={company_slug} />
    </FormErrorBoundary>
  );
}
