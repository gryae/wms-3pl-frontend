'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowUpRight, Box, Inbox, PlayCircle, ClipboardList, HelpCircle } from 'lucide-react';
import { useWmsStore } from '@/store/useWmsStore';

interface SearchResult {
  id: string;
  type: 'PRODUCT' | 'INBOUND' | 'OUTBOUND' | 'RETURN' | 'MANIFEST' | 'SELLER';
  title: string;
  subtitle: string;
  link: string;
}

export function GlobalSearch() {
  const { t } = useWmsStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(resp.data.data);
        setOpen(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleResultClick = (link: string) => {
    setOpen(false);
    setQuery('');
    router.push(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PRODUCT': return Box;
      case 'INBOUND': return Inbox;
      case 'OUTBOUND': return ArrowUpRight;
      case 'RETURN': return PlayCircle;
      case 'MANIFEST': return ClipboardList;
      default: return HelpCircle;
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('common.search')}
          className="w-full pl-9 pr-9 py-2 text-xs font-semibold bg-slate-100 dark:bg-zinc-900 border-0 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50 glass">
          <div className="p-2 space-y-1">
            {results.map((r, idx) => {
              const Icon = getIcon(r.type);
              return (
                <button
                  key={idx}
                  onClick={() => handleResultClick(r.link)}
                  className="w-full text-left flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-950 transition-colors shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {r.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      {r.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl p-4 text-center z-50 glass">
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
            {t('common.no_data')}
          </p>
        </div>
      )}
    </div>
  );
}
