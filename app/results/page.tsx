import { AnalysisResults } from '@/components/results/analysis-results';

export default function ResultsPage() {
  return <section><h1 className="text-3xl font-bold">Comparação de estratégias</h1><p className="mt-3 max-w-3xl text-slate-300">A linha de base e quaisquer alternativas são avaliadas somente dentro do escopo comprovado. Dados ausentes não recebem nota, calendário ou recomendação inventada.</p><AnalysisResults /></section>;
}
