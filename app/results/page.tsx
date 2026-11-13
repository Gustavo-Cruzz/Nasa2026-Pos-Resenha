import { AnalysisResults } from '@/components/results/analysis-results';
import { ResultsHeading } from '@/components/results/results-heading';

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <section><ResultsHeading /><AnalysisResults demo={params.demo === 'brasil'} /></section>;
}
