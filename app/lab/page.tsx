import { RotationLab } from '@/components/lab/rotation-lab';

export default async function LabPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  return <RotationLab savedFarm={params.saved === 'farm'} />;
}
