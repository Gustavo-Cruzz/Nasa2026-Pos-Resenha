import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { LocaleProvider } from '@/components/locale-provider';
import { PwaRegister } from '@/components/pwa-register';
import { preferencesBootScript } from '@/lib/preferences';

const sans = Nunito_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = { title: 'Plantaê', description: 'Explore possibilidades. Entenda os limites. Comparação de rotações de cultura com clima histórico da NASA.', applicationName: 'Plantaê', appleWebApp: { capable: true, title: 'Plantaê', statusBarStyle: 'black-translucent' } };
export const viewport: Viewport = { themeColor: '#142018' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html className={`${sans.variable} ${mono.variable}`} lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} /></head><body><LocaleProvider><a className="skip-link" href="#main-content">Ir para o conteúdo / Skip to content</a><SiteHeader /><PwaRegister /><main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-4 py-10" id="main-content" tabIndex={-1}>{children}</main></LocaleProvider></body></html>;
}
