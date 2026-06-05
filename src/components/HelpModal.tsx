'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { usePathname } from 'next/navigation';
import { HelpCircle, X, Search, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';

interface HelpArticle {
  id: string;
  slug: string;
  titleEn: string;
  titleId: string;
  contentEn: string;
  contentId: string;
  page?: string;
  tags: string[];
}

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useWmsStore();
  const pathname = usePathname();
  const [contextArticle, setContextArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // Fetch contextual help associated with current path
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setShowCatalog(false);
    setSearchQuery('');
    setSearchResults([]);

    api
      .get(`/help-center/context?page=${encodeURIComponent(pathname)}`)
      .then((resp) => {
        setContextArticle(resp.data.data);
      })
      .catch((err) => {
        console.error('Failed fetching contextual help', err);
        setContextArticle(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, pathname]);

  // Handle help article searching
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const resp = await api.get(`/help-center/articles?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(resp.data.data);
        setShowCatalog(true);
      } catch (err) {
        console.error('Search help failed', err);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  if (!open) return null;

  const isEn = language === 'EN';
  const activeArticle = contextArticle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('common.help')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles, workflow, FAQ, status meanings..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs text-slate-400">Loading guide...</p>
            </div>
          ) : showCatalog || !activeArticle ? (
            // LIST ALL GUIDES / SEARCH RESULTS
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  {searchQuery ? 'Search Results' : 'General Help Center Articles'}
                </h4>
                {activeArticle && (
                  <button
                    onClick={() => setShowCatalog(false)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Go Back to Context Guide
                  </button>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => {
                        setContextArticle(art);
                        setShowCatalog(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/30 flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {isEn ? art.titleEn : art.titleId}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Tags: {art.tags.join(', ')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                    No articles found matching search term
                  </p>
                </div>
              )}
            </div>
          ) : (
            // CONTEXTUAL HELP DISPLAY
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEn ? activeArticle.titleEn : activeArticle.titleId}
                  </h4>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mt-1">
                    Context Guide: {pathname}
                  </p>
                </div>
                <button
                  onClick={() => setShowCatalog(true)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-950 dark:hover:text-white underline shrink-0"
                >
                  Browse all guides
                </button>
              </div>

              {/* Render article body */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-lg border border-slate-100 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium space-y-4">
                <div
                  className="prose dark:prose-invert max-w-none prose-xs font-medium"
                  dangerouslySetInnerHTML={{
                    __html: isEn ? activeArticle.contentEn : activeArticle.contentId,
                  }}
                />
              </div>

              {/* simulated structure guide details if missing custom details in content */}
              <div className="border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-3 bg-white dark:bg-zinc-900">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Important Tips & Troubleshooting</span>
                </h5>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-zinc-400 leading-normal font-medium">
                  <li>Keep SKU and barcode tags clear. Discrepancy variance will require physical stock adjustments.</li>
                  <li>Verify shipping courier manifest limits before assigning shipments. Duplicate open manifests are blocked.</li>
                  <li>Inbound receiving quantities physically checked must not exceed initial expected declarations.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
          <span>Enterprise Support Center Portal</span>
          <span>Bilingual EN/ID enabled</span>
        </div>

      </div>
    </div>
  );
}
