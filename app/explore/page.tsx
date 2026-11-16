import { redirect } from 'next/navigation';

/** Explore was merged into "Minha fazenda". */
export default function ExplorePage() {
  redirect('/farm');
}
