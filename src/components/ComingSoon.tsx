'use client';

import {type FormEvent, useState} from 'react';
import {Wrench, Scale, PackageSearch, Truck} from 'lucide-react';
import {siteConfig, CONSENT_TEXT} from '@/config';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 254) {
      setStatus('error');
      return;
    }

    setStatus('sending');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: trimmedEmail,
          company,
          source: 'coming-soon',
          consent_text: CONSENT_TEXT,
        }),
      });

      if (!response.ok) {
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#171310] text-[#F5EFE6] antialiased flex flex-col">
      <header className="px-6 pt-10 sm:pt-14">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 font-[Space_Grotesk] text-xl sm:text-2xl font-bold tracking-tight">
            <Wrench className="h-6 w-6 text-[#D4A017]" aria-hidden="true" />
            MotoDílomat<span className="text-[#D4A017]">.cz</span>
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-[Space_Grotesk] text-3xl sm:text-4xl font-bold leading-tight text-[#F5EFE6]">
            Srovnávač dílů pro dvoutakty z ČSSR
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#C9BEB0]">
            Díly na Jawu, ČZ, Babettu i Stadion ze všech e-shopů na jednom místě. Na jedno šlápnutí.
          </p>

          <ul className="mt-8 space-y-3 text-left">
            <li className="flex items-start gap-3 rounded-lg border border-[#3A322A] bg-[#211B16] p-4">
              <Scale className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" aria-hidden="true" />
              <span className="text-sm sm:text-base text-[#E7DFD2]">Srovnání cen napříč e-shopy</span>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-[#3A322A] bg-[#211B16] p-4">
              <PackageSearch className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" aria-hidden="true" />
              <span className="text-sm sm:text-base text-[#E7DFD2]">
                Párování podle originálních katalogových čísel
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-[#3A322A] bg-[#211B16] p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" aria-hidden="true" />
              <span className="text-sm sm:text-base text-[#E7DFD2]">
                Optimalizace košíku včetně poštovného
              </span>
            </li>
          </ul>

          <div className="mt-10 rounded-xl border border-[#8B1E1E]/40 bg-[#211B16] p-5 sm:p-6">
            {status === 'success' ? (
              <p className="text-base sm:text-lg font-semibold text-[#D4A017]">
                Děkujeme! Ozveme se, jakmile spustíme web.
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label htmlFor="email" className="sr-only">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vas@email.cz"
                    autoComplete="email"
                    className="w-full flex-1 rounded-lg border border-[#3A322A] bg-[#171310] px-4 py-3 text-[#F5EFE6] placeholder:text-[#8A8074] focus:border-[#D4A017] focus:outline-none focus:ring-1 focus:ring-[#D4A017]"
                  />
                  <div
                    className="absolute left-[-9999px] w-px h-px overflow-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <input
                      id="company"
                      name="company"
                      type="text"
                      aria-hidden="true"
                      tabIndex={-1}
                      autoComplete="off"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="shrink-0 rounded-lg bg-[#8B1E1E] px-5 py-3 font-semibold text-[#F5EFE6] transition-colors hover:bg-[#A22525] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === 'sending' ? 'Odesílám…' : 'Dejte mi vědět o spuštění'}
                  </button>
                </div>
                {status === 'error' && (
                  <p className="mt-3 text-sm text-[#E88989]">
                    Něco se nepovedlo. Zkontrolujte e-mail a zkuste to prosím znovu.
                  </p>
                )}
              </form>
            )}

            <p className="mt-4 text-xs text-[#8A8074]">
              {CONSENT_TEXT}{' '}
              <a
                href="/zasady-ochrany-osobnich-udaju.html"
                className="underline decoration-[#D4A017] underline-offset-2 hover:text-[#D4A017]"
              >
                Zásady ochrany osobních údajů
              </a>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-[#8A8074]">
        <p>
          Provozovatel: {siteConfig.firstName} {siteConfig.lastName} – kontakt: {siteConfig.contactEmail}
          {siteConfig.ico && `, IČO: ${siteConfig.ico}`}. Nekomerční projekt v přípravě.
        </p>
      </footer>
    </div>
  );
}
