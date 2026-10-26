'use client';

import {useState} from 'react';

/**
 * Fotka nabídky načtená přímo ze serveru e-shopu (nekopírujeme ji k sobě a nejde
 * přes optimalizátor obrázků). Když se nenačte (shop blokuje cizí zobrazení,
 * nebo fotka chybí), ukáže se ikona.
 */
export default function Photo({
  src,
  alt,
  size,
  caption,
  rounded = 8,
  aspect,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  caption?: string;
  rounded?: number;
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box: React.CSSProperties = {
    flex: 'none',
    width: size ?? '100%',
    height: size ?? undefined,
    aspectRatio: size ? undefined : (aspect ?? '1'),
    boxSizing: 'border-box',
    border: '1px solid var(--line)',
    borderRadius: rounded,
    background: '#fff',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--dim)',
  };

  if (!src || failed) {
    return (
      <span style={{...box, flexDirection: 'column', gap: 4}} aria-hidden="true">
        <CameraIcon size={size && size < 80 ? 18 : 28} />
        {caption && !size ? <span style={{fontSize: 12}}>{caption}</span> : null}
      </span>
    );
  }

  return (
    <span style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fotka zůstává na serveru e-shopu */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{width: '100%', height: '100%', objectFit: 'contain'}}
      />
    </span>
  );
}

export function CameraIcon({size = 22}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
