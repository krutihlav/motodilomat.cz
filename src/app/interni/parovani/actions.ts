'use server';

import {revalidatePath} from 'next/cache';
import {catalogDb, isInternalPreview} from '@/lib/catalog/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DECISIONS = new Set(['same', 'different', 'skip']);

/** Uloží ruční rozhodnutí o dvojici nabídek. Jen interní náhled (nikdy produkce). */
export async function decidePair(formData: FormData) {
  if (!isInternalPreview()) throw new Error('Jen pro interní náhled.');
  const a = String(formData.get('a') ?? '');
  const b = String(formData.get('b') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!UUID.test(a) || !UUID.test(b) || a === b || !DECISIONS.has(decision)) {
    throw new Error('Neplatná dvojice.');
  }
  const [offerA, offerB] = a < b ? [a, b] : [b, a];
  const {sb} = catalogDb();
  const {error} = await sb
    .from('pair_reviews')
    .upsert({offer_a: offerA, offer_b: offerB, decision, decided_at: new Date().toISOString()});
  if (error) throw new Error(`Uložení rozhodnutí selhalo: ${error.message}`);
  revalidatePath('/interni/parovani');
}

/** Vrátí poslední rozhodnutí zpět do fronty. */
export async function undoLast() {
  if (!isInternalPreview()) throw new Error('Jen pro interní náhled.');
  const {sb} = catalogDb();
  const {data, error} = await sb
    .from('pair_reviews')
    .select('offer_a, offer_b')
    .order('decided_at', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Načtení posledního rozhodnutí selhalo: ${error.message}`);
  if (data) {
    const {error: e2} = await sb.from('pair_reviews').delete().eq('offer_a', data.offer_a).eq('offer_b', data.offer_b);
    if (e2) throw new Error(`Vrácení rozhodnutí selhalo: ${e2.message}`);
  }
  revalidatePath('/interni/parovani');
}
