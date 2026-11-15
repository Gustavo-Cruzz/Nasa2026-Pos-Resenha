import { redirect } from 'next/navigation';

/** The panel was merged into "Minha fazenda". */
export default function PainelPage() {
  redirect('/farm');
}
