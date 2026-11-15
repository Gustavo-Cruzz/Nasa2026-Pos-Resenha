import { redirect } from 'next/navigation';

/** Registration is intentionally not part of the public journey; analysis starts with João. */
export default function RegisterFarmPage() {
  redirect('/farm');
}
