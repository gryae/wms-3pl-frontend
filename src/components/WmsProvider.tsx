'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, usePathname } from 'next/navigation';

export function WmsProvider({ children }: { children: React.ReactNode }) {
  const { initPreferences, token, logout } = useWmsStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initPreferences();
    setMounted(true);
  }, [initPreferences]);

  useEffect(() => {
    if (!mounted) return;

    const publicRoutes = ['/login', '/forgot-password', '/reset-password'];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    if (!token && !isPublicRoute) {
      router.push('/login');
    } else if (token && isPublicRoute) {
      router.push('/dashboard');
    }
  }, [token, pathname, mounted, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-slate-900 dark:border-zinc-100 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-widest">LOADING 3PL PORTAL</p>
      </div>
    );
  }

  return <>{children}</>;
}
