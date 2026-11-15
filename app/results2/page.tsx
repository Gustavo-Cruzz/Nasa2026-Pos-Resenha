import { redirect } from 'next/navigation';

// /results2 was a mock prototype (audit 3.6). The real decision view lives at /results.
export default function Results2() {
  redirect('/results');
}
