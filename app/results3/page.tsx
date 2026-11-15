import { redirect } from 'next/navigation';

// The /results3 prototype interface (blocks + João) is now the real /results page.
export default function Results3() {
  redirect('/results');
}
