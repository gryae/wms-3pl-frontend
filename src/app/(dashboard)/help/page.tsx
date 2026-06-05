'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { Search, Plus, ShieldAlert, X, BookOpen, ChevronRight, Edit, Trash2 } from 'lucide-react';

interface HelpCategory {
  id: string;
  nameEn: string;
  nameId: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  titleEn: string;
  titleId: string;
  contentEn: string;
  contentId: string;
  pageRoute?: string | null;
  slug: string;
  categoryId: string;
  category?: {
    nameEn: string;
    nameId: string;
  };
}

export default function HelpCenterPage() {
  const { t, language, user } = useWmsStore();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState('');
  const [titleId, setTitleId] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentId, setContentId] = useState('');
  const [pageRoute, setPageRoute] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const fetchCategoriesAndArticles = () => {
    setLoading(true);
    // Categories and articles
    api
      .get('/help-center/categories')
      .then((resp) => {
        setCategories(resp.data.data || []);
      })
      .catch((err) => console.error(err));

    api
      .get(`/help-center/articles?q=${encodeURIComponent(query)}`)
      .then((resp) => {
        setArticles(resp.data.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategoriesAndArticles();
  }, [query]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      titleEn,
      titleId,
      contentEn,
      contentId,
      pageRoute: pageRoute || undefined,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      categoryId,
    };

    try {
      if (editId) {
        await api.put(`/help-center/articles/${editId}`, payload);
      } else {
        await api.post('/help-center/articles', payload);
      }
      alert(t('common.success'));
      setFormOpen(false);
      resetForm();
      fetchCategoriesAndArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitleEn('');
    setTitleId('');
    setContentEn('');
    setContentId('');
    setPageRoute('');
    setSlug('');
    setCategoryId('');
  };

  const handleEdit = (item: HelpArticle) => {
    setEditId(item.id);
    setTitleEn(item.titleEn);
    setTitleId(item.titleId);
    setContentEn(item.contentEn);
    setContentId(item.contentId);
    setPageRoute(item.pageRoute || '');
    setSlug(item.slug);
    setCategoryId(item.categoryId);
    setFormOpen(true);
  };

  const handleDelete = async (item: HelpArticle) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/help-center/articles/${item.id}`);
      alert(t('common.success'));
      if (selectedArticle?.id === item.id) setSelectedArticle(null);
      fetchCategoriesAndArticles();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete help article.');
    }
  };

  const isWmsAdmin = user?.role === 'WAREHOUSE_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            {t('common.help')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Read contextual help articles or configure new bilingual articles associated with route directories.
          </p>
        </div>

        <div className="flex gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Add Article button (Admin only) */}
          {isWmsAdmin && (
            <button
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Article</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Categories List & Articles */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-5 max-h-[80vh] overflow-y-auto">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Knowledge Base</h3>
          
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none">
                  {language === 'EN' ? cat.nameEn : cat.nameId}
                </span>

                <div className="pl-2 border-l border-slate-100 dark:border-zinc-800 space-y-1">
                  {cat.articles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArticle(art)}
                      className={`flex justify-between items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors text-xs font-semibold ${
                        selectedArticle?.id === art.id
                          ? 'bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white'
                          : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      <span className="truncate">{language === 'EN' ? art.titleEn : art.titleId}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  ))}
                  {cat.articles.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic pl-2">No articles in this group.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Article Details */}
        <div className="lg:col-span-8">
          {selectedArticle ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {language === 'EN' ? selectedArticle.titleEn : selectedArticle.titleId}
                  </h3>
                  {selectedArticle.pageRoute && (
                    <span className="inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 tracking-wider mt-1.5">
                      Contextual Path: {selectedArticle.pageRoute}
                    </span>
                  )}
                </div>

                {isWmsAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(selectedArticle)}
                      className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedArticle)}
                      className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bilingual content display */}
              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-medium whitespace-pre-wrap">
                {language === 'EN' ? selectedArticle.contentEn : selectedArticle.contentId}
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2 h-64 shadow-sm">
              <BookOpen className="w-8 h-8 text-slate-350" />
              <span>Select an article from the left catalog to read operational guidelines or configure contextual tutorials.</span>
            </div>
          )}
        </div>

      </div>

      {/* Article Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {editId ? 'Modify Help Article' : 'Create Help Article'}
              </h4>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category Group</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nameEn} ({cat.nameId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contextual Route Path (Optional)</label>
                  <input
                    type="text"
                    value={pageRoute}
                    onChange={(e) => setPageRoute(e.target.value)}
                    placeholder="/inbound /outbound /picking..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Article URL Slug</label>
                  <input
                    required
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="how-to-pick-orders..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Title Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title (English)</label>
                  <input
                    required
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="How to process inbounds..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title (Bahasa Indonesia)</label>
                  <input
                    required
                    type="text"
                    value={titleId}
                    onChange={(e) => setTitleId(e.target.value)}
                    placeholder="Cara memproses inbound..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Content Fields */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Content (English)</label>
                <textarea
                  required
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  placeholder="Step 1: Check expected quantity..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-28 resize-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Content (Bahasa Indonesia)</label>
                <textarea
                  required
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                  placeholder="Langkah 1: Periksa kuantitas tertera..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-28 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                SAVE ARTICLE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
