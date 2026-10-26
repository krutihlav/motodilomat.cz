'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';

type Item =
  | {kind: 'model'; label: string; href: string; meta: string}
  | {kind: 'part'; label: string; href: string; meta: string; price: number; image: string | null};

const nf = new Intl.NumberFormat('cs-CZ');

/**
 * Vyhledávací pole s našeptávačem (modely a díly se srovnáním cen). Vkládá se do <form action="/hledat">;
 * rodič musí mít position: relative – nabídka se roztáhne na jeho šířku.
 */
export default function SearchBox({
  id,
  defaultValue,
  placeholder,
  fontSize = 15,
  required,
}: {
  id: string;
  defaultValue?: string;
  placeholder?: string;
  fontSize?: number;
  required?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setItems([]);
        return;
      }
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/naseptavac?q=${encodeURIComponent(q)}`, {signal: ctrl.signal});
        if (!res.ok) return;
        const data = (await res.json()) as {items: Item[]};
        setItems(data.items);
        setActive(-1);
      } catch {
        // přerušeno dalším psaním nebo bez sítě – nic
      }
    }, q.length < 2 ? 0 : 150);
    return () => clearTimeout(t);
  }, [value]);

  const show = open && items.length > 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(items[active].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <>
      <input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        required={required}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        style={{flex: 1, minWidth: 0, height: '100%', border: 0, outline: 0, background: 'transparent', color: 'var(--ink)', font: 'inherit', fontSize}}
      />
      {show ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 50,
            left: 0,
            right: 0,
            top: 'calc(100% + 6px)',
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(30, 22, 19, 0.18)',
            color: 'var(--ink)',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {items.map((it, i) => (
            <li
              key={it.href}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push(it.href);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                background: i === active ? 'var(--bg)' : 'transparent',
                fontSize: 15,
                lineHeight: 1.3,
              }}
            >
              {it.kind === 'part' ? (
                <span style={{flex: 'none', width: 40, height: 40, borderRadius: 6, border: '1px solid var(--line)', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- fotka zůstává na serveru e-shopu
                    <img src={it.image} alt="" loading="lazy" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                  ) : null}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="display"
                  style={{flex: 'none', width: 40, height: 40, borderRadius: 6, background: 'var(--red)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em'}}
                >
                  TYP
                </span>
              )}
              <span style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <span style={{fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{it.label}</span>
                <span style={{fontSize: 13, color: 'var(--dim)'}}>{it.kind === 'model' ? `Model · ${it.meta}` : `Srovnání cen · ${it.meta}`}</span>
              </span>
              {it.kind === 'part' ? (
                <span className="display" style={{fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap'}}>
                  od {nf.format(it.price)} Kč
                </span>
              ) : null}
            </li>
          ))}
          <li style={{padding: '8px 10px 4px', fontSize: 13, color: 'var(--dim)'}}>Enter = hledat ve všech nabídkách</li>
        </ul>
      ) : null}
    </>
  );
}
