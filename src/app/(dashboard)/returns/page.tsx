'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import { Search, Eye, Plus, ShieldAlert, X } from 'lucide-react';

interface ReturnHeader {
  id: string;
  returnNo: string;
  seller: {
    name: string;
  };
  reason: string;
  status: string;
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

export default function ReturnsPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<ReturnHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Create Return Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState(user?.sellerId || '');
  const [outboundId, setOutboundId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);

  // Item form states
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);

  const fetchReturns = () => {
    const activeSellerFilter = user?.sellerId || '';
    api
      .get(`/returns?page=${page}&limit=10&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
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
    fetchReturns();
  }, [page, query]);

  useEffect(() => {
    if (createOpen) {
      if (canViewSellers) {
        fetchSellers();
      } else if (user?.sellerId) {
        fetchProductsForSeller(user.sellerId);
      }
    }
  }, [createOpen]);

  useEffect(() => {
    if (selectedSellerId) {
      fetchProductsForSeller(selectedSellerId);
      setSelectedItems([]);
    }
  }, [selectedSellerId]);

  const handleAddItem = () => {
    if (!currentProductId || currentQty <= 0) return;
    // Check duplicate
    if (selectedItems.some((i) => i.productId === currentProductId)) {
      alert('Product already added');
      return;
    }
    setSelectedItems([...selectedItems, { productId: currentProductId, quantity: currentQty }]);
    setCurrentProductId('');
    setCurrentQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sId = user?.sellerId || selectedSellerId;
    if (!sId) {
      setError('Please select a seller');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      await api.post('/returns', {
        sellerId: sId,
        outboundId: outboundId || undefined,
        reason,
        notes: notes || undefined,
        items: selectedItems,
      });
      alert(t('common.success'));
      setCreateOpen(false);
      // Reset form
      setReason('');
      setNotes('');
      setOutboundId('');
      setSelectedItems([]);
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'INSPECTING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
    }
  };

  const columns = [
    {
      header: 'Return No',
      accessor: (r: ReturnHeader) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{r.returnNo}</span>
          {!user?.sellerId && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
              Seller: {r.seller.name}
            </p>
          )}
        </div>
      ),
    },
    {
      header: t('returns.reason'),
      accessor: (r: ReturnHeader) => (
        <span className="text-[10px] text-slate-700 dark:text-zinc-300 font-semibold">{r.reason}</span>
      ),
    },
    {
      header: t('common.status'),
      accessor: (r: ReturnHeader) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(r.status)}`}>
          {r.status}
        </span>
      ),
    },
    {
      header: t('common.created_at'),
      accessor: (r: ReturnHeader) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Filed By',
      accessor: (r: ReturnHeader) => <span className="text-slate-500">{r.createdBy.name}</span>,
    },
    {
      header: t('common.actions'),
      accessor: (r: ReturnHeader) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => router.push(`/returns/${r.id}`)}
            className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.returns')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Audit customer returns, perform physical inspections, and restock to available/damaged inventory pools.
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

          {/* File Return button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('returns.create_btn')}</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* File Return Drawer / Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">File Customer Return</h4>
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

              {/* Seller Selection (Supervisor/Admin only) */}
              {!user?.sellerId && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Seller Owner</label>
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
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Return</label>
                  <input
                    required
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Wrong size / Damaged on transit..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Linked Outbound ID (Optional)</label>
                  <input
                    type="text"
                    value={outboundId}
                    onChange={(e) => setOutboundId(e.target.value)}
                    placeholder="Outbound order CUID..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Internal Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Customer contacted support..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-14 resize-none"
                />
              </div>

              {/* Items Section */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Declared Items</h5>
                
                <div className="flex gap-2 mb-3">
                  <select
                    value={currentProductId}
                    onChange={(e) => setCurrentProductId(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select SKU...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none text-center"
                  />

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedItems.map((item, idx) => {
                    const match = products.find((p) => p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-150 dark:border-zinc-850 text-xs">
                        <span className="font-mono font-bold">{match?.sku || 'Item'}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">{item.quantity} units</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 font-extrabold text-[10px] uppercase"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                SUBMIT RETURN SLIP
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
