'use strict';
'use client';

import React, { useState } from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useWmsStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const resp = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      if (resp.data.data?.resetTokenForDev) {
        setDevToken(resp.data.data.resetTokenForDev);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to login */}
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO SIGN IN</span>
      </button>

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('auth.forgot_password')}
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
          Enter your email address and we will generate a secure reset link.
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
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Security Email Simulating</h3>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed">
                If the account exists, a secure password reset link was sent. For development ease, you can reset using the button below.
              </p>
            </div>
          </div>

          {devToken && (
            <div className="p-3.5 bg-slate-100 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Development Sandbox Bypass</p>
              <p className="text-xs font-mono break-all text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded border border-slate-200 dark:border-zinc-800">
                {devToken}
              </p>
              <button
                onClick={() => router.push(`/reset-password?token=${devToken}`)}
                className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded hover:bg-indigo-700 transition-colors"
              >
                PROCEED TO RESET PAGE
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-300 dark:disabled:bg-zinc-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 tracking-wide transition-colors shadow-md mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>GENERATE RESET LINK</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
