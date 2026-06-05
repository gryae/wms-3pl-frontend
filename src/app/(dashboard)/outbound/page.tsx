'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye } from 'lucide-react';

interface OutboundHeader {
  id: string;
  outboundNo: string;
  type: string;
  status: string;
  recipientName: string;
  trackingNumber?: string;
  createdAt: string;
  seller: {
    name: string;
  };
  courier?: {
    name: string;
    code: string;
  };
  createdBy: {
    name: string;
  };
}

export default function OutboundPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<OutboundHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const fetchOutbounds = () => {
    const activeSellerFilter = user?.sellerId || '';
    api
      .get(`/outbounds?page=${page}&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchOutbounds();
  }, [page, query]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      case 'ALLOCATED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'PICKING':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20';
      case 'PACKING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'READY_TO_SHIP':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
      case 'SHIPPED':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
    }
  };

  const columns = [
    {
      header: 'Outbound Order No',
      accessor: (o: OutboundHeader) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{o.outboundNo}</span>
          {!user?.sellerId && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
              Seller: {o.seller.name}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Ekspedisi Kurir',
      accessor: (o: OutboundHeader) => (
        <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider text-slate-600 dark:text-zinc-400">
          {o.courier?.name || 'SELF PICKUP'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (o: OutboundHeader) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(o.status)}`}>
          {o.status}
        </span>
      ),
    },
    { header: 'Recipient', accessor: (o: OutboundHeader) => <span>{o.recipientName}</span> },
    { header: 'Tracking resi No', accessor: (o: OutboundHeader) => <span className="font-mono text-[10px] text-slate-500">{o.trackingNumber || '-'}</span> },
    {
      header: 'Created Date',
      accessor: (o: OutboundHeader) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(o.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: (o: OutboundHeader) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => router.push(`/outbound/${o.id}`)}
            className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
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
            {t('menu.outbound')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Dispatch, pick, pack, and release outbound partner orders.
          </p>
        </div>

        <div className="flex gap-3">
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

          {/* Place order (Seller owners only) */}
          {user?.sellerId && (
            <button
              onClick={() => router.push('/outbound/create')}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('outbound.create_btn')}</span>
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
    </div>
  );
}
