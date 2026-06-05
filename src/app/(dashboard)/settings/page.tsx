'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { ShieldCheck, ShieldAlert, Save, RefreshCw } from 'lucide-react';

interface SettingItem {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { t, user } = useWmsStore();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = () => {
    setLoading(true);
    api
      .get('/settings')
      .then((resp) => {
        setSettings(resp.data.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.sellerId) {
      fetchSettings();
    }
  }, [user]);

  const handleValueChange = (key: string, value: string) => {
    setSettings(settings.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.put('/settings', { settings });
      alert(t('common.success'));
      fetchSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  if (user?.sellerId) {
    return (
      <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <span>Access Denied. Only 3PL Warehouse Admins can configure global system parameters.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            {t('menu.wms_configs')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Edit prefix boundaries, sequencing numbers, and general settings parameters.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm max-w-xl space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {settings.map((item) => (
              <div key={item.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pb-3.5 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">{item.key}</span>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Configuration parameter variable</p>
                </div>
                <input
                  required
                  type="text"
                  value={item.value}
                  onChange={(e) => handleValueChange(item.key, e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 transition-colors w-full"
          >
            <Save className="w-4 h-4" />
            <span>Save Global Configurations</span>
          </button>
        </form>
      )}
    </div>
  );
}
