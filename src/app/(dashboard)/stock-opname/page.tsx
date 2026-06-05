'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import { Search, Eye, Plus, ShieldAlert, X } from 'lucide-react';

interface OpnameHeader {
  id: string;
  opnameNo: string;
  sellerId: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  createdBy: {
    name: string;
  };
}

interface ProductSummary {
  id: string;
  sku: string;
  name: string;
}

interface SellerSummary {
  id: string;
  name: string;
}

export default function StockOpnamePage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<OpnameHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Create Opname modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [opnameNotes, setOpnameNotes] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const fetchOpnames = () => {
    const activeSellerFilter = user?.sellerId || '';
    api
      .get(`/stock-opnames?page=${page}&limit=10&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  const canViewSellers = user?.role === 'WAREHOUSE_ADMIN' || user?.role === 'WAREHOUSE_SUPERVISOR';

  const fetchSellers = () => {
    if (!canViewSellers) return;
    api.get('/sellers?limit=100').then((resp) => {
      setSellers(resp.data.data.data || []);
    });
  };

  const fetchProductsForSeller = (sellerId: string) => {
    if (!sellerId) return;
    api.get(`/products?sellerId=${sellerId}&limit=100`).then((resp) => {
      setProducts(resp.data.data.data || []);
    });
  };

  useEffect(() => {
    fetchOpnames();
  }, [page, query]);

  useEffect(() => {
    if (createOpen) {
      fetchSellers();
    }
  }, [createOpen]);

  useEffect(() => {
    if (selectedSellerId) {
      fetchProductsForSeller(selectedSellerId);
      setSelectedProductIds([]);
    }
  }, [selectedSellerId]);

  const toggleSelectProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSellerId) {
      setError('Please select a seller');
      return;
    }
    if (selectedProductIds.length === 0) {
      setError('Please select at least one product to count');
      return;
    }

    try {
      await api.post('/stock-opnames', {
        sellerId: selectedSellerId,
        notes: opnameNotes || undefined,
        productIds: selectedProductIds,
      });
      alert(t('common.success'));
      setCreateOpen(false);
      setOpnameNotes('');
      setSelectedSellerId('');
      setSelectedProductIds([]);
      fetchOpnames();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      case 'COUNTING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
    }
  };

  const columns = [
    {
      header: 'Opname Session No',
      accessor: (o: OpnameHeader) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{o.opnameNo}</span>
        </div>
      ),
    },
    {
      header: t('common.status'),
      accessor: (o: OpnameHeader) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(o.status)}`}>
          {o.status}
        </span>
      ),
    },
    {
      header: t('common.created_at'),
      accessor: (o: OpnameHeader) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(o.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Created By',
      accessor: (o: OpnameHeader) => <span className="text-slate-500">{o.createdBy.name}</span>,
    },
    {
      header: t('common.actions'),
      accessor: (o: OpnameHeader) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => router.push(`/stock-opname/${o.id}`)}
            className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Terminal</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.opname')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Schedule physical inventory audits and count sessions to resolve system stock variances automatically.
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

          {/* Schedule button */}
          {!user?.sellerId && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('opname.create_btn')}</span>
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Schedule Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Schedule Opname Session</h4>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Seller Partner</label>
                <select
                  required
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="">Select Seller...</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Session Description (Optional)</label>
                <textarea
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  placeholder="Monthly physical stock auditZone Zone B..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-14 resize-none"
                />
              </div>

              {/* Product Checklist */}
              {selectedSellerId && (
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Target SKU Checklist</h5>
                    <button
                      type="button"
                      onClick={toggleSelectAllProducts}
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase"
                    >
                      {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-150 dark:border-zinc-850 rounded-lg p-2.5 bg-slate-50 dark:bg-zinc-950">
                    {products.length > 0 ? (
                      products.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => toggleSelectProduct(p.id)}
                          className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded border border-slate-150 dark:border-zinc-800 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => {}} // handled by click div
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono font-bold">{p.sku}</span>
                          <span className="text-slate-500 truncate">- {p.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-[10px] text-slate-400 py-3">No active products found for seller.</p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                SCHEDULE AUDIT SESSION
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
