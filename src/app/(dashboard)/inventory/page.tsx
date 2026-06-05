'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Search, RotateCcw } from 'lucide-react';

interface InventoryBalance {
  id: string;
  available: number;
  reserved: number;
  damaged: number;
  reject: number;
  product: {
    sku: string;
    name: string;
    unit: string;
  };
  seller: {
    name: string;
    code: string;
  };
}

interface SellerSummary {
  id: string;
  name: string;
  code: string;
}

export default function InventoryBalancesPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<InventoryBalance[]>([]);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');

  const canViewSellers = user?.role === 'WAREHOUSE_ADMIN' || user?.role === 'WAREHOUSE_SUPERVISOR';

  const fetchSellers = () => {
    if (!canViewSellers) return;
    api
      .get('/sellers?limit=100')
      .then((resp) => setSellers(resp.data.data.data || []))
      .catch((err) => console.error(err));
  };

  const fetchBalances = () => {
    const activeSellerFilter = user?.sellerId || selectedSeller;
    api
      .get(`/inventory/balances?page=${page}&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [page, query, selectedSeller]);

  const columns = [
    {
      header: 'SKU',
      accessor: (ib: InventoryBalance) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{ib.product.sku}</span>
          {!user?.sellerId && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
              Seller: {ib.seller.name}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Product Name', accessor: (ib: InventoryBalance) => <span>{ib.product.name}</span> },
    {
      header: 'Available Stock',
      accessor: (ib: InventoryBalance) => (
        <span className="font-extrabold text-slate-900 dark:text-white">
          {ib.available} {ib.product.unit}
        </span>
      ),
    },
    {
      header: 'Reserved Stock',
      accessor: (ib: InventoryBalance) => (
        <span className="text-slate-500">
          {ib.reserved} {ib.product.unit}
        </span>
      ),
    },
    {
      header: 'Damaged Stock',
      accessor: (ib: InventoryBalance) => (
        <span className="text-amber-600 dark:text-amber-400">
          {ib.damaged} {ib.product.unit}
        </span>
      ),
    },
    {
      header: 'Reject Scrap',
      accessor: (ib: InventoryBalance) => (
        <span className="text-red-500 font-bold">
          {ib.reject} {ib.product.unit}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.inventory')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Real-time warehouse physical stock channels balances.
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

          {/* Seller Filter (Admin/Supervisor only) */}
          {canViewSellers && (
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="">All Sellers</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name}
                </option>
              ))}
            </select>
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
    </div>
  );
}
