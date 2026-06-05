'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Plus, Search, ShieldAlert, X, Check } from 'lucide-react';

interface Seller {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function SellersPage() {
  const { t } = useWmsStore();
  const [data, setData] = useState<Seller[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [openModal, setOpenModal] = useState(false);
  
  // Form fields
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSellers = () => {
    api
      .get(`/sellers?page=${page}&search=${encodeURIComponent(query)}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchSellers();
  }, [page, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { code, name, address, phone, email, status };

    try {
      if (sellerId) {
        await api.put(`/sellers/${sellerId}`, payload);
      } else {
        await api.post('/sellers', payload);
      }
      setOpenModal(false);
      resetForm();
      fetchSellers();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (seller: Seller) => {
    setSellerId(seller.id);
    setCode(seller.code);
    setName(seller.name);
    setAddress(seller.address || '');
    setPhone(seller.phone || '');
    setEmail(seller.email || '');
    setStatus(seller.status);
    setOpenModal(true);
  };

  const handleDelete = async (seller: Seller) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/sellers/${seller.id}`);
      fetchSellers();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setSellerId(null);
    setCode('');
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setStatus('ACTIVE');
    setError(null);
  };

  const columns = [
    { header: 'Seller Code', accessor: (s: Seller) => <span className="font-bold text-slate-900 dark:text-white">{s.code}</span> },
    { header: 'Name', accessor: (s: Seller) => <span>{s.name}</span> },
    { header: 'Email', accessor: (s: Seller) => <span className="text-slate-400">{s.email || '-'}</span> },
    { header: 'Phone', accessor: (s: Seller) => <span>{s.phone || '-'}</span> },
    {
      header: 'Status',
      accessor: (s: Seller) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
          s.status === 'ACTIVE'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
        }`}>
          {s.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.sellers')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Register and isolate sellers accounts directories physically.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-shadow"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>
          <button
            onClick={() => {
              resetForm();
              setOpenModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Slide Modal Drawer */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {sellerId ? 'Modify Seller profile' : 'Register Seller partner'}
              </h3>
              <button
                onClick={() => setOpenModal(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Seller Code</label>
                <input
                  type="text"
                  required
                  disabled={!!sellerId}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="SEL-BRAND"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seller Brand Inc"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@seller.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Seller headquarters address..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold h-20 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
