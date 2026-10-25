import Link from 'next/link';
import {siteConfig} from '@/config';

export function Logo() {
  return (
    <Link href="/" className="display" style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', color: 'var(--cream)'}}>
      <span style={{display: 'flex', color: 'var(--gold)'}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>
      <span>
        MotoDílomat<span style={{color: 'var(--gold)'}}>.cz</span>
      </span>
    </Link>
  );
}

export function SearchIcon({size = 18}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function ArrowOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** Kompaktní hlavička s hledáním (všechny stránky kromě úvodu). */
export function Header({query, placeholder}: {query?: string; placeholder?: string}) {
  return (
    <div className="onred" style={{background: 'var(--red)', color: 'var(--cream)'}}>
      <header className="wrap" style={{paddingTop: 14, paddingBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 32px'}}>
        <Logo />
        <form action="/hledat" role="search" style={{flex: '1 1 300px', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 46, boxSizing: 'border-box', background: 'var(--paper)', borderRadius: 8, color: 'var(--ink)'}}>
          <span style={{display: 'flex', color: 'var(--dim)'}}>
            <SearchIcon />
          </span>
          <label htmlFor="q-head" className="sr-only">
            Hledat díl
          </label>
          <input id="q-head" name="q" type="search" defaultValue={query} placeholder={placeholder ?? 'Hledat díl'} style={{flex: 1, minWidth: 0, height: '100%', border: 0, outline: 0, background: 'transparent', color: 'var(--ink)', font: 'inherit', fontSize: 15}} />
        </form>
        <Nav />
      </header>
      <div className="wrap" aria-hidden="true" style={{paddingBottom: 12}}>
        <div className="pinstripe" />
      </div>
    </div>
  );
}

export function Nav({current}: {current?: 'eshopy'}) {
  return (
    <nav style={{display: 'flex', flexWrap: 'wrap', gap: '8px 28px', fontSize: 15, fontWeight: 500}}>
      <Link href="/#modely" style={{padding: '10px 0'}}>
        Modely
      </Link>
      <Link href="/pro-eshopy" aria-current={current === 'eshopy' ? 'page' : undefined} style={{padding: '10px 0', color: current === 'eshopy' ? '#F6DC8A' : undefined}}>
        Pro e-shopy
      </Link>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="onred" style={{background: 'var(--ink)', color: '#CFC4B8'}}>
      <div className="wrap" style={{paddingTop: 32, paddingBottom: 32, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px 32px', fontSize: 14}}>
        <span>
          Provozovatel: {siteConfig.firstName} {siteConfig.lastName} · {siteConfig.contactEmail}
        </span>
        <span style={{display: 'flex', flexWrap: 'wrap', gap: '8px 24px'}}>
          <Link href="/pro-eshopy" style={{textDecoration: 'underline', textUnderlineOffset: 3}}>
            Pro e-shopy
          </Link>
          <a href="/zasady-ochrany-osobnich-udaju.html" style={{textDecoration: 'underline', textUnderlineOffset: 3}}>
            Zásady ochrany osobních údajů
          </a>
        </span>
      </div>
    </footer>
  );
}

export function InternalBanner({internal}: {internal: boolean}) {
  if (!internal) return null;
  return (
    <div style={{background: '#1E1613', color: '#F6DC8A', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '6px 16px'}}>
      Interní náhled – zobrazuje i nezveřejněné nabídky. Není to veřejný web. ·{' '}
      <Link href="/interni/parovani" style={{color: '#F6DC8A', textDecoration: 'underline', textUnderlineOffset: 3}}>
        Párování dílů
      </Link>
    </div>
  );
}

export function StockDot({inStock}: {inStock: boolean}) {
  return inStock ? (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--soft)'}}>
      <span style={{width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)'}} />
      Skladem
    </span>
  ) : (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--dim)'}}>
      <span style={{width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--dim)'}} />
      Není skladem
    </span>
  );
}

/** Typový štítek (motiv výrobního štítku). */
export function Plate({no, label, size = 'md', filled}: {no: string; label?: string; size?: 'sm' | 'md' | 'lg'; filled?: boolean}) {
  const dims = size === 'lg' ? {w: 124, h: 96, no: 44, typ: 11} : size === 'sm' ? {w: 92, h: 64, no: 24, typ: 9} : {w: undefined, h: 104, no: 32, typ: 10};
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        width: dims.w,
        minHeight: dims.h,
        padding: '0 10px',
        boxSizing: 'border-box',
        borderRadius: 7,
        border: filled ? 'none' : '2px solid currentColor',
        background: filled ? 'var(--red)' : undefined,
        boxShadow: filled ? 'inset 0 0 0 4px var(--red), inset 0 0 0 5px var(--gold)' : undefined,
        color: filled ? 'var(--cream)' : undefined,
      }}
    >
      <span aria-hidden="true" style={{flex: 'none', width: 5, height: 5, borderRadius: '50%', background: filled ? 'var(--gold)' : 'currentColor'}} />
      <span className="display" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
        <span style={{fontSize: dims.typ, fontWeight: 500, letterSpacing: '0.22em'}}>TYP</span>
        <span style={{fontSize: dims.no, fontWeight: 700, lineHeight: 1}}>{no}</span>
        {label ? <span style={{fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 500}}>{label}</span> : null}
      </span>
      <span aria-hidden="true" style={{flex: 'none', width: 5, height: 5, borderRadius: '50%', background: filled ? 'var(--gold)' : 'currentColor'}} />
    </span>
  );
}
