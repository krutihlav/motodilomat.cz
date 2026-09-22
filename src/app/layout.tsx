import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MotoDílomat.cz',
  description: 'Srovnávač cen náhradních dílů pro dvoutakty z ČSSR.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
