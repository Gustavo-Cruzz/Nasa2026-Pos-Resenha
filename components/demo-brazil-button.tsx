'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { saveDraft } from '@/lib/storage';

export function DemoBrazilButton() {
  const router = useRouter();
  const startDemo = () => {
    saveDraft({
      location: { latitude: -17.798, longitude: -50.919 },
      plantingMonth: 4,
      history: [
        { cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' },
        { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' },
        { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' },
      ],
      priorities: { water: 3, soil: 2, operations: 1 },
      irrigation: 'unknown',
      futureBaseline: { cropId: 'soybean', confirmed: true },
    });
    router.push('/results?demo=brasil');
  };
  return <Button type="button" variant="secondary" onClick={startDemo}>Ver demonstração Brasil</Button>;
}
