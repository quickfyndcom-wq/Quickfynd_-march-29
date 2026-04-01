import { Suspense } from 'react';
import Loading from '@/components/Loading';
import OrdersPageClient from './OrdersPageClient';

export const dynamic = 'force-dynamic';

export default function DashboardOrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdersPageClient />
    </Suspense>
  );
}
