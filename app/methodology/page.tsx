import { MethodologyView } from '@/components/methodology/methodology-view';
import { loadPilotExample } from '@/components/methodology/pilot-example';

/** Server component: the Rio Verde example is computed from the verified NASA POWER fixture with the app's own climate helpers. */
export default async function MethodologyPage() {
  const example = await loadPilotExample();
  return <MethodologyView example={example} />;
}
