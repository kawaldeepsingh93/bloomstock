import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-newsreader' });

export const metadata: Metadata = {
  title: 'BloomStock — NSE Research Terminal',
  description: 'Institutional swing-trading research for NSE and BSE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
