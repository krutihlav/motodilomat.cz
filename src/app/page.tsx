import type {Metadata} from 'next';
import {isLaunched} from '@/lib/config';
import ComingSoon from '@/components/ComingSoon';
import Home from '@/components/catalog/Home';
import {catalogRobots} from '@/lib/catalog/gate';

export function generateMetadata(): Metadata {
  if (!isLaunched) return {};
  return {
    title: 'MotoDílomat.cz – srovnávač dílů na Jawu, ČZ, Babettu a Stadion',
    description: 'Ceny náhradních dílů na Jawu, ČZ, Babettu a Stadion ze všech specializovaných e-shopů na jednom místě.',
    robots: catalogRobots(),
  };
}

export default function HomePage() {
  if (!isLaunched) {
    return <ComingSoon />;
  }
  return <Home />;
}
