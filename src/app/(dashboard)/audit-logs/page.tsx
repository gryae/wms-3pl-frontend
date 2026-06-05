'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Search, Eye, ShieldCheck, ShieldAlert, X, ClipboardList } from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  entityNo?: string | null;
  description: string;
  before?: any;
  after?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

export default function AuditLogsPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    api
      .get(`/audit-logs?page=${page}&limit=10&search=${encodeURIComponent(query)}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (!user?.sellerId) {
      fetchLogs();
    }
  }, [page, query]);

  const viewDetails = (item: AuditLogItem) => {
    setLoading(true);
    api
      .get(`/audit-logs/${item.id}`)
      .then((resp) => {
        setSelectedLog(resp.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  if (user?.sellerId) {
    return (
      <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <span>Access Denied. Only 3PL Warehouse Operators can audit system logs.</span>
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 border border-red-500/20';
      case 'INVENTORY_CHANGE':
        return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
    }
  };

  const columns = [
    {
      header: 'Audit Action',
      accessor: (l: AuditLogItem) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getActionColor(l.action)}`}>
          {l.action}
        </span>
      ),
    },
    {
      header: 'Operator',
      accessor: (l: AuditLogItem) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white">{l.user?.name || 'System / Batch'}</span>
          <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{l.user?.email || '-'}</p>
        </div>
      ),
    },
    { header: 'Description', accessor: (l: AuditLogItem) => <span className="text-slate-600 dark:text-zinc-350">{l.description}</span> },
    {
      header: 'Change Date',
      accessor: (l: AuditLogItem) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('common.actions'),
      accessor: (l: AuditLogItem) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => viewDetails(l)}
            className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Delta</span>
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
            {t('menu.audit')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Audit system operations, tracking before/after payloads of products, orders, and adjustments.
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
        </div>
      </div>

      {/* Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane */}
        <div className="lg:col-span-8">
          <DataTable
            columns={columns}
            data={data}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Right Pane: Delta payloads */}
        <div className="lg:col-span-4">
          {selectedLog ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 max-h-[80vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedLog(null)}
                className="absolute right-4 top-4 p-1 rounded text-slate-450 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Payload Delta Logs</h4>
              <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 space-y-1">
                <p><span className="text-slate-450 font-bold uppercase text-[9px]">Entity:</span> {selectedLog.entity} ({selectedLog.entityNo || '-'})</p>
                <p><span className="text-slate-450 font-bold uppercase text-[9px]">IP address:</span> {selectedLog.ipAddress || 'Internal'}</p>
                <p className="truncate"><span className="text-slate-450 font-bold uppercase text-[9px]">Browser:</span> {selectedLog.userAgent || '-'}</p>
              </div>

              {/* BEFORE Record */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Record Before Update</span>
                <pre className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 rounded-lg text-[9px] font-mono text-slate-700 dark:text-zinc-400 overflow-x-auto">
                  {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : 'NULL'}
                </pre>
              </div>

              {/* AFTER Record */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500">Record After Update</span>
                <pre className="p-3 bg-indigo-500/5 dark:bg-zinc-950 border border-indigo-500/10 dark:border-zinc-850 rounded-lg text-[9px] font-mono text-indigo-700 dark:text-indigo-400 overflow-x-auto">
                  {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : 'NULL'}
                </pre>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2 h-48 shadow-sm">
              <ClipboardList className="w-8 h-8 text-slate-350" />
              <span>Select an entry on the left to review the precise DB before/after payload changes.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
