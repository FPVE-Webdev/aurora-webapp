'use client';

import { Syne } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TemperatureProvider } from '@/contexts/TemperatureContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { DevModeProvider } from '@/contexts/DevModeContext';
import { AdminLink } from '@/components/shared/AdminLink';
import './globals.css';
import { useState } from 'react';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  }));

  return (
    <html lang="no">
      <body className={`${syne.variable} font-sans antialiased bg-arctic-900`}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <TemperatureProvider>
              <DevModeProvider>
                <PremiumProvider>
                  {children}
                  <AdminLink />
                  <Toaster
                    position="top-right"
                    theme="dark"
                    toastOptions={{
                      style: {
                        background: 'rgb(15, 17, 24)',
                        border: '1px solid rgba(255, 255, 255, 0:1)',
                        color: 'white',
                      },
                    }}
                  />
                </PremiumProvider>
              </DevModeProvider>
            </TemperatureProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
