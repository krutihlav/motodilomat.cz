import Link from 'next/link';
import Photo from './Photo';
import {formatPrice, countLabel, OFFERS, SHOPS, shopLabel} from '@/lib/catalog/format';

export type PartCardData = {
  slug: string;
  name: string;
  fits?: string | null;
  offers: number;
  shops: number;
  minPrice: number;
  imageUrl: string | null;
  imageShop: string | null;
};

/** Karta dílu s porovnáním cen (výsledky hledání). */
export default function PartCard({p}: {p: PartCardData}) {
  return (
    <Link className="card" href={`/dil/${p.slug}`} style={{display: 'flex', gap: 18, padding: 18, boxSizing: 'border-box', boxShadow: '0 2px 0 var(--line)', color: 'var(--ink)'}}>
      <span style={{display: 'flex', flexDirection: 'column', gap: 4, width: 112, flex: 'none'}}>
        <Photo src={p.imageUrl} alt={p.name} size={112} />
        {p.imageUrl && p.imageShop ? <span style={{fontSize: 11, color: 'var(--dim)'}}>foto: {shopLabel(p.imageShop)}</span> : null}
      </span>
      <span style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4}}>
        <span className="display" style={{fontWeight: 700, fontSize: 20, lineHeight: 1.25}}>
          {p.name}
        </span>
        {p.fits ? <span style={{fontSize: 14, color: 'var(--soft)'}}>{p.fits}</span> : null}
        <span style={{marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 16px'}}>
          <span style={{fontSize: 14, color: 'var(--dim)'}}>
            {countLabel(p.offers, OFFERS)} · {countLabel(p.shops, SHOPS)}
          </span>
          <span style={{display: 'flex', alignItems: 'baseline', gap: 6}}>
            <span style={{fontSize: 14, color: 'var(--dim)'}}>od</span>
            <span className="display" style={{fontWeight: 700, fontSize: 28, lineHeight: 1, whiteSpace: 'nowrap', color: 'var(--red)'}}>
              {formatPrice(p.minPrice)}
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}
