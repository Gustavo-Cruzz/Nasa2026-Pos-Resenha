import { JoaoMoodsView } from '@/components/joao/joao-moods-view';

export const metadata = { title: 'João’s moods · Plantaê', robots: { index: false, follow: false } };

/** Review page for João's moods (see JoaoMoodsView). */
export default function JoaoMoodsPage() {
  return <JoaoMoodsView />;
}
