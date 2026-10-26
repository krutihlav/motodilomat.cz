import 'server-only';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {isLaunched} from '@/lib/config';
import {isInternalPreview} from './db';

/** Katalog je vidět jen po spuštění (NEXT_PUBLIC_LAUNCHED). Do té doby 404. */
export function requireLaunched() {
  if (!isLaunched) notFound();
}

/** Interní náhled nesmí do vyhledávačů. */
export function catalogRobots(): Metadata['robots'] {
  return isInternalPreview() ? {index: false, follow: false} : undefined;
}
