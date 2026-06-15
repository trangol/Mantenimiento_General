import { Suspense } from 'react';
import { BillingChargePage } from '@/presentation/components/billing/BillingChargePage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingChargePage />
    </Suspense>
  );
}
