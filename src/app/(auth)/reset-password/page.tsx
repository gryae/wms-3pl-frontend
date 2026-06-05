'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { api } from '@/services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Key, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const { t } = useWmsStore();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('auth.reset_title')}
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
          {t('auth.reset_subtitle')}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Password Reset Successful</h3>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                Your credentials have been securely updated in the corporate vault. You can now log back in with your new password.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span>PROCEED TO LOGIN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 tracking-wider uppercase mb-1.5">
              {t('auth.token')}
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow font-mono text-xs"
              placeholder="Security token hash"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 tracking-wider uppercase mb-1.5">
              {t('auth.new_password')}
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-300 dark:disabled:bg-zinc-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 tracking-wide transition-colors shadow-md mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Key className="w-4 h-4" />
                <span>{t('auth.save_new_password')}</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
