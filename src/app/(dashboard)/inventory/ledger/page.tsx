'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Search } from 'lucide-react';

interface Movement {
  id: string;
  movementType: string;
  quantity: number;
  fromStatus?: string;
  toStatus?: string;
  referenceType?: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
  product: {
    sku: string;
    name: string;
  };
  seller: {
    name: string;
  };
}

export default function StockLedgerPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<Movement[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');

  const fetchMovements = () => {
    const activeSellerFilter = user?.sellerId || '';
    api
      .get(`/inventory/movements?page=${page}&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchMovements();
  }, [page, query]);

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'INBOUND':
      case 'RETURN':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'OUTBOUND':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'RESERVATION':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'RELEASE':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
    }
  };

  const columns = [
    {
      header: 'Date & Time',
      accessor: (m: Movement) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(m.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'SKU',
      accessor: (m: Movement) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{m.product.sku}</span>
          {!user?.sellerId && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
              Seller: {m.seller.name}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Product Name', accessor: (m: Movement) => <span>{m.product.name}</span> },
    {
      header: 'Ledger Action',
      accessor: (m: Movement) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getMovementBadgeColor(m.movementType)}`}>
          {m.movementType}
        </span>
      ),
    },
    {
      header: 'Qty',
      accessor: (m: Movement) => (
        <span className="font-extrabold text-slate-900 dark:text-white">
          {m.quantity}
        </span>
      ),
    },
    {
      header: 'Delta States',
      accessor: (m: Movement) => (
        <span className="text-[10px] text-slate-400 font-bold">
          {m.fromStatus || 'NULL'} → {m.toStatus || 'NULL'}
        </span>
      ),
    },
    {
      header: 'Reference',
      accessor: (m: Movement) => (
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-white">{m.referenceNo || '-'}</span>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{m.referenceType || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Remarks',
      accessor: (m: Movement) => <span className="text-slate-400 italic line-clamp-1">{m.notes || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.ledger')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Immutable transaction ledger auditing stock movements.
          </p>
        </div>

        <div>
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
