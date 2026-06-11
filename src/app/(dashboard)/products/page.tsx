'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Plus, Search, ShieldAlert, X, Check, FileDown, FileUp, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  hpp: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
  sellerId: string;
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

export default function ProductsPage() {
  const { t, user } = useWmsStore();
  const [data, setData] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);

  // Form fields
  const [productId, setProductId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hpp, setHpp] = useState(0);
  const [weight, setWeight] = useState(0);
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Excel file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSellerId, setImportSellerId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewSellers = user?.role === 'WAREHOUSE_ADMIN' || user?.role === 'WAREHOUSE_SUPERVISOR';

  const fetchSellers = () => {
    if (!canViewSellers) return;
    api
      .get('/sellers?limit=100')
      .then((resp) => setSellers(resp.data.data.data || []))
      .catch((err) => console.error(err));
  };

  const fetchProducts = () => {
    const activeSellerFilter = user?.sellerId || selectedSeller;
    api
      .get(`/products?page=${page}&search=${encodeURIComponent(query)}&sellerId=${activeSellerFilter}`)
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
    fetchProducts();
  }, [page, query, selectedSeller]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const activeSellerId = user?.sellerId || sellerId;
    const payload = {
      sellerId: activeSellerId,
      sku,
      barcode: barcode || undefined,
      name,
      description: description || undefined,
      hpp: Number(hpp),
      weight: weight ? Number(weight) : undefined,
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      unit,
      status,
    };

    try {
      if (productId) {
        await api.put(`/products/${productId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setOpenModal(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Product) => {
    setProductId(p.id);
    setSellerId(p.sellerId);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setName(p.name);
    setDescription(p.description || '');
    setHpp(Number(p.hpp));
    setWeight(p.weight || 0);
    setLength(Number(p.length) || 0);
    setWidth(Number(p.width) || 0);
    setHeight(Number(p.height) || 0);
    setUnit(p.unit);
    setStatus(p.status);
    setOpenModal(true);
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/products/${p.id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const handleExportExcel = async () => {
    const activeSeller = user?.sellerId || selectedSeller;
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/products/export?sellerId=${activeSeller}`, '_blank');
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select an Excel sheet file');
      return;
    }

    setLoading(true);
    setError(null);
    setImportSuccess(null);

    const activeSellerId = user?.sellerId || importSellerId;
    if (!activeSellerId) {
      setError('Please select a seller for catalog import');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('sellerId', activeSellerId);

    try {
      const resp = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuccess(resp.data.data.message);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductId(null);
    setSellerId('');
    setSku('');
    setBarcode('');
    setName('');
    setDescription('');
    setHpp(0);
    setWeight(0);
    setLength(0);
    setWidth(0);
    setHeight(0);
    setUnit('pcs');
    setStatus('ACTIVE');
    setError(null);
  };

  const columns = [
    {
      header: 'SKU',
      accessor: (p: Product) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">{p.sku}</span>
          {!user?.sellerId && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">
              Seller: {p.seller.name}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Product Name', accessor: (p: Product) => <span>{p.name}</span> },
    { header: 'Barcode', accessor: (p: Product) => <span className="text-slate-400 font-mono text-[10px]">{p.barcode || '-'}</span> },
    {
      header: 'Cost Price (HPP)',
      accessor: (p: Product) => (
        <span>
          Rp {Number(p.hpp).toLocaleString('id-ID')}
        </span>
      ),
    },
    { header: 'Weight', accessor: (p: Product) => <span>{p.weight ? `${p.weight} kg` : '-'}</span> },
    {
      header: 'Dimensi (PxLxT)',
      accessor: (p: Product) => (
        <span className="text-[10px] font-mono">
          {(p.length || p.width || p.height)
            ? `${Number(p.length || 0).toFixed(0)}×${Number(p.width || 0).toFixed(0)}×${Number(p.height || 0).toFixed(0)} cm`
            : <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    { header: 'Unit', accessor: (p: Product) => <span>{p.unit}</span> },
    {
      header: 'Status',
      accessor: (p: Product) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
          p.status === 'ACTIVE'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
        }`}>
          {p.status}
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
            {t('menu.products')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Catalog inventory items registry list. Unique SKU codes per seller.
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Search bar */}
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

          {/* Seller Filter dropdown (WMS users only) */}
          {!user?.sellerId && (
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

          {/* Export catalog */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>

          {/* Import catalog */}
          <button
            onClick={() => {
              setImportSuccess(null);
              setError(null);
              setOpenImportModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileUp className="w-4 h-4 text-slate-500" />
            <span>Import</span>
          </button>

          {/* Add product SKU */}
          <button
            onClick={() => {
              resetForm();
              setOpenModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('products.add_btn')}</span>
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

      {/* Slide Modal SKU Register Form */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {productId ? 'Modify SKU Profile' : 'Register SKU catalog'}
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

              {/* Seller Owner selection dropdown (WMS Admin only) */}
              {!user?.sellerId && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Seller Owner Partner</label>
                  <select
                    required
                    disabled={!!productId}
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Seller Partner...</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unique SKU Code</label>
                <input
                  type="text"
                  required
                  disabled={!!productId}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="TSHIRT-BLK-L"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Universal Barcode (EAN)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="8991234567890"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Description Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cotton Short Sleeve T-Shirt Black L"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Price HPP (Rp)</label>
                  <input
                    type="number"
                    required
                    value={hpp}
                    onChange={(e) => setHpp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* Dimensions P x L x T */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dimensi Produk — Panjang × Lebar × Tinggi (cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Panjang (cm)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Lebar (cm)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Tinggi (cm)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center focus:outline-none"
                    />
                  </div>
                </div>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 mt-4"
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
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {openImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Import SKU Catalog
              </h3>
              <button
                onClick={() => setOpenImportModal(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportExcel} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{importSuccess}</span>
                </div>
              )}

              {/* Seller Owner selection (WMS only) */}
              {!user?.sellerId && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Seller Partner</label>
                  <select
                    required
                    value={importSellerId}
                    onChange={(e) => setImportSellerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Seller Partner...</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Excel Workbook File</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 focus:outline-none file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white dark:file:bg-white dark:file:text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FileUp className="w-4 h-4" />
                    <span>Upload & Parse Catalog</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
