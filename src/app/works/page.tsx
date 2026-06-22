import type { Metadata } from 'next';
import { WorksPage } from '@/components/site/WorksPage';

export const metadata: Metadata = {
  title: 'Works | Faizan e Bahoo Chaudhry',
};

export default function WorksRoute() {
  return <WorksPage />;
}
