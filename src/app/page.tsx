import {isLaunched} from '@/lib/config';
import ComingSoon from '@/components/ComingSoon';

export default function HomePage() {
  if (!isLaunched) {
    return <ComingSoon />;
  }

  // TODO: Fáze 4 – plný veřejný katalog.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">MotoDílomat.cz</h1>
    </main>
  );
}
