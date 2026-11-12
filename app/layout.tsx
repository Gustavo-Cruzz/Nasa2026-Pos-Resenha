import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { LocaleProvider } from '@/components/locale-provider';
import { JourneyProgress } from '@/components/journey-progress';

export const metadata: Metadata = { title: 'Field Shift', description: 'Rotation comparison with NASA historical climate data.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><LocaleProvider><SiteHeader /><JourneyProgress /><main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-4 py-10">{children}</main></LocaleProvider></body></html>;
}
