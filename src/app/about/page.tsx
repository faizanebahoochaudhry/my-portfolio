import type { Metadata } from 'next';
import { AboutPage } from '@/components/site/AboutPage';

export const metadata: Metadata = {
  title: 'About | Faizan e Bahoo Chaudhry',
};

export default function AboutRoute() {
  return <AboutPage />;
}
