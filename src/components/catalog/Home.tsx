import {connection} from 'next/server';
import Link from 'next/link';
import {Footer, InternalBanner, Logo, Nav, Plate, SearchIcon, ArrowRight} from './Chrome';
import {getModels, getShopCounts, getStats, type Model} from '@/lib/catalog/queries';
import {catalogDb} from '@/lib/catalog/db';
import {countLabel, formatCount, lastUpdateLabel, MODELS, shopLabel} from '@/lib/catalog/format';

const PLATES = [
  {no: '20', name: 'Pionýr', slug: 'pionyr-20'},
  {no: '550', name: 'Pařez', slug: 'pionyr-550'},
  {no: '210', name: 'Babetta', slug: 'babetta-210'},
  {no: '634', name: 'Jawa 350', slug: 'jawa-350-634'},
  {no: '354', name: 'Kývačka', slug: 'kyvacka-350'},
  {no: 'S11', name: 'Stadion', slug: 'stadion-s11'},
];

const FAMILY_ORDER = ['Jawa 50', 'Jawa 250/350/500', 'Babetta', 'ČZ', 'Jawa-ČZ', 'Stadion', 'Jawetta', 'Jawa 90', 'Čezeta', 'Velorex'];
const FAMILY_TITLE: Record<string, string> = {'Jawa 50': 'Jawa 50 Pionýr'};

/** Krátký název modelu v kartě rodiny („Jawa 50 Pionýr typ 20“ → „typ 20“). */
function shortName(m: Model): string {
  const t = m.name.replace(/^(Jawa-ČZ|Jawa|ČZ|Babetta|Stadion)\s+/, '');
  return t;
}

function ccRange(models: Model[]): string {
  const cc = models.map((m) => m.displacement).filter((x): x is number => typeof x === 'number' && x > 0);
  if (cc.length === 0) return '';
  const min = Math.min(...cc);
  const max = Math.max(...cc);
  return min === max ? String(min) : `${min}–${max}`;
}

export default async function Home() {
  await connection(); // data až při požadavku, ne při buildu
  const {internal} = catalogDb();
  const [stats, models, shops] = await Promise.all([getStats(), getModels(), getShopCounts()]);

  const families = FAMILY_ORDER.map((f) => ({family: f, models: models.filter((m) => m.family === f)}))
    .concat(
      [...new Set(models.map((m) => m.family))]
        .filter((f) => !FAMILY_ORDER.includes(f))
        .map((f) => ({family: f, models: models.filter((m) => m.family === f)})),
    )
    .filter((f) => f.models.length > 0);

  return (
    <div className="md">
      <InternalBanner internal={internal} />
      <div className="onred" style={{background: 'var(--red)', color: 'var(--cream)'}}>
        <header className="wrap" style={{paddingTop: 18, paddingBottom: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 32px'}}>
          <Logo />
          <Nav />
        </header>

        <section className="wrap" style={{paddingTop: 48, paddingBottom: 56, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '48px 64px'}}>
          <div style={{flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20}}>
            <div className="display" style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--creamdim)'}}>
              <span style={{width: 28, height: 2, background: 'var(--gold)'}} />
              <span>Jawa · ČZ · Babetta · Stadion</span>
            </div>
            <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.03, letterSpacing: '-0.025em', textWrap: 'balance'}}>
              Srovnávač dílů pro dvoutakty z ČSSR
            </h1>
            <p style={{margin: 0, fontSize: 19, color: 'var(--creamdim)', maxWidth: 560, textWrap: 'pretty'}}>
              Díly na Jawu, ČZ, Babettu i Stadion ze všech e-shopů na jednom místě. Na jedno šlápnutí.
            </p>
            <form action="/hledat" role="search" style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8}}>
              <label htmlFor="q" style={{fontSize: 13, fontWeight: 600, color: 'var(--creamdim)'}}>
                Co sháníš?
              </label>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                <div style={{flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', height: 60, boxSizing: 'border-box', background: 'var(--paper)', borderRadius: 10, color: 'var(--ink)'}}>
                  <span style={{display: 'flex', color: 'var(--dim)'}}>
                    <SearchIcon size={22} />
                  </span>
                  <input id="q" name="q" type="search" required placeholder="např. píst 38,50 Pionýr" style={{flex: 1, minWidth: 0, height: '100%', border: 0, outline: 0, background: 'transparent', color: 'var(--ink)', font: 'inherit', fontSize: 18}} />
                </div>
                <button type="submit" style={{height: 60, padding: '0 30px', border: 0, borderRadius: 10, background: 'var(--ink)', color: 'var(--cream)', font: 'inherit', fontWeight: 700, fontSize: 17, cursor: 'pointer'}}>
                  Hledat
                </button>
              </div>
            </form>
          </div>

          <div style={{flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12}}>
            <span style={{fontSize: 13, fontWeight: 600, color: 'var(--creamdim)'}}>Nebo rovnou na stroj</span>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(104px, 100%), 1fr))', gap: 12}}>
              {PLATES.map((p) => (
                <Link key={p.slug} href={`/model/${p.slug}`} style={{color: 'var(--cream)'}} aria-label={`${p.name} typ ${p.no}`}>
                  <Plate no={p.no} label={p.name} />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <div className="wrap" aria-hidden="true" style={{paddingBottom: 14}}>
          <div className="pinstripe" />
        </div>
      </div>

      <section style={{background: 'var(--paper)', borderBottom: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 28, paddingBottom: 28, display: 'flex', flexWrap: 'wrap', gap: '20px 64px'}}>
          <Stat value={formatCount(stats.offers)} label="nabídek dílů" />
          <Stat value={String(stats.shops)} label="e-shopů" />
          <Stat value={String(models.length)} label="modelů motocyklů" />
          <Stat value={lastUpdateLabel(stats.last_seen)} label="ceny obnovujeme každou noc" />
        </div>
      </section>

      <section id="modely">
        <div className="wrap" style={{paddingTop: 64, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: 28}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em'}}>
              Vyber si stroj
            </h2>
            <p style={{margin: 0, color: 'var(--soft)'}}>Díly ti pak ukážeme jen na něj, roztříděné podle motoru, podvozku a elektriky.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))', gap: 16}}>
            {families.map((f) => (
              <div key={f.family} className="card" style={{display: 'flex', flexDirection: 'column', gap: 10, padding: 22}}>
                <span className="display" style={{display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--red)'}}>
                  <span style={{fontWeight: 700, fontSize: 40, lineHeight: 1, letterSpacing: '-0.03em'}}>{ccRange(f.models)}</span>
                  <span style={{fontWeight: 500, fontSize: 14}}>ccm</span>
                </span>
                <h3 className="display" style={{margin: 0, fontWeight: 700, fontSize: 21, lineHeight: 1.2}}>
                  {FAMILY_TITLE[f.family] ?? f.family}
                </h3>
                <ul style={{margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 14, lineHeight: 1.65}}>
                  {f.models.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/model/${m.slug}`} style={{color: 'var(--soft)', textDecoration: 'underline', textDecorationColor: 'var(--line)', textUnderlineOffset: 3}}>
                        {shortName(m)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <span style={{marginTop: 'auto', paddingTop: 6, fontSize: 13, color: 'var(--dim)'}}>{countLabel(f.models.length, MODELS)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="eshopy" style={{background: 'var(--paper)', borderTop: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 64, paddingBottom: 64, display: 'flex', flexWrap: 'wrap', gap: '32px 64px'}}>
          <div style={{flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 10}}>
            <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em'}}>
              Odkud bereme ceny
            </h2>
            <p style={{margin: 0, color: 'var(--soft)', maxWidth: 420}}>Nic neprodáváme. Ukážeme cenu a dostupnost a pošleme tě rovnou do e-shopu.</p>
            <Link href="/pro-eshopy" style={{marginTop: 6, fontWeight: 600, color: 'var(--red)', textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-flex', alignItems: 'center', gap: 6}}>
              Máte e-shop? Informace pro vás <ArrowRight />
            </Link>
          </div>
          <div style={{flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--ink)'}}>
            {shops.map((s) => (
              <div key={s.shop_id} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px 24px', padding: '16px 0', borderBottom: '1px solid var(--line)'}}>
                <span style={{display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 14px'}}>
                  <span className="display" style={{fontWeight: 700, fontSize: 19}}>
                    {shopLabel(s.shop_name)}
                  </span>
                  <span style={{fontSize: 14, color: 'var(--dim)'}}>{s.domain}</span>
                </span>
                <span style={{display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 14, color: 'var(--dim)'}}>
                  <span className="display tabnum" style={{fontWeight: 700, fontSize: 19, color: 'var(--red)'}}>
                    {formatCount(s.offers)}
                  </span>
                  <span>nabídek</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({value, label}: {value: string; label: string}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
      <span className="display tabnum" style={{fontWeight: 700, fontSize: 30, lineHeight: 1.15, color: 'var(--red)'}}>
        {value}
      </span>
      <span style={{fontSize: 14, color: 'var(--dim)'}}>{label}</span>
    </div>
  );
}
