import {connection} from 'next/server';
import type {Metadata} from 'next';
import {Footer, InternalBanner, Logo, Nav} from '@/components/catalog/Chrome';
import ContactForm from '@/components/catalog/ContactForm';
import {catalogDb} from '@/lib/catalog/db';
import {catalogRobots, requireLaunched} from '@/lib/catalog/gate';
import {getShopCounts} from '@/lib/catalog/queries';
import {shopLabel} from '@/lib/catalog/format';
import {siteConfig} from '@/config';

export function generateMetadata(): Metadata {
  requireLaunched();
  return {
    title: 'Pro e-shopy | MotoDílomat.cz',
    description: 'Jak MotoDílomat zobrazuje nabídky e-shopů, jak poslat feed a jak e-shop z Motodílomatu odstranit.',
    robots: catalogRobots(),
  };
}

const h2 = {margin: 0, fontWeight: 700, fontSize: 22} as const;

export default async function ForShopsPage() {
  requireLaunched();
  await connection(); // data až při požadavku, ne při buildu
  const {internal} = catalogDb();
  const shops = await getShopCounts();

  return (
    <div className="md" style={{lineHeight: 1.55}}>
      <InternalBanner internal={internal} />
      <div className="onred" style={{background: 'var(--red)', color: 'var(--cream)'}}>
        <header className="wrap" style={{paddingTop: 14, paddingBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 32px'}}>
          <Logo />
          <Nav current="eshopy" />
        </header>
        <section className="wrap" style={{paddingTop: 32, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 14}}>
          <h1 className="display" style={{margin: 0, fontWeight: 700, fontSize: 'clamp(32px, 4.6vw, 54px)', lineHeight: 1.05, letterSpacing: '-0.025em'}}>
            Pro e-shopy
          </h1>
          <p style={{margin: 0, fontSize: 19, color: 'var(--creamdim)', maxWidth: 680}}>
            Motodílomat nic neprodává. Ukazuje, kde se dá díl na Jawu, ČZ, Babettu nebo Stadion koupit, a posílá zákazníky rovnou na stránku produktu ve vašem e-shopu.
          </p>
        </section>
        <div className="wrap" aria-hidden="true" style={{paddingBottom: 12}}>
          <div className="pinstripe" />
        </div>
      </div>

      <section>
        <div className="wrap" style={{paddingTop: 56, paddingBottom: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 20}}>
          <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12, padding: 26}}>
            <h2 className="display" style={h2}>
              Co od vás zobrazujeme
            </h2>
            <ul style={{margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--soft)'}}>
              <li>název produktu, cenu a dostupnost</li>
              <li>odkaz přímo na produkt ve vašem e-shopu</li>
              <li>fotku produktu, načtenou přímo z vašeho webu a označenou vaším jménem; k sobě ji nekopírujeme</li>
            </ul>
            <p style={{margin: 0, color: 'var(--soft)'}}>Popisy produktů ani jiné texty nepřebíráme.</p>
          </div>
          <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12, padding: 26}}>
            <h2 className="display" style={h2}>
              Jak data získáváme
            </h2>
            <p style={{margin: 0, color: 'var(--soft)'}}>
              Robot <strong style={{color: 'var(--ink)'}}>MotodilomatBot</strong> projde jednou za noc veřejné stránky produktů. Drží se pravidel ve vašem robots.txt a posílá nejvýš jeden požadavek za 3 sekundy, takže web nezatěžuje.
            </p>
            <p style={{margin: 0, color: 'var(--soft)'}}>Máte XML feed pro Heureku nebo Google? Pošlete nám odkaz. Ceny pak budou přesnější a robot k vám chodit nemusí.</p>
          </div>
          <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12, padding: 26}}>
            <h2 className="display" style={h2}>
              Nechcete tu být?
            </h2>
            <p style={{margin: 0, color: 'var(--soft)'}}>Napište nám a váš e-shop z Motodílomatu co nejdříve stáhneme. Nebo robota zablokujte v robots.txt:</p>
            <pre style={{margin: 0, padding: '14px 16px', overflowX: 'auto', background: 'var(--ink)', borderRadius: 8, color: 'var(--cream)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, lineHeight: 1.6}}>
              {'User-agent: MotodilomatBot\nDisallow: /'}
            </pre>
          </div>
        </div>
      </section>

      <section style={{background: 'var(--paper)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)'}}>
        <div className="wrap" style={{paddingTop: 56, paddingBottom: 56, display: 'flex', flexWrap: 'wrap', gap: '40px 64px'}}>
          <div style={{flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 10}}>
            <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em'}}>
              Napište nám
            </h2>
            <p style={{margin: 0, color: 'var(--soft)', maxWidth: 400}}>
              Špatná cena, díl spárovaný s jiným, feed, nebo odstranění. Odpovídá {siteConfig.firstName} {siteConfig.lastName}, provozovatel.
            </p>
            <a href={`mailto:${siteConfig.contactEmail}`} style={{fontWeight: 600, color: 'var(--red)', textDecoration: 'underline', textUnderlineOffset: 3}}>
              {siteConfig.contactEmail}
            </a>
          </div>
          <ContactForm />
        </div>
      </section>

      <section>
        <div className="wrap" style={{paddingTop: 56, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 20}}>
          <h2 className="display" style={{margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em'}}>
            E-shopy na Motodílomatu
          </h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '0 32px', borderTop: '2px solid var(--ink)'}}>
            {shops.map((s) => (
              <div key={s.shop_id} style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--line)'}}>
                <span style={{display: 'flex', flexDirection: 'column'}}>
                  <span style={{fontWeight: 700}}>{shopLabel(s.shop_name)}</span>
                  <span style={{fontSize: 14, color: 'var(--dim)'}}>{s.domain}</span>
                </span>
                <span style={{fontSize: 14, color: 'var(--dim)'}}>{s.source_type === 'crawl' ? 'robot' : 'feed'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
