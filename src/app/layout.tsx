import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { WmsProvider } from '@/components/WmsProvider';

export const metadata: Metadata = {
  title: 'Enterprise 3PL WMS Portal',
  description: 'Production Warehouse Management System for 3PL providers & seller partners',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * {
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
        `}</style>
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50">
        <WmsProvider>
          {children}
        </WmsProvider>
      </body>
    </html>
  );
}
