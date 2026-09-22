import {isLaunched} from '@/lib/config';

export default function HomePage() {
  if (!isLaunched) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Připravujeme</h1>
        <p className="mt-2 text-sm text-gray-500">
          Next.js kostra pro Fázi 1 – veřejný obsah zatím není zapnutý.
        </p>
      </main>
    );
  }

  // TODO: Fáze 4 – plný veřejný katalog.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">MotoDílomat.cz</h1>
    </main>
  );
}
