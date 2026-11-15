'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { saveDraft } from '@/lib/storage';
import { useLocale } from '@/components/locale-provider';

export function DemoBrazilButton() {
  const router = useRouter();
  const { copy } = useLocale();
  const startDemo = () => {
    saveDraft({
      location: { latitude: -17.798, longitude: -50.919 },
      plantingMonth: 10,
      history: [
        { cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' },
        { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' },
        { cropId: 'soybean', startYearMonth: '2024-10', endYearMonth: '2025-02' },
      ],
      priorities: { water: 2, soil: 3, operations: 1 },
      irrigation: 'unknown',
    });
    router.push('/results?demo=brasil');
  };
  return <Button type="button" onClick={startDemo}>{copy.demoBrazil}</Button>;
}
