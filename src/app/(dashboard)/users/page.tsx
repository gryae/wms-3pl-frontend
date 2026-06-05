'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Search, Plus, ShieldAlert, X, Edit, Trash2 } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  status: string;
  sellerId?: string | null;
  seller?: {
    name: string;
  } | null;
  createdAt: string;
}

interface SellerSummary {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { t, user: currentUser } = useWmsStore();
  const [data, setData] = useState<UserItem[]>([]);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('WAREHOUSE_ADMIN');
  const [status, setStatus] = useState('ACTIVE');
  const [sellerId, setSellerId] = useState('');

  const fetchUsers = () => {
    const activeSellerFilter = currentUser?.sellerId || '';
    api
      .get(`/users?page=${page}&limit=10&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  const canViewSellers = currentUser?.role === 'WAREHOUSE_ADMIN';

  const fetchSellers = () => {
    if (!canViewSellers) return;
    api.get('/sellers?limit=100').then((resp) => {
      setSellers(resp.data.data.data || []);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, [page, query]);

  useEffect(() => {
    if (formOpen && canViewSellers) {
      fetchSellers();
    }
  }, [formOpen]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sId = currentUser?.sellerId || sellerId;
    const payload: any = {
      email,
      name,
      phone: phone || undefined,
      role,
      status,
      sellerId: sId || null,
    };

    // Password required only for new users
    if (password) {
      payload.password = password;
    } else if (!editId) {
      setError('Password is required for new users');
      return;
    }

    try {
      if (editId) {
        await api.put(`/users/${editId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      alert(t('common.success'));
      setFormOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const resetForm = () => {
    setEditId(null);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setRole('WAREHOUSE_ADMIN');
    setStatus('ACTIVE');
    setSellerId('');
  };

  const handleEdit = (item: UserItem) => {
    setEditId(item.id);
    setEmail(item.email);
    setPassword('');
    setName(item.name);
    setPhone(item.phone || '');
    setRole(item.role);
    setStatus(item.status);
    setSellerId(item.sellerId || '');
    setFormOpen(true);
  };

  const handleDelete = async (item: UserItem) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/users/${item.id}`);
      alert(t('common.success'));
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'INACTIVE':
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
      default:
        return 'bg-red-500/10 text-red-600 border border-red-500/20';
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: (u: UserItem) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</span>
          <p className="text-[9px] text-slate-400 font-semibold">{u.email}</p>
        </div>
      ),
    },
    {
      header: 'System Role',
      accessor: (u: UserItem) => (
        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          {u.role}
        </span>
      ),
    },
    {
      header: 'Tenant Owner',
      accessor: (u: UserItem) => (
        <span className="text-slate-500">
          {u.seller?.name || (
            <span className="text-indigo-500 font-extrabold text-[9px] uppercase tracking-wider">3PL Warehouse</span>
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (u: UserItem) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(u.status)}`}>
          {u.status}
        </span>
      ),
    },
    {
      header: 'Phone',
      accessor: (u: UserItem) => <span className="text-slate-500">{u.phone || '-'}</span>,
    },
    {
      header: t('common.actions'),
      accessor: (u: UserItem) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => handleEdit(u)}
            className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(u)}
            className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
            {t('menu.users')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Administer warehouse personnel, picker/packer staff assignments, and seller client credentials.
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

          {/* Add User button */}
          <button
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
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

      {/* User Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {editId ? 'Modify User Profile' : 'Register New User'}
              </h4>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
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
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gerry Hasan..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gerry@3pl.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    {editId ? 'Password (Leave blank to keep)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="WAREHOUSE_ADMIN">Warehouse Admin</option>
                    <option value="SELLER">Seller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Seller Isolation field (Admin only, hidden if seller owner creating seller staff) */}
              {!currentUser?.sellerId && (role === 'SELLER') && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tenant Seller</label>
                  <select
                    required
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Seller Tenant...</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                SAVE PROFILE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
