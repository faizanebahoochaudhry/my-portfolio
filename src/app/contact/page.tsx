import type { Metadata } from 'next';
import { ContactPage } from '@/components/site/ContactPage';

export const metadata: Metadata = {
  title: 'Contact | Faizan e Bahoo Chaudhry',
};

export default function ContactRoute() {
  return <ContactPage />;
}
