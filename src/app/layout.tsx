import type { Metadata } from 'next';
import { Syne } from 'next/font/google';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

export const metadata: Metadata = {
  title: 'Aurora Forecast | Nordlys Tromsø',
  description: 'Live aurora forecast and interactive map for Northern Norway',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className={`${syne.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
