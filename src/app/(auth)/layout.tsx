'use strict';
'use client';

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      {/* Visual Mesh Left side */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#0f172a_0%,transparent_50%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#312e81_0%,transparent_50%)]"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-bounce duration-10000"></div>

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-white/10">3P</div>
          <span className="font-extrabold text-white text-base tracking-widest uppercase">WMS Enterprise</span>
        </div>

        {/* Main Banner Text */}
        <div className="relative z-10 my-auto max-w-xl">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Seamless Warehouse Logistics, <br />
            <span className="text-indigo-400">Intelligent Stock Control.</span>
          </h1>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Manage multiple seller partners, dynamic ledger accounts, picking queues, and courier manifests through a secure, high-fidelity corporate command center.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © 2026 3PL Logistics Inc. All rights reserved. Version 1.2.0-Prod.
        </div>
      </div>

      {/* Main Form Right side */}
      <div className="lg:col-span-5 flex flex-col justify-center bg-slate-50 dark:bg-zinc-950 p-8 sm:p-12 md:p-16 relative">
        <div className="absolute top-6 right-6 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-slate-950 dark:bg-white flex items-center justify-center font-extrabold text-white dark:text-slate-950 text-sm shadow-md">3P</div>
        </div>
        <div className="max-w-md w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
