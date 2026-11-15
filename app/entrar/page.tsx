import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/farm/sign-in-form';
import { currentUser } from '@/lib/auth/session';

export const metadata = { title: 'Entrar · Plantaê' };
export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (await currentUser()) redirect('/painel');
  return <SignInForm />;
}
