'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';

export function JourneyProgress() {
  const pathname = usePathname();
  const { copy } = useLocale();
  const steps = [{ href: '/explore', label: copy.explore }, { href: '/farm', label: copy.farm }, { href: '/lab', label: copy.lab }, { href: '/results', label: copy.compare }];
  const active = steps.findIndex((step) => pathname === step.href);
  if (active < 0) return null;
  return <nav aria-label={copy.journey} className="journey-progress"><p className="journey-mobile-label">{active + 1} de {steps.length} · {steps[active].label}</p><ol>{steps.map((step, index) => {
    const current = index === active;
    return <li className={current ? 'journey-step journey-step-current' : 'journey-step'} key={step.href}><Link aria-current={current ? 'step' : undefined} href={step.href}><span aria-hidden="true">{index + 1}</span><b>{step.label}</b></Link></li>;
  })}</ol></nav>;
}
