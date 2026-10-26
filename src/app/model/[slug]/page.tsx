import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Footer, Header, InternalBanner, Plate, ArrowRight} from '@/components/catalog/Chrome';
import {OfferRow} from '@/components/catalog/OfferRow';
import Photo from '@/components/catalog/Photo';
import AutoSubmitSelect from '@/components/catalog/AutoSubmitSelect';
import {catalogDb} from '@/lib/catalog/db';
import {catalogRobots, requireLaunched} from '@/lib/catalog/gate';
import {CATEGORY_GROUPS, CATEGORY_LABELS, groupOf} from '@/lib/catalog/categories';
import {countLabel, formatCount, formatPrice, OFFERS, SHOPS, shopLabel} from '@/lib/catalog/format';
import {modelHref, parseModelFilters, type ModelFilters, type SearchParams} from '@/lib/catalog/params';
import {getModel, getModelOffers, getModelPartsPage, getModelSummary, getModels, type Model} from '@/lib/catalog/queries';

const PAGE_SIZE = 30;

type Props = {params: Promise<{slug: string}>; searchParams: Promise<SearchParams>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  requireLaunched();
  const {slug} = await params;
  const model = await getModel(slug);
  if (!model) return {};
  return {
    title: `Díly na ${model.name} – srovnání cen | MotoDílomat.cz`,
    description: `Náhradní díly na ${model.name} ze všech specializovaných e-shopů. Porovnej ceny a dostupnost.`,
    alternates: {canonical: `/model/${slug}`},
    openGraph: {title: `Díly na ${model.name}`, url: `/model/${slug}`},
    robots: catalogRobots(),
  };
}

function plateNo(m: Model): string {
  if (m.family === 'Stadion') return m.name.replace(/^Stadion\s+/, '');
  return m.type_numbers?.[0] ?? m.slug.split('-').pop()?.toUpperCase() ?? '';
}

function shortName(m: Model): string {
  return m.name.replace(/^(Jawa-ČZ|Jawa 50|Jawa|ČZ|Babetta|Stadion)\s+/, '').replace(/^Pionýr\s+/, '');
}

export default async function ModelPage({params, searchParams}: Props) {
  requireLaunched();
  const {slug} = await params;
  const sp = await searchParams;
  const f = parseModelFilters(sp);

  const model = await getModel(slug);
  if (!model) notFound();

  const {internal} = catalogDb();
  const query = {slug, category: f.category, shops: f.shops, inStock: f.inStock, sort: f.sort};
  const [summary, allModels, partsPage] = await Promise.all([
    getModelSummary(slug),
    getModels(),
    getModelPartsPage({...query, limit: f.view === 'dily' ? PAGE_SIZE : 1, offset: f.view === 'dily' ? (f.page - 1) * PAGE_SIZE : 0}),
  ]);
  // bez dílů se srovnáním (nebo bez migrace 028) rovnou všechny nabídky
  if (partsPage.total === 0 && f.view === 'dily') f.view = 'nabidky';
  const list =
    f.view === 'nabidky'
      ? await getModelOffers({...query, limit: PAGE_SIZE, offset: (f.page - 1) * PAGE_SIZE})
      : {offers: [], total: 0};
  const siblings = allModels.filter((m) => m.family === model.family);
  const selectedShops = new Set(f.shops ?? summary.shops.map((s) => s.id));
  const catCount = f.category ? (summary.categories.get(f.category) ?? 0) : summary.total;

  return (
    <div className="md">
      <InternalBanner internal={internal} />
      <Header placeholder={`Hledat díl na ${model.name}`} />

      <section style={{background: 'var(--paper)', borderBottom: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 24, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 22}}>
          <nav aria-label="Drobečková navigace" style={{display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 14, color: 'var(--dim)'}}>
            <Link href="/">Úvod</Link>
            <span aria-hidden="true">›</span>
            <Link href="/#modely">{model.family}</Link>
            <span aria-hidden="true">›</span>
            <span style={{color: 'var(--ink)', fontWeight: 600}}>{shortName(model)}</span>
          </nav>

          <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 28px'}}>
            <span aria-hidden="true">
              <Plate no={plateNo(model)} size="lg" filled />
            </span>
            <div style={{flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8}}>
              <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 'clamp(30px, 4.2vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.025em'}}>
                {model.name}
              </h1>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 15, color: 'var(--soft)'}}>
                <span>
                  <strong style={{color: 'var(--red)'}}>{formatCount(summary.total)}</strong> nabídek
                </span>
                <span>
                  <strong style={{color: 'var(--red)'}}>{summary.shops.length}</strong> e-shopů
                </span>
                <span>
                  <strong style={{color: 'var(--red)'}}>{formatCount(summary.inStock)}</strong> skladem
                </span>
                {model.years ? <span style={{color: 'var(--dim)'}}>{model.years}</span> : null}
              </div>
            </div>
          </div>

          {siblings.length > 1 ? (
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px'}}>
              <span style={{fontSize: 14, color: 'var(--dim)', marginRight: 4}}>Příbuzné typy</span>
              {siblings.map((m) =>
                m.slug === model.slug ? (
                  <span key={m.slug} className="chip-on" aria-current="page">
                    {shortName(m)}
                  </span>
                ) : (
                  <Link key={m.slug} className="chip" href={`/model/${m.slug}`}>
                    {shortName(m)}
                  </Link>
                ),
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="wrap" style={{paddingTop: 36, paddingBottom: 72, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '36px 48px'}}>
          <aside style={{flex: '1 1 250px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 32}}>
            <nav aria-label="Kategorie dílů" style={{display: 'flex', flexDirection: 'column'}}>
              <CatLink href={modelHref(slug, f, {category: null, page: 1})} label="Všechny díly" n={summary.total} active={!f.category} />
              {CATEGORY_GROUPS.map((g) => {
                const groupN = g.keys.reduce((a, k) => a + (summary.categories.get(k) ?? 0), 0);
                if (groupN === 0) return null;
                const single = g.keys.length === 1;
                return (
                  <div key={g.label} style={{display: 'flex', flexDirection: 'column'}}>
                    {single ? (
                      <Link href={modelHref(slug, f, {category: g.keys[0], page: 1})} className="display" aria-current={f.category === g.keys[0] ? 'true' : undefined} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 14, padding: '10px 0 8px', borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 18, color: f.category === g.keys[0] ? 'var(--red)' : undefined}}>
                        <span>{g.label}</span>
                        <span className="tabnum" style={{color: 'var(--dim)', fontWeight: 500, fontSize: 15}}>{formatCount(groupN)}</span>
                      </Link>
                    ) : (
                      <>
                        <span className="display" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 14, padding: '10px 0 8px', borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 18}}>
                          <span>{g.label}</span>
                          <span className="tabnum" style={{color: 'var(--dim)', fontWeight: 500, fontSize: 15}}>{formatCount(groupN)}</span>
                        </span>
                        {g.keys
                          .filter((k) => (summary.categories.get(k) ?? 0) > 0)
                          .map((k) => (
                            <CatLink key={k} href={modelHref(slug, f, {category: k, page: 1})} label={CATEGORY_LABELS[k]} n={summary.categories.get(k) ?? 0} active={f.category === k} sub />
                          ))}
                      </>
                    )}
                  </div>
                );
              })}
            </nav>

            <form id="filtr" action={`/model/${slug}`} style={{display: 'flex', flexDirection: 'column', gap: 2}}>
              {f.category ? <input type="hidden" name="kat" value={f.category} /> : null}
              {f.view === 'nabidky' ? <input type="hidden" name="zobrazit" value="nabidky" /> : null}
              <fieldset style={{margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                <legend className="display" style={{width: '100%', padding: '10px 0 8px', borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 18}}>
                  E-shop
                </legend>
                {summary.shops.map((s) => (
                  <label key={s.id} style={{display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, fontSize: 15, color: 'var(--soft)', cursor: 'pointer'}}>
                    <input type="checkbox" name="shop" value={s.id} defaultChecked={selectedShops.has(s.id)} style={{width: 18, height: 18, margin: 0, accentColor: '#8A1524'}} />
                    <span style={{flex: 1}}>{shopLabel(s.name)}</span>
                    <span className="tabnum" style={{color: 'var(--dim)'}}>{formatCount(s.n)}</span>
                  </label>
                ))}
              </fieldset>
              <label style={{display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 15, fontWeight: 600, cursor: 'pointer'}}>
                <input type="checkbox" name="sklad" value="1" defaultChecked={f.inStock} style={{width: 18, height: 18, margin: 0, accentColor: '#8A1524'}} />
                <span style={{flex: 1}}>Jen skladem</span>
                <span className="tabnum" style={{color: 'var(--dim)', fontWeight: 400}}>{formatCount(summary.inStock)}</span>
              </label>
              <button type="submit" style={{marginTop: 12, height: 48, padding: '0 22px', background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>
                Použít filtr
              </button>
            </form>
          </aside>

          <main style={{flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24}}>
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px 24px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {f.category ? <span style={{fontSize: 14, color: 'var(--dim)'}}>{groupOf(f.category)}</span> : null}
                <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.02em'}}>
                  {f.category ? CATEGORY_LABELS[f.category] : 'Všechny díly'}
                </h2>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <label htmlFor="razeni" style={{fontSize: 14, color: 'var(--dim)'}}>
                  Řadit
                </label>
                <AutoSubmitSelect id="razeni" name="razeni" form="filtr" defaultValue={f.sort} style={{height: 44, padding: '0 12px', background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', fontSize: 15}}>
                  <option value="price_asc">{f.view === 'dily' ? 'Nejvíc e-shopů' : 'Od nejlevnějšího'}</option>
                  <option value="price_desc">Od nejdražšího</option>
                  <option value="name">Podle názvu</option>
                </AutoSubmitSelect>
              </div>
            </div>

            <nav aria-label="Zobrazení" style={{display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '2px solid var(--ink)'}}>
              <Tab href={modelHref(slug, f, {view: 'dily', page: 1})} active={f.view === 'dily'} label="Srovnání cen" n={partsPage.total} />
              <Tab href={modelHref(slug, f, {view: 'nabidky', page: 1})} active={f.view === 'nabidky'} label="Všechny nabídky" n={catCount} />
            </nav>

            {f.view === 'dily' ? (
              <div style={{display: 'flex', flexDirection: 'column'}}>
                {partsPage.parts.length === 0 ? (
                  <p style={{color: 'var(--soft)'}}>
                    Tady zatím žádný díl se srovnáním cen není.{' '}
                    <Link href={modelHref(slug, f, {view: 'nabidky', page: 1})} style={{color: 'var(--red)', textDecoration: 'underline'}}>
                      Zobrazit všechny nabídky
                    </Link>
                  </p>
                ) : null}
                {partsPage.parts.map((p) => (
                  <Link
                    key={p.part_id}
                    href={`/dil/${p.slug}`}
                    style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px', padding: '16px 0', borderBottom: '1px solid var(--line)', color: 'var(--ink)'}}
                  >
                    <Photo src={p.image_url} alt={p.name} size={64} />
                    <span style={{flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4}}>
                      <span style={{fontWeight: 600, fontSize: 16, lineHeight: 1.35}}>{p.name}</span>
                      <span style={{fontSize: 14, color: 'var(--dim)'}}>
                        {countLabel(p.shops, SHOPS)} · {countLabel(p.offers, OFFERS)}
                        {p.in_stock > 0 ? ` · ${p.in_stock} skladem` : ' · nic skladem'}
                      </span>
                    </span>
                    <span style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 110}}>
                      <span style={{display: 'flex', alignItems: 'baseline', gap: 6}}>
                        <span style={{fontSize: 14, color: 'var(--dim)'}}>od</span>
                        <span className="display" style={{fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap', color: 'var(--red)'}}>
                          {formatPrice(p.min_price)}
                        </span>
                      </span>
                      {p.max_price > p.min_price ? <span style={{fontSize: 13, color: 'var(--dim)'}}>až {formatPrice(p.max_price)}</span> : null}
                    </span>
                    <span className="btn-out" aria-hidden="true">
                      Porovnat <ArrowRight />
                    </span>
                  </Link>
                ))}
                <Pager slug={slug} f={f} total={partsPage.total} />
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column'}}>
                {list.offers.length === 0 ? <p style={{color: 'var(--soft)'}}>Pro tyto filtry tu zatím nic není.</p> : null}
                {list.offers.map((o) => (
                  <div key={o.id}>
                    <OfferRow offer={o} />
                    {o.part_slug ? (
                      <Link href={`/dil/${o.part_slug}`} style={{display: 'inline-flex', alignItems: 'center', gap: 6, margin: '-8px 0 12px 84px', fontSize: 14, fontWeight: 600, color: 'var(--red)'}}>
                        Porovnat s dalšími e-shopy <ArrowRight />
                      </Link>
                    ) : null}
                  </div>
                ))}
                <Pager slug={slug} f={f} total={list.total} />
              </div>
            )}
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CatLink({href, label, n, active, sub}: {href: string; label: string; n: number; active: boolean; sub?: boolean}) {
  if (active) {
    return (
      <Link href={href} aria-current="true" style={{display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 6, background: 'var(--red)', fontSize: 15, fontWeight: 700, color: 'var(--cream)'}}>
        <span>{label}</span>
        <span className="tabnum">{formatCount(n)}</span>
      </Link>
    );
  }
  return (
    <Link href={href} style={{display: 'flex', justifyContent: 'space-between', gap: 12, padding: sub ? '7px 10px' : '9px 0', fontSize: 15, color: 'var(--soft)'}}>
      <span>{label}</span>
      <span className="tabnum" style={{color: 'var(--dim)'}}>{formatCount(n)}</span>
    </Link>
  );
}

function Tab({href, active, label, n}: {href: string; active: boolean; label: string; n: number}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        minHeight: 48,
        padding: '12px 18px 10px',
        boxSizing: 'border-box',
        marginBottom: -2,
        borderBottom: active ? '4px solid var(--red)' : '4px solid transparent',
        fontWeight: 700,
        fontSize: 16,
        color: active ? 'var(--red)' : 'var(--soft)',
      }}
    >
      {label} <span className="tabnum" style={{fontWeight: 500, fontSize: 14, color: 'var(--dim)'}}>{formatCount(n)}</span>
    </Link>
  );
}

function Pager({slug, f, total}: {slug: string; f: ModelFilters; total: number}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Stránkování" style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 24}}>
      {f.page > 1 ? (
        <Link className="chip" href={modelHref(slug, f, {page: f.page - 1})}>
          Předchozí
        </Link>
      ) : null}
      <span style={{fontSize: 14, color: 'var(--dim)'}}>
        strana {f.page} z {pages}
      </span>
      {f.page < pages ? (
        <Link className="chip" href={modelHref(slug, f, {page: f.page + 1})}>
          Další
        </Link>
      ) : null}
    </nav>
  );
}
