import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Footer, Header, InternalBanner, Plate} from '@/components/catalog/Chrome';
import {OfferRow} from '@/components/catalog/OfferRow';
import Photo from '@/components/catalog/Photo';
import {catalogDb} from '@/lib/catalog/db';
import {catalogRobots, requireLaunched} from '@/lib/catalog/gate';
import {countLabel, formatPrice, OFFERS, SHOPS, shopLabel} from '@/lib/catalog/format';
import {firstParam, type SearchParams} from '@/lib/catalog/params';
import {getPartBySlug, getRelatedParts, type Model} from '@/lib/catalog/queries';
import {siteConfig} from '@/config';

type Props = {params: Promise<{slug: string}>; searchParams: Promise<SearchParams>};

const MAKERS: [RegExp, string][] = [
  [/almet/i, 'Almet'],
  [/\bram\b/i, 'RAM'],
  [/\bind\b/i, 'IND'],
  [/jikov/i, 'Jikov'],
  [/dell'?orto/i, 'Dellorto'],
  [/\bpal\b/i, 'PAL'],
  [/bosch/i, 'Bosch'],
  [/\bvape\b/i, 'Vape'],
  [/domino/i, 'Domino'],
  [/\belta\b/i, 'Elta'],
  [/mitas/i, 'Mitas'],
  [/\bckr\b/i, 'CKR'],
  [/\bzvl\b/i, 'ZVL'],
  [/\bntn\b/i, 'NTN'],
  [/\*M\b/, 'MOTOMAX'],
];

function makerOf(name: string): string {
  return MAKERS.find(([re]) => re.test(name))?.[1] ?? 'neuvedeno';
}

function makerKey(m: string): string {
  return m.toLowerCase();
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  requireLaunched();
  const {slug} = await params;
  const data = await getPartBySlug(slug);
  if (!data) return {};
  const min = data.offers[0]?.price;
  return {
    title: `${data.part.name} – od ${formatPrice(min)} | MotoDílomat.cz`,
    description: `${data.part.name}: ${countLabel(data.offers.length, OFFERS)} z e-shopů s díly na Jawu, ČZ, Babettu a Stadion.`,
    robots: catalogRobots(),
  };
}

function plateNo(m: Model): string {
  return m.type_numbers?.[0] ?? m.slug.split('-').pop()?.toUpperCase() ?? '';
}

export default async function PartPage({params, searchParams}: Props) {
  requireLaunched();
  const {slug} = await params;
  const sp = await searchParams;
  const data = await getPartBySlug(slug);
  if (!data || data.offers.length === 0) notFound();
  const {internal} = catalogDb();
  const {part, offers, models} = data;

  const related = await getRelatedParts(
    part.id,
    part.part_type,
    models.map((m) => m.id),
  ).catch(() => []);

  const withMaker = offers.map((o) => ({offer: o, maker: makerOf(o.name)}));
  const makers = [...new Map(withMaker.map((w) => [makerKey(w.maker), w.maker])).values()];
  const makerFilter = firstParam(sp, 'vyrobce').toLowerCase();
  const stockOnly = firstParam(sp, 'sklad') === '1';
  const shown = withMaker.filter((w) => (!makerFilter || makerKey(w.maker) === makerFilter) && (!stockOnly || w.offer.in_stock));

  const shops = new Set(offers.map((o) => o.shop_id)).size;
  const inStock = offers.filter((o) => o.in_stock).length;
  const cheapest = offers.find((o) => o.in_stock) ?? offers[0];
  const minPrice = offers[0].price;
  const maxPrice = offers[offers.length - 1].price;
  const photos = [...new Map(offers.filter((o) => o.image_url).map((o) => [o.shop_id, o])).values()];
  const hero = photos.find((o) => o.id === cheapest.id) ?? photos[0];
  const first = models[0];

  const href = (patch: {vyrobce?: string | null; sklad?: boolean}) => {
    const q = new URLSearchParams();
    const v = patch.vyrobce === undefined ? makerFilter : patch.vyrobce;
    const s = patch.sklad === undefined ? stockOnly : patch.sklad;
    if (v) q.set('vyrobce', v);
    if (s) q.set('sklad', '1');
    const qs = q.toString();
    return `/dil/${part.slug}${qs ? `?${qs}` : ''}#nabidky`;
  };

  const mailto = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(`Chyba v párování: ${part.name}`)}&body=${encodeURIComponent(`Díl: https://motodilomat.cz/dil/${part.slug}\n\nCo nesedí:\n`)}`;

  return (
    <div className="md">
      <InternalBanner internal={internal} />
      <Header />

      <section style={{background: 'var(--paper)', borderBottom: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 24, paddingBottom: 36, display: 'flex', flexDirection: 'column', gap: 24}}>
          <nav aria-label="Drobečková navigace" style={{display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 14, color: 'var(--dim)'}}>
            <Link href="/">Úvod</Link>
            <span aria-hidden="true">›</span>
            {first ? (
              <>
                <Link href={`/model/${first.slug}`}>{first.name}</Link>
                <span aria-hidden="true">›</span>
              </>
            ) : null}
            <span style={{color: 'var(--ink)', fontWeight: 600}}>{part.name}</span>
          </nav>

          <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '32px 48px'}}>
            <div style={{flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10}}>
              <Photo src={hero?.image_url} alt={part.name} aspect="4 / 3" rounded={10} caption="bez fotky" />
              {hero ? <span style={{fontSize: 13, color: 'var(--dim)'}}>Foto: {shopLabel(hero.shop_name)}. Fotky zobrazujeme přímo z webu e-shopu, který díl nabízí.</span> : null}
              {photos.length > 1 ? (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10}}>
                  {photos.slice(0, 4).map((o) => (
                    <a key={o.id} href={o.url} target="_blank" rel="nofollow noopener" title={`Foto: ${shopLabel(o.shop_name)}`} style={{display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--dim)'}}>
                      <Photo src={o.image_url} alt={`${part.name} – ${shopLabel(o.shop_name)}`} />
                      <span>{shopLabel(o.shop_name)}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22}}>
              <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.05, letterSpacing: '-0.025em'}}>
                {part.name}
              </h1>

              {models.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: 'var(--soft)'}}>Pasuje na</span>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                    {models.map((m) => (
                      <Link key={m.slug} href={`/model/${m.slug}`} title={m.name} style={{color: 'var(--red)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                        <Plate no={plateNo(m)} size="sm" />
                        <span style={{fontSize: 12, color: 'var(--dim)', maxWidth: 92, textAlign: 'center', lineHeight: 1.2}}>{m.family}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 28px', padding: 20, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
                  <span style={{fontSize: 14, color: 'var(--dim)'}}>nejlevněji{cheapest.in_stock ? ' skladem' : ''}</span>
                  <span className="display" style={{fontWeight: 700, fontSize: 44, lineHeight: 1, color: 'var(--red)'}}>
                    {formatPrice(cheapest.price)}
                  </span>
                  <span style={{fontSize: 14, color: 'var(--soft)'}}>{shopLabel(cheapest.shop_name)}</span>
                </div>
                <div style={{flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 15, color: 'var(--soft)'}}>
                  <span>
                    {countLabel(offers.length, OFFERS)} z {countLabel(shops, SHOPS)}
                  </span>
                  <span>{inStock} skladem</span>
                  {maxPrice > minPrice ? (
                    <span>
                      rozpětí {formatPrice(minPrice)} – {formatPrice(maxPrice)}
                    </span>
                  ) : null}
                </div>
                <a className="btn-red" href="#nabidky">
                  Porovnat nabídky
                </a>
              </div>

              {makers.filter((m) => m !== 'neuvedeno').length > 0 ? (
                <dl style={{margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '10px 24px', fontSize: 15}}>
                  <dt style={{color: 'var(--dim)'}}>Výrobci v nabídce</dt>
                  <dd style={{margin: 0, fontWeight: 600}}>{makers.filter((m) => m !== 'neuvedeno').join(', ')}</dd>
                </dl>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section id="nabidky">
        <div className="wrap" style={{paddingTop: 40, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 20}}>
          <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px 24px'}}>
            <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.02em'}}>
              Nabídky <span style={{fontWeight: 500, fontSize: 18, letterSpacing: 0, color: 'var(--dim)'}}>ceny obnovujeme každou noc</span>
            </h2>
            <Link className={stockOnly ? 'chip-on' : 'chip'} href={href({sklad: !stockOnly})}>
              Jen skladem
            </Link>
          </div>
          {makers.length > 1 ? (
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px'}}>
              <span style={{fontSize: 14, color: 'var(--dim)', marginRight: 4}}>Výrobce</span>
              <Link className={!makerFilter ? 'chip-on' : 'chip'} href={href({vyrobce: null})}>
                Všichni · {offers.length}
              </Link>
              {makers.map((m) => (
                <Link key={m} className={makerFilter === makerKey(m) ? 'chip-on' : 'chip'} href={href({vyrobce: makerKey(m)})}>
                  {m} · {withMaker.filter((w) => w.maker === m).length}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="card" style={{display: 'flex', flexDirection: 'column', boxShadow: '0 2px 0 var(--line)'}}>
            {shown.map((w, i) => (
              <OfferRow key={w.offer.id} offer={w.offer} maker={w.maker !== 'neuvedeno' ? w.maker : null} best={i === 0 && w.offer.price === minPrice} compact />
            ))}
            {shown.length === 0 ? <p style={{padding: '0 20px', color: 'var(--soft)'}}>Žádná nabídka neodpovídá filtru.</p> : null}
            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', padding: '14px 20px', fontSize: 14, color: 'var(--dim)'}}>
              <span>Ceny jsou bez poštovného. Platí cena v e-shopu.</span>
              <a href={mailto} style={{fontWeight: 600, color: 'var(--red)', textDecoration: 'underline', textUnderlineOffset: 3}}>
                Nesedí párování? Nahlásit chybu
              </a>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section>
          <div className="wrap" style={{paddingTop: 24, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 16}}>
            <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em'}}>
              Podobné díly
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16}}>
              {related.map((r) => (
                <Link key={r.id} className="card" href={`/dil/${r.slug}`} style={{padding: 16, fontWeight: 700, fontSize: 17, lineHeight: 1.3}}>
                  {r.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div style={{height: 40}} />
      )}

      <Footer />
    </div>
  );
}
