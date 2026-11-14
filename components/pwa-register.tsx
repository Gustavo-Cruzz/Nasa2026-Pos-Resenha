'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

const subscribe = (notify: () => void) => { window.addEventListener('online', notify); window.addEventListener('offline', notify); return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify); }; };

/** Registers the offline shell (production only) and tells the user plainly when the app runs without network. */
export function PwaRegister() {
  const { locale } = useLocale();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').then(() => setRegistered(true)).catch(() => setRegistered(false));
  }, []);
  if (online) return registered ? <span className="sr-only" data-offline-ready="true" /> : null;
  return <p className="border-b border-amber-300/60 bg-amber-950/60 px-4 py-2 text-center text-sm text-amber-50" role="status"><WifiOff aria-hidden="true" className="mr-2 inline" size={15} />{locale === 'en' ? 'No network. Showing the saved draft and the last saved analysis from this device; data may be out of date.' : 'Sem rede. Mostrando o rascunho e a última análise salvos neste dispositivo; os dados podem estar desatualizados.'}</p>;
}
