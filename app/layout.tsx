import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = { title: 'Field Shift', description: 'Rotation comparison with NASA historical climate data.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><SiteHeader /><main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-4 py-10">{children}</main></body></html>;
}
