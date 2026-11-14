import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { LocaleProvider } from '@/components/locale-provider';
import { JourneyProgress } from '@/components/journey-progress';
import { PwaRegister } from '@/components/pwa-register';
import { preferencesBootScript } from '@/lib/preferences';

export const metadata: Metadata = { title: 'Field Shift', description: 'Rotation comparison with NASA historical climate data.', applicationName: 'Field Shift', appleWebApp: { capable: true, title: 'Field Shift', statusBarStyle: 'black-translucent' } };
export const viewport: Viewport = { themeColor: '#142018' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} /></head><body><LocaleProvider><a className="skip-link" href="#main-content">Ir para o conteúdo / Skip to content</a><SiteHeader /><PwaRegister /><JourneyProgress /><main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-4 py-10" id="main-content" tabIndex={-1}>{children}</main></LocaleProvider></body></html>;
}
