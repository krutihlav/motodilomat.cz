import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';
import {Header, InternalBanner, Footer} from '@/components/catalog/Chrome';
import Photo from '@/components/catalog/Photo';
import {catalogDb, isInternalPreview} from '@/lib/catalog/db';
import {formatCount, formatPrice, shopLabel} from '@/lib/catalog/format';
import {decidePair, undoLast} from './actions';

export const metadata: Metadata = {title: 'Párování dílů – interní', robots: {index: false, follow: false}};

type QueueRow = {offer_a: string; offer_b: string; rank: number; reasons: string[]; shared: string[]; price_ratio: number | null};
type OfferInfo = {id: string; name: string; price: number; url: string; image_url: string | null; in_stock: boolean; shops: {name: string} | null};

const BATCH = 8;

const REASON_LABELS: [RegExp, string][] = [
  [/^chybí: (.*)$/, 'jen u jedné nabídky: $1'],
  [/^jaccard (.*)$/, 'jiný název typu dílu ($1)'],
  [/^cena ×(.*)$/, 'cena se liší ×$1'],
  [/^ambiguous$/, 'víc možných protějšků'],
];

const ATTR_LABELS: Record<string, string> = {
  dimension: 'rozměr',
  voltage: 'napětí',
  side: 'strana',
  position: 'umístění',
  finish: 'povrch',
  color: 'barva',
  material: 'materiál',
  teeth: 'zuby',
  pack: 'balení',
  size: 'velikost',
  ref: 'značka',
  with: 's čím',
  version: 'verze',
};

function reasonLabel(r: string): string {
  for (const [re, label] of REASON_LABELS) {
    const m = r.match(re);
    if (m) return label.replace('$1', (m[1] ?? '').split(',').map((x) => ATTR_LABELS[x] ?? x).join(', '));
  }
  return r;
}

export default async function PairReviewPage() {
  await connection(); // až při požadavku – env interního náhledu se nesmí vyhodnotit při buildu
  if (!isInternalPreview()) notFound();
  const {sb, internal} = catalogDb();

  const [{data: queue, error}, {count: open}, {count: done}] = await Promise.all([
    sb.from('pair_queue_open').select('offer_a, offer_b, rank, reasons, shared, price_ratio').order('rank').limit(BATCH),
    sb.from('pair_queue_open').select('offer_a', {count: 'exact', head: true}),
    sb.from('pair_reviews').select('offer_a', {count: 'exact', head: true}),
  ]);
  if (error) throw new Error(`Načtení fronty selhalo: ${error.message}`);
  const rows = (queue ?? []) as QueueRow[];

  const ids = [...new Set(rows.flatMap((r) => [r.offer_a, r.offer_b]))];
  const {data: offerRows, error: e2} = ids.length
    ? await sb.from('shop_products').select('id, name, price, url, image_url, in_stock, shops(name)').in('id', ids)
    : {data: [], error: null};
  if (e2) throw new Error(`Načtení nabídek selhalo: ${e2.message}`);
  const offers = new Map(((offerRows ?? []) as unknown as OfferInfo[]).map((o) => [o.id, o]));

  return (
    <div className="md">
      <InternalBanner internal={internal} />
      <Header />
      <section className="wrap" style={{paddingTop: 32, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 24}}>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 36, letterSpacing: '-0.02em'}}>
              Párování dílů
            </h1>
            <p style={{margin: 0, color: 'var(--soft)', maxWidth: 640}}>
              Je to stejný díl? Rozhodnutí se projeví při dalším zápisu dílů (workflow parts-write). Nejdůležitější dvojice jsou nahoře.
            </p>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 15, color: 'var(--soft)'}}>
            <span>
              <strong className="tabnum" style={{color: 'var(--red)'}}>{formatCount(open ?? 0)}</strong> čeká
            </span>
            <span>
              <strong className="tabnum" style={{color: 'var(--red)'}}>{formatCount(done ?? 0)}</strong> hotovo
            </span>
            <form action={undoLast}>
              <button type="submit" className="chip" style={{cursor: 'pointer', font: 'inherit'}}>
                Vrátit poslední
              </button>
            </form>
          </div>
        </div>

        {rows.length === 0 ? <p style={{color: 'var(--soft)'}}>Fronta je prázdná. Naplní ji workflow clusters-dry-run s volbou write_queue.</p> : null}

        {rows.map((r) => {
          const a = offers.get(r.offer_a);
          const b = offers.get(r.offer_b);
          if (!a || !b) return null;
          return (
            <article key={`${r.offer_a}|${r.offer_b}`} className="card" style={{display: 'flex', flexDirection: 'column', boxShadow: '0 2px 0 var(--line)'}}>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px 12px', padding: '12px 20px', borderBottom: '1px solid var(--line)', fontSize: 13, color: 'var(--dim)'}}>
                <span>#{r.rank}</span>
                {r.reasons.map((x) => (
                  <span key={x} style={{padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 4}}>
                    {reasonLabel(x)}
                  </span>
                ))}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))'}}>
                {[a, b].map((o, i) => (
                  <div key={o.id} style={{display: 'flex', gap: 16, padding: 20, borderLeft: i === 1 ? '1px solid var(--line)' : undefined}}>
                    <Photo src={o.image_url} alt={o.name} size={96} />
                    <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4}}>
                      <span style={{fontWeight: 700}}>{shopLabel(o.shops?.name ?? '')}</span>
                      <a href={o.url} target="_blank" rel="nofollow noopener" style={{fontSize: 16, lineHeight: 1.35, textDecoration: 'underline', textDecorationColor: 'var(--line)', textUnderlineOffset: 3}}>
                        {o.name}
                      </a>
                      <span className="display" style={{fontWeight: 700, fontSize: 20}}>
                        {formatPrice(Number(o.price))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <form action={decidePair} style={{display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--line)'}}>
                <input type="hidden" name="a" value={r.offer_a} />
                <input type="hidden" name="b" value={r.offer_b} />
                <button type="submit" name="decision" value="same" className="btn-red" style={{minHeight: 48}}>
                  Stejný díl
                </button>
                <button type="submit" name="decision" value="different" className="btn-out" style={{minHeight: 48, background: 'transparent', cursor: 'pointer', font: 'inherit', fontWeight: 700}}>
                  Jiný díl
                </button>
                <button type="submit" name="decision" value="skip" className="chip" style={{minHeight: 48, cursor: 'pointer', font: 'inherit'}}>
                  Nevím, přeskočit
                </button>
              </form>
            </article>
          );
        })}
      </section>
      <Footer />
    </div>
  );
}
