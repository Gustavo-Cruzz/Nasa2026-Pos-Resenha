'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const steps = [
  { href: '/explore', label: 'Explorar' },
  { href: '/farm', label: 'Minha fazenda' },
  { href: '/lab', label: 'Laboratório' },
  { href: '/results', label: 'Comparar' },
] as const;

export function JourneyProgress() {
  const pathname = usePathname();
  const active = steps.findIndex((step) => pathname === step.href);
  if (active < 0) return null;
  return <nav aria-label="Jornada de exploração" className="journey-progress"><ol>{steps.map((step, index) => {
    const current = index === active;
    return <li className={current ? 'journey-step journey-step-current' : 'journey-step'} key={step.href}><Link aria-current={current ? 'step' : undefined} href={step.href}><span aria-hidden="true">{index + 1}</span><b>{step.label}</b></Link></li>;
  })}</ol></nav>;
}
