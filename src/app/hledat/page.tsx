import type {Metadata} from 'next';
import Link from 'next/link';
import {Footer, Header, InternalBanner} from '@/components/catalog/Chrome';
import {OfferRow} from '@/components/catalog/OfferRow';
import PartCard from '@/components/catalog/PartCard';
import {catalogDb} from '@/lib/catalog/db';
import {catalogRobots, requireLaunched} from '@/lib/catalog/gate';
import {countLabel, formatCount, OFFERS} from '@/lib/catalog/format';
import {firstParam, type SearchParams} from '@/lib/catalog/params';
import {getOfferFamilies, getPartsByIds, searchOffers, type Offer} from '@/lib/catalog/queries';

type Props = {searchParams: Promise<SearchParams>};

const LIST_LIMIT = 60;

export async function generateMetadata({searchParams}: Props): Promise<Metadata> {
  requireLaunched();
  const q = firstParam(await searchParams, 'q');
  return {
    title: q ? `„${q}“ – hledání dílů | MotoDílomat.cz` : 'Hledání dílů | MotoDílomat.cz',
    // Výsledky hledání do vyhledávačů nepatří.
    alternates: {canonical: '/hledat'},
    robots: catalogRobots() ?? {index: false, follow: true},
  };
}

export default async function SearchPage({searchParams}: Props) {
  requireLaunched();
  const sp = await searchParams;
  const q = firstParam(sp, 'q').slice(0, 120);
  const family = firstParam(sp, 'stroj');
  const stockOnly = firstParam(sp, 'sklad') === '1';
  const {internal} = catalogDb();

  const all = q.length >= 2 ? await searchOffers(q) : [];
  const families = await getOfferFamilies(all.map((o) => o.id));
  const familyChips = [...families.entries()].map(([name, ids]) => ({name, n: ids.size})).sort((a, b) => b.n - a.n);
  const inFamily = family && families.has(family) ? families.get(family)! : null;
  const results = all.filter((o) => (!inFamily || inFamily.has(o.id)) && (!stockOnly || o.in_stock));

  // Díly s porovnáním = nabídky se stejným part_id aspoň ze 2 shopů.
  const byPart = new Map<string, Offer[]>();
  for (const o of results) {
    if (!o.part_id) continue;
    const arr = byPart.get(o.part_id) ?? [];
    arr.push(o);
    byPart.set(o.part_id, arr);
  }
  const comparedIds = [...byPart.entries()].filter(([, os]) => new Set(os.map((o) => o.shop_id)).size >= 2).map(([id]) => id);
  const partRows = await getPartsByIds(comparedIds);
  const parts = partRows
    .map((p) => {
      const os = byPart.get(p.id)!;
      const withImg = os.find((o) => o.image_url);
      return {
        slug: p.slug,
        name: p.name,
        offers: os.length,
        shops: new Set(os.map((o) => o.shop_id)).size,
        minPrice: Math.min(...os.map((o) => o.price)),
        imageUrl: withImg?.image_url ?? null,
        imageShop: withImg?.shop_name ?? null,
      };
    })
    .sort((a, b) => b.shops - a.shops || a.minPrice - b.minPrice);
  const compared = new Set(comparedIds);
  const rest = results.filter((o) => !o.part_id || !compared.has(o.part_id));

  const href = (patch: {stroj?: string | null; sklad?: boolean}) => {
    const u = new URLSearchParams({q});
    const s = patch.stroj === undefined ? family : patch.stroj;
    const k = patch.sklad === undefined ? stockOnly : patch.sklad;
    if (s) u.set('stroj', s);
    if (k) u.set('sklad', '1');
    return `/hledat?${u.toString()}`;
  };

  return (
    <div className="md">
      <InternalBanner internal={internal} />
      <Header query={q} />

      <section style={{background: 'var(--paper)', borderBottom: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 28, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 16}}>
          <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em'}}>
            {q ? `„${q}“` : 'Hledání'}{' '}
            {q ? (
              <span style={{fontWeight: 500, fontSize: 18, letterSpacing: 0, color: 'var(--dim)'}}>
                {countLabel(results.length, OFFERS)}
                {all.length >= 200 ? '+' : ''}
                {parts.length > 0 ? ` · ${parts.length} ${parts.length === 1 ? 'díl' : parts.length < 5 ? 'díly' : 'dílů'} s porovnáním cen` : ''}
              </span>
            ) : null}
          </h1>
          {familyChips.length > 0 ? (
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px'}}>
              <span style={{fontSize: 14, color: 'var(--dim)', marginRight: 4}}>Pro stroj</span>
              {family ? (
                <Link className="chip" href={href({stroj: null})}>
                  Všechny
                </Link>
              ) : null}
              {familyChips.map((c) => (
                <Link key={c.name} className={family === c.name ? 'chip-on' : 'chip'} href={href({stroj: family === c.name ? null : c.name})}>
                  {c.name} <span style={{marginLeft: 8, opacity: 0.75}}>{formatCount(c.n)}</span>
                </Link>
              ))}
              <Link className={stockOnly ? 'chip-on' : 'chip'} href={href({sklad: !stockOnly})} style={{marginLeft: 8}}>
                Jen skladem
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="wrap" style={{paddingTop: 36, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 40}}>
          {!q ? <p style={{margin: 0, color: 'var(--soft)'}}>Napiš, co sháníš, třeba „píst 38,50“ nebo „tryska Pionýr“.</p> : null}
          {q && results.length === 0 ? (
            <p style={{margin: 0, color: 'var(--soft)'}}>
              Nic jsme nenašli. Zkus méně slov, nebo vyber svůj stroj na <Link href="/#modely" style={{color: 'var(--red)', textDecoration: 'underline'}}>úvodní stránce</Link>.
            </p>
          ) : null}

          {parts.length > 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              <h2 className="eyebrow" style={{margin: 0, color: 'var(--red)'}}>
                Díly – porovnání cen napříč e-shopy
              </h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(520px, 100%), 1fr))', gap: 16}}>
                {parts.map((p) => (
                  <PartCard key={p.slug} p={p} />
                ))}
              </div>
            </div>
          ) : null}

          {rest.length > 0 ? (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <h2 className="eyebrow" style={{margin: 0, paddingBottom: 8, borderBottom: '2px solid var(--ink)', color: 'var(--soft)'}}>
                {parts.length > 0 ? 'Další nabídky, zatím bez porovnání' : 'Nabídky'} · {formatCount(rest.length)}
              </h2>
              {rest.slice(0, LIST_LIMIT).map((o) => (
                <OfferRow key={o.id} offer={o} />
              ))}
              {rest.length > LIST_LIMIT ? (
                <p style={{marginTop: 20, color: 'var(--soft)'}}>Zobrazujeme {LIST_LIMIT} nejlevnějších. Upřesni hledání nebo vyber stroj.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  );
}
