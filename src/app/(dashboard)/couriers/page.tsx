'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Search, Plus, ShieldAlert, X, Edit, Trash2 } from 'lucide-react';

interface CourierItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export default function CouriersPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<CourierItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchCouriers = () => {
    api
      .get(`/couriers?page=${page}&limit=10&search=${encodeURIComponent(query)}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCouriers();
  }, [page, query]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name,
      code: code.toUpperCase(),
      isActive,
    };

    try {
      if (editId) {
        await api.put(`/couriers/${editId}`, payload);
      } else {
        await api.post('/couriers', payload);
      }
      alert(t('common.success'));
      setFormOpen(false);
      resetForm();
      fetchCouriers();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setCode('');
    setIsActive(true);
  };

  const handleEdit = (item: CourierItem) => {
    setEditId(item.id);
    setName(item.name);
    setCode(item.code);
    setIsActive(item.isActive);
    setFormOpen(true);
  };

  const handleDelete = async (item: CourierItem) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/couriers/${item.id}`);
      alert(t('common.success'));
      fetchCouriers();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete courier.');
    }
  };

  const getStatusBadge = (active: boolean) => {
    return active
      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
      : 'bg-red-500/10 text-red-600 border border-red-500/20';
  };

  const columns = [
    {
      header: 'Courier Code',
      accessor: (c: CourierItem) => (
        <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">
          {c.code}
        </span>
      ),
    },
    {
      header: 'Provider Brand Name',
      accessor: (c: CourierItem) => <span className="text-slate-800 dark:text-zinc-200 font-bold">{c.name}</span>,
    },
    {
      header: 'Status',
      accessor: (c: CourierItem) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(c.isActive)}`}>
          {c.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: t('common.created_at'),
      accessor: (c: CourierItem) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: t('common.actions'),
      accessor: (c: CourierItem) => {
        // Only WMS manage can write couriers
        const canManage = !user?.sellerId;
        if (!canManage) return null;
        
        return (
          <div className="flex gap-1 justify-end shrink-0">
            <button
              onClick={() => handleEdit(c)}
              className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(c)}
              className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.couriers')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Configure courier brands integration status and identify airwaybill validation parameters.
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

          {/* Add button */}
          {!user?.sellerId && (
            <button
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Courier</span>
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

      {/* Courier Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {editId ? 'Modify Courier Details' : 'Register Courier Brand'}
              </h4>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Courier Code</label>
                <input
                  required
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="JNE / JNT / SICEPAT..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Brand Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="J&T Express..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Courier Status</label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="true">Active Integration</option>
                  <option value="false">Deactivated</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                SAVE COURIER BRAND
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
