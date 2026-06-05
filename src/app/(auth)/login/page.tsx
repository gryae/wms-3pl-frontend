'use strict';
'use client';

import React, { useState } from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Globe, ShieldAlert, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { t, language, setLanguage, setAuth } = useWmsStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resp = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = resp.data.data;
      setAuth(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'ID' : 'EN');
  };

  return (
    <div className="space-y-6">
      {/* Header Language switch row */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('auth.login_title')}
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
            {t('auth.login_subtitle')}
          </p>
        </div>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language}</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 tracking-wider uppercase mb-1.5">
            {t('auth.email')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
            placeholder="admin@wms.local"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 tracking-wider uppercase">
              {t('auth.password')}
            </label>
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('auth.forgot_password')}
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-300 dark:disabled:bg-zinc-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 tracking-wide transition-colors shadow-md mt-6"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>{t('auth.sign_in')}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
