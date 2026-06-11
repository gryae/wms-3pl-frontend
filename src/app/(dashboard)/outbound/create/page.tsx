'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, Send, Upload, FileSpreadsheet, X, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductSummary {
  id: string;
  sku: string;
  name: string;
}

interface CourierSummary {
  id: string;
  name: string;
  code: string;
}

interface BulkRow {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientProvince?: string;
  recipientPostcode?: string;
  courierCode?: string;
  awbNo?: string;
  sku: string;
  qty: number;
  notes?: string;
}

export default function CreateOutboundPage() {
  const { t, user } = useWmsStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);

  // Recipient info
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientProvince, setRecipientProvince] = useState('');
  const [recipientPostcode, setRecipientPostcode] = useState('');
  const [courierId, setCourierId] = useState('');
  const [codAmount, setCodAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [sellerAwbNo, setSellerAwbNo] = useState('');

  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Bulk XLS state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    if (!user?.sellerId) return;

    api
      .get(`/products?limit=200&sellerId=${user.sellerId}`)
      .then((resp) => setProducts(resp.data.data.data || []))
      .catch((err) => console.error(err));

    api
      .get('/couriers?limit=50')
      .then((resp) => setCouriers(resp.data.data.data || []))
      .catch((err) => console.error(err));
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setItems(nextItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      setError('Please add at least one product SKU to the order');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create draft
      const resp = await api.post('/outbounds', {
        sellerId: user?.sellerId,
        recipientName,
        recipientPhone,
        recipientAddress,
        recipientCity: recipientCity || undefined,
        recipientProvince: recipientProvince || undefined,
        recipientPostcode: recipientPostcode || undefined,
        courierId: courierId || undefined,
        codAmount: Number(codAmount) || undefined,
        notes: notes || undefined,
        sellerAwbNo: sellerAwbNo || undefined,
        items: validItems,
      });

      const outboundId = resp.data.data.id;

      // Step 2: Auto-submit & reserve stock immediately
      await api.post(`/outbounds/${outboundId}/submit`);

      router.push(`/outbound/${outboundId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // ---- Bulk XLS Upload Logic ----
  const handleXlsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const workbook = XLSX.read(ev.target?.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const rows: BulkRow[] = json
          .filter((r) => r['Recipient Name'] || r['recipientName'])
          .map((r) => ({
            recipientName: r['Recipient Name'] || r['recipientName'] || '',
            recipientPhone: String(r['Phone'] || r['recipientPhone'] || ''),
            recipientAddress: r['Address'] || r['recipientAddress'] || '',
            recipientCity: r['City'] || r['recipientCity'] || '',
            recipientProvince: r['Province'] || r['recipientProvince'] || '',
            recipientPostcode: String(r['Postcode'] || r['recipientPostcode'] || ''),
            courierCode: r['Courier'] || r['courierCode'] || '',
            awbNo: String(r['AWB No'] || r['awbNo'] || ''),
            sku: r['SKU'] || r['sku'] || '',
            qty: Number(r['Qty'] || r['qty'] || 1),
            notes: r['Notes'] || r['notes'] || '',
          }));

        if (rows.length === 0) {
          setBulkError('No valid rows found. Check column headers: Recipient Name, Phone, Address, SKU, Qty');
          return;
        }
        setBulkRows(rows);
        setBulkOpen(true);
      } catch (err) {
        setBulkError('Failed to parse Excel file. Make sure format is correct.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const handleBulkSubmit = async () => {
    setBulkLoading(true);
    setBulkError(null);
    setBulkProgress(0);
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      try {
        // Find product by SKU
        const product = products.find((p) => p.sku.toLowerCase() === row.sku.toLowerCase());
        if (!product) {
          errors.push(`Row ${i + 1}: SKU "${row.sku}" not found`);
          continue;
        }

        // Find courier by code (optional)
        const courier = row.courierCode
          ? couriers.find((c) => c.code.toLowerCase() === row.courierCode!.toLowerCase())
          : null;

        // Create outbound
        const resp = await api.post('/outbounds', {
          sellerId: user?.sellerId,
          recipientName: row.recipientName,
          recipientPhone: row.recipientPhone,
          recipientAddress: row.recipientAddress,
          recipientCity: row.recipientCity || undefined,
          recipientProvince: row.recipientProvince || undefined,
          recipientPostcode: row.recipientPostcode || undefined,
          courierId: courier?.id || undefined,
          sellerAwbNo: row.awbNo || undefined,
          notes: row.notes || undefined,
          items: [{ productId: product.id, quantity: row.qty }],
        });

        // Auto-submit
        await api.post(`/outbounds/${resp.data.data.id}/submit`);
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${row.sku}): ${err.response?.data?.message || err.message}`);
      }
      setBulkProgress(Math.round(((i + 1) / bulkRows.length) * 100));
    }

    setBulkLoading(false);
    if (errors.length > 0) {
      setBulkError(`${successCount} submitted, ${errors.length} failed:\n${errors.slice(0, 5).join('\n')}`);
    } else {
      setBulkOpen(false);
      setBulkRows([]);
      router.push('/outbound');
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Recipient Name': 'Contoh Nama',
        'Phone': '08123456789',
        'Address': 'Jl. Merdeka No. 1',
        'City': 'Jakarta Barat',
        'Province': 'DKI Jakarta',
        'Postcode': '11610',
        'Courier': 'JNE',
        'AWB No': 'JT001234567',
        'SKU': 'SKU-001',
        'Qty': 2,
        'Notes': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outbound Orders');
    XLSX.writeFile(wb, 'outbound_bulk_template.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/outbound')}
            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create Outbound Order
            </h2>
            <p className="text-xs text-slate-500">Order langsung submit & reserve stock setelah disimpan.</p>
          </div>
        </div>

        {/* Bulk Upload XLS button */}
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Upload XLS</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsFile} />
          </label>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Download Template</span>
          </button>
        </div>
      </div>

      {bulkError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-400 rounded-lg whitespace-pre-line">
          {bulkError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Recipient info */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Recipient Customer Information</h3>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Indah Permata"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recipient Phone</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recipient Address</label>
            <textarea
              required
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Full address (Street, RT/RW, Sub-district)..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold h-20 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">City</label>
              <input
                type="text"
                value={recipientCity}
                onChange={(e) => setRecipientCity(e.target.value)}
                placeholder="Jakarta Barat"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Province</label>
              <input
                type="text"
                value={recipientProvince}
                onChange={(e) => setRecipientProvince(e.target.value)}
                placeholder="DKI Jakarta"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Postal Code</label>
              <input
                type="text"
                value={recipientPostcode}
                onChange={(e) => setRecipientPostcode(e.target.value)}
                placeholder="11610"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* AWB No. Seller */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              AWB No. / Resi Seller
              <span className="ml-1 normal-case font-normal text-slate-300">(Opsional — gudang isi saat shipping jika kosong)</span>
            </label>
            <input
              type="text"
              value={sellerAwbNo}
              onChange={(e) => setSellerAwbNo(e.target.value)}
              placeholder="JT12993881 / JNTKB001..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Right Side: Products + Courier & submit */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Order items summary</h4>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select SKU</label>
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="">Select SKU...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-16">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-center focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length === 1}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-1.5 bg-slate-50 dark:bg-zinc-800 border border-dashed border-slate-200 dark:border-zinc-700 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add SKU row</span>
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Courier & Billing</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ekspedisi Courier</label>
                <select
                  value={courierId}
                  onChange={(e) => setCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="">Select Courier...</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">COD Billing Amount</label>
                <input
                  type="number"
                  value={codAmount}
                  onChange={(e) => setCodAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remarks Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery details..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold h-16 focus:outline-none resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Outbound Order</span>
              </>
            )}
          </button>
          <p className="text-[9px] text-slate-400 text-center font-semibold">
            Order akan langsung disubmit dan stock direservasi otomatis.
          </p>
        </div>
      </form>

      {/* Bulk Preview Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Bulk Upload Preview — {bulkRows.length} orders
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Review sebelum submit semua</p>
              </div>
              <button onClick={() => { setBulkOpen(false); setBulkRows([]); }} className="p-1 rounded text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-4">
              {bulkError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2 whitespace-pre-line">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bulkError}</span>
                </div>
              )}
              <table className="w-full text-left text-[10px] font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-[9px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Address</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2">Courier</th>
                    <th className="pb-2">AWB No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {bulkRows.map((row, i) => (
                    <tr key={i} className="text-slate-700 dark:text-zinc-300">
                      <td className="py-2 text-slate-400">{i + 1}</td>
                      <td className="py-2">
                        <p className="font-bold">{row.recipientName}</p>
                        <p className="text-slate-400">{row.recipientPhone}</p>
                      </td>
                      <td className="py-2 max-w-[150px] truncate">{row.recipientAddress}</td>
                      <td className="py-2 font-mono uppercase font-bold">{row.sku}</td>
                      <td className="py-2 text-center">{row.qty}</td>
                      <td className="py-2">{row.courierCode || '-'}</td>
                      <td className="py-2 font-mono">{row.awbNo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {bulkLoading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                    <span>Submitting orders...</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${bulkProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 shrink-0 flex gap-3">
              <button
                onClick={() => { setBulkOpen(false); setBulkRows([]); setBulkError(null); }}
                disabled={bulkLoading}
                className="flex-1 py-2.5 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkLoading || bulkRows.length === 0}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {bulkLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Submitting...</span></>
                ) : (
                  <><Send className="w-4 h-4" /><span>Submit {bulkRows.length} Orders</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
