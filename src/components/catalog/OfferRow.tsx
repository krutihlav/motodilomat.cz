import Photo from './Photo';
import {ArrowOut, StockDot} from './Chrome';
import {formatPrice, shopLabel} from '@/lib/catalog/format';
import type {Offer} from '@/lib/catalog/queries';

/** Odkaz do e-shopu: nofollow + sponsored-free, bez předávání naší historie. */
export function ShopLink({href, filled, label = 'Do e-shopu'}: {href: string; filled?: boolean; label?: string}) {
  return (
    <a className={filled ? 'btn-red' : 'btn-out'} href={href} target="_blank" rel="nofollow noopener" style={filled ? {minHeight: 44, fontSize: 15, padding: '0 18px'} : undefined}>
      {label}
      <ArrowOut />
    </a>
  );
}

/** Řádek nabídky z jednoho e-shopu. */
export function OfferRow({offer, best, maker, compact}: {offer: Offer; best?: boolean; maker?: string | null; compact?: boolean}) {
  const shop = shopLabel(offer.shop_name);
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px', padding: compact ? '14px 20px' : '16px 0', borderBottom: '1px solid var(--line)'}}>
      <Photo src={offer.image_url} alt={offer.name} size={64} />
      <div style={{flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4}}>
        {compact ? (
          <>
            <span style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px'}}>
              <span style={{fontWeight: 700, fontSize: 17}}>{shop}</span>
              {best ? <BestBadge /> : null}
              {maker ? <span style={{padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 12, fontWeight: 600, color: 'var(--soft)'}}>{maker}</span> : null}
              <StockDot inStock={offer.in_stock} />
            </span>
            <span style={{fontSize: 14, color: 'var(--dim)'}}>{offer.name}</span>
          </>
        ) : (
          <>
            <a href={offer.url} target="_blank" rel="nofollow noopener" style={{fontWeight: 600, fontSize: 16, lineHeight: 1.35}}>
              {offer.name}
            </a>
            <span style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', fontSize: 14, color: 'var(--dim)'}}>
              <span style={{fontWeight: 600, color: 'var(--soft)'}}>{shop}</span>
              <StockDot inStock={offer.in_stock} />
            </span>
          </>
        )}
      </div>
      <span className="display" style={{minWidth: 96, textAlign: 'right', fontWeight: 700, fontSize: compact ? 22 : 20, whiteSpace: 'nowrap'}}>
        {formatPrice(offer.price)}
      </span>
      <ShopLink href={offer.url} />
    </div>
  );
}

export function BestBadge() {
  return <span style={{padding: '2px 8px', borderRadius: 4, background: 'var(--red)', fontSize: 12, fontWeight: 700, color: 'var(--cream)'}}>Nejlevnější</span>;
}
