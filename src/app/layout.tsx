import type {Metadata} from 'next';
import './globals.css';

const TITLE = 'MotoDílomat.cz – Srovnávač dílů pro Jawa, ČZ a Babetta | Brzy spouštíme';
const DESCRIPTION =
  'MotoDílomat.cz – připravovaný nezávislý srovnávač náhradních dílů pro Jawu, ČZ, Babettu a Stadion. Zanechte nám e-mail a dáme vám vědět o spuštění.';
const URL = 'https://motodilomat.cz/';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {canonical: URL},
  icons: {icon: '/favicon.svg'},
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'MotoDílomat',
    locale: 'cs_CZ',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MotoDílomat',
  url: URL,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="cs">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- single-page site, root layout is the intended place */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      </head>
      <body className="antialiased selection:bg-[#8B1E1E] selection:text-white">{children}</body>
    </html>
  );
}
