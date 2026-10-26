'use client';

import {type FormEvent, useState} from 'react';

type Status = 'idle' | 'sending' | 'ok' | 'error';

const input: React.CSSProperties = {
  height: 48,
  padding: '0 14px',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  border: '1px solid var(--line)',
  borderRadius: 8,
  color: 'var(--ink)',
  font: 'inherit',
};

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      setStatus(res.ok ? 'ok' : 'error');
      if (res.ok) e.currentTarget?.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <p role="status" style={{flex: '999 1 480px', margin: 0, padding: 24, background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 600}}>
        Díky, zpráva dorazila. Ozveme se na zadaný e-mail.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16}}>
      <fieldset style={{margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 8}}>
        <legend style={{padding: '0 0 8px', fontWeight: 600}}>Co potřebujete</legend>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px 24px'}}>
          {[
            ['fix', 'Opravit údaje'],
            ['feed', 'Poslat feed'],
            ['remove', 'Odstranit e-shop'],
          ].map(([v, l], i) => (
            <label key={v} style={{display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer'}}>
              <input type="radio" name="kind" value={v} defaultChecked={i === 0} style={{width: 18, height: 18, margin: 0, accentColor: '#8A1524'}} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 16}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          <label htmlFor="shop_url" style={{fontWeight: 600, fontSize: 15}}>
            Adresa e-shopu
          </label>
          <input id="shop_url" name="shop_url" type="text" inputMode="url" placeholder="https://" maxLength={300} style={input} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          <label htmlFor="email" style={{fontWeight: 600, fontSize: 15}}>
            Váš e-mail
          </label>
          <input id="email" name="email" type="email" required maxLength={254} style={input} />
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <label htmlFor="message" style={{fontWeight: 600, fontSize: 15}}>
          Zpráva
        </label>
        <textarea id="message" name="message" rows={4} maxLength={4000} placeholder="Odkaz na feed, nebo co je potřeba opravit" style={{...input, height: 'auto', padding: '12px 14px', resize: 'vertical'}} />
      </div>
      {/* Honeypot pro roboty – člověk ho nevidí. */}
      <div aria-hidden="true" style={{position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden'}}>
        <label>
          Firma
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p style={{margin: 0, fontSize: 13, color: 'var(--dim)'}}>E-mail použijeme jen k odpovědi na tuto zprávu.</p>
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16}}>
        <button type="submit" className="btn-red" disabled={status === 'sending'}>
          {status === 'sending' ? 'Odesílám…' : 'Odeslat'}
        </button>
        {status === 'error' ? (
          <span role="alert" style={{color: 'var(--red)', fontWeight: 600}}>
            Nepovedlo se odeslat. Zkuste to znovu, nebo napište e-mail.
          </span>
        ) : null}
      </div>
    </form>
  );
}
