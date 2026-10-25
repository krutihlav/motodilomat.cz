import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Footer, Header, InternalBanner, Plate, ArrowRight} from '@/components/catalog/Chrome';
import {BestBadge, OfferRow, ShopLink} from '@/components/catalog/OfferRow';
import Photo from '@/components/catalog/Photo';
import AutoSubmitSelect from '@/components/catalog/AutoSubmitSelect';
import {catalogDb} from '@/lib/catalog/db';
import {catalogRobots, requireLaunched} from '@/lib/catalog/gate';
import {CATEGORY_GROUPS, CATEGORY_LABELS, groupOf} from '@/lib/catalog/categories';
import {countLabel, formatCount, formatPrice, OFFERS, SHOPS, shopLabel} from '@/lib/catalog/format';
import {modelHref, parseModelFilters, type SearchParams} from '@/lib/catalog/params';
import {getModel, getModelOffers, getModelParts, getModelSummary, getModels, getPartOffers, type Model} from '@/lib/catalog/queries';

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
    robots: catalogRobots(),
  };
}

function plateNo(m: Model): string {
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
  const [summary, allModels, parts, list] = await Promise.all([
    getModelSummary(slug),
    getModels(),
    getModelParts(slug, f.category, 4),
    getModelOffers({slug, category: f.category, shops: f.shops, inStock: f.inStock, sort: f.sort, limit: PAGE_SIZE, offset: (f.page - 1) * PAGE_SIZE}),
  ]);
  const partOffers = await Promise.all(parts.map((p) => getPartOffers(p.part_id)));
  const siblings = allModels.filter((m) => m.family === model.family);
  const selectedShops = new Set(f.shops ?? summary.shops.map((s) => s.id));
  const catCount = f.category ? (summary.categories.get(f.category) ?? 0) : summary.total;
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

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
              {f.sort !== 'price_asc' ? <input type="hidden" name="razeni" value={f.sort} /> : null}
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

          <main style={{flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28}}>
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px 24px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {f.category ? <span style={{fontSize: 14, color: 'var(--dim)'}}>{groupOf(f.category)}</span> : null}
                <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.02em'}}>
                  {f.category ? CATEGORY_LABELS[f.category] : 'Všechny díly'}{' '}
                  <span style={{fontWeight: 500, fontSize: 18, letterSpacing: 0, color: 'var(--dim)'}}>{countLabel(catCount, OFFERS)}</span>
                </h2>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <label htmlFor="razeni" style={{fontSize: 14, color: 'var(--dim)'}}>
                  Řadit
                </label>
                <AutoSubmitSelect id="razeni" name="razeni" form="filtr" defaultValue={f.sort} style={{height: 44, padding: '0 12px', background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', fontSize: 15}}>
                  <option value="price_asc">Od nejlevnějšího</option>
                  <option value="price_desc">Od nejdražšího</option>
                  <option value="name">Podle názvu</option>
                </AutoSubmitSelect>
              </div>
            </div>

            {parts.length > 0 && f.page === 1 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                <h3 className="eyebrow" style={{margin: 0, color: 'var(--red)'}}>
                  Stejný díl ve více e-shopech
                </h3>
                {parts.map((p, i) => {
                  const offers = partOffers[i] ?? [];
                  const top = offers.filter((o) => o.in_stock).slice(0, 3);
                  const shown = top.length > 0 ? top : offers.slice(0, 3);
                  return (
                    <article key={p.part_id} className="card" style={{display: 'flex', flexDirection: 'column', boxShadow: '0 2px 0 var(--line)'}}>
                      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px', padding: 20}}>
                        <span style={{display: 'flex', flexDirection: 'column', gap: 4, width: 88}}>
                          <Photo src={p.image_url} alt={p.name} size={88} />
                          {p.image_url && p.image_shop ? <span style={{fontSize: 11, color: 'var(--dim)'}}>foto: {shopLabel(p.image_shop)}</span> : null}
                        </span>
                        <div style={{flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                          <Link href={`/dil/${p.slug}`} className="display" style={{fontWeight: 700, fontSize: 22, lineHeight: 1.25}}>
                            {p.name}
                          </Link>
                          <span style={{fontSize: 14, color: 'var(--dim)'}}>
                            {countLabel(p.offers, OFFERS)} · {countLabel(p.shops, SHOPS)}
                            {p.max_price > p.min_price ? ` · rozdíl ${formatPrice(p.max_price - p.min_price)}` : ''}
                          </span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                          <span style={{fontSize: 14, color: 'var(--dim)'}}>od</span>
                          <span className="display" style={{fontWeight: 700, fontSize: 32, lineHeight: 1, whiteSpace: 'nowrap', color: 'var(--red)'}}>
                            {formatPrice(p.min_price)}
                          </span>
                        </div>
                      </div>
                      {shown.map((o, j) => (
                        <div key={o.id} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', padding: '14px 20px', borderTop: '1px solid var(--line)'}}>
                          <div style={{flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3}}>
                            <span style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px'}}>
                              <span style={{fontWeight: 700, fontSize: 16}}>{shopLabel(o.shop_name)}</span>
                              {j === 0 && o.price === p.min_price ? <BestBadge /> : null}
                            </span>
                            <span style={{fontSize: 14, color: 'var(--dim)'}}>{o.name}</span>
                          </div>
                          <span className="display" style={{minWidth: 96, textAlign: 'right', fontWeight: 700, fontSize: 20, whiteSpace: 'nowrap'}}>
                            {formatPrice(o.price)}
                          </span>
                          <ShopLink href={o.url} />
                        </div>
                      ))}
                      <Link href={`/dil/${p.slug}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, padding: '0 20px', borderTop: '1px solid var(--line)', fontWeight: 600, color: 'var(--red)'}}>
                        <span>Porovnat {countLabel(p.offers, OFFERS)}</span>
                        <ArrowRight />
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <div style={{display: 'flex', flexDirection: 'column'}}>
              <h3 className="eyebrow" style={{margin: 0, paddingBottom: 8, borderBottom: '2px solid var(--ink)', color: 'var(--soft)'}}>
                {parts.length > 0 ? 'Další nabídky' : 'Nabídky'} · {formatCount(list.total)}
              </h3>
              {list.offers.length === 0 ? <p style={{color: 'var(--soft)'}}>Pro tyto filtry tu zatím nic není.</p> : null}
              {list.offers.map((o) => (
                <OfferRow key={o.id} offer={o} />
              ))}
              {pages > 1 ? (
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
              ) : null}
            </div>
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
