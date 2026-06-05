'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Play, ShieldAlert, Package, Printer, FileText } from 'lucide-react';

interface PackTaskItem {
  id: string;
  productId: string;
  quantity: number;
  packedQty: number;
  notes?: string | null;
}

interface OutboundItem {
  productId: string;
  product: {
    sku: string;
    name: string;
    unit: string;
  };
}

interface PackTaskDetails {
  id: string;
  outboundId: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  boxCount?: number | null;
  weight?: string | number | null;
  notes?: string | null;
  assignee?: {
    name: string;
  } | null;
  outbound: {
    outboundNo: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity?: string | null;
    recipientProvince?: string | null;
    recipientPostcode?: string | null;
    courier?: {
      name: string;
    } | null;
    seller: {
      name: string;
    };
    items: OutboundItem[];
  };
  items: PackTaskItem[];
}

export default function PackingDetailsPage() {
  const { t } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [task, setTask] = useState<PackTaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Inputs
  const [packedQtys, setPackedQtys] = useState<Record<string, number>>({});
  const [boxCount, setBoxCount] = useState(1);
  const [weight, setWeight] = useState(0.5);
  const [packNotes, setPackNotes] = useState('');

  const fetchTaskDetails = () => {
    setLoading(true);
    api
      .get(`/packing/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setTask(details);

        // Populate inputs
        const initialPacked: Record<string, number> = {};
        details.items.forEach((item: PackTaskItem) => {
          initialPacked[item.productId] = item.packedQty || item.quantity;
        });
        setPackedQtys(initialPacked);
        if (details.boxCount) setBoxCount(details.boxCount);
        if (details.weight) setWeight(Number(details.weight));
        if (details.notes) setPackNotes(details.notes);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleQtyChange = (productId: string, value: number, max: number) => {
    const validVal = Math.max(0, Math.min(max, value));
    setPackedQtys({ ...packedQtys, [productId]: validVal });
  };

  const handleAction = async (action: 'start' | 'confirm') => {
    setError(null);
    try {
      if (action === 'start') {
        await api.post(`/packing/${id}/start`);
        alert('Packing boxes timer started.');
      } else if (action === 'confirm') {
        const itemsPayload = task.items.map((item) => ({
          productId: item.productId,
          packedQty: packedQtys[item.productId] ?? 0,
        }));
        await api.post(`/packing/${id}/confirm`, {
          boxCount,
          weight,
          notes: packNotes,
          items: itemsPayload,
        });
        alert(t('common.success'));
      }
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handlePrintLabel = async () => {
    if (!task) return;
    try {
      const response = await api.get(`/shipping-label/${task.outboundId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${task.outbound.outboundNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate shipping label PDF.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!task) return null;

  const showInputs = task.status === 'IN_PROGRESS';

  const getProductDetails = (productId: string) => {
    const match = task.outbound.items.find((item) => item.productId === productId);
    return match?.product || { sku: 'UNKNOWN', name: 'Unknown SKU', unit: 'pcs' };
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/packing')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Packer Terminal — {task.outbound.outboundNo}
          </h2>
          <p className="text-xs text-slate-500">
            Assigned Packer: {task.assignee?.name || 'Unassigned'} | Seller Owner: {task.outbound.seller.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Items checklist */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Packaging Verification Checklist</h3>
            
            <div className="space-y-4">
              {task.items.map((item) => {
                const prod = getProductDetails(item.productId);
                
                return (
                  <div key={item.id} className="p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-1">
                      <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                        {prod.sku}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">{prod.name}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Picked Good</p>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{item.quantity} {prod.unit}</p>
                      </div>

                      <div className="w-24">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 text-center">Verified Packed</p>
                        {showInputs ? (
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={packedQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, Number(e.target.value), item.quantity)}
                            className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-bold focus:outline-none"
                          />
                        ) : (
                          <p className="text-sm font-extrabold text-center mt-1 text-emerald-500">
                            {item.packedQty} {prod.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Package specifications & AWB triggers */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recipient Details</h4>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <p><span className="text-slate-400">Name:</span> {task.outbound.recipientName}</p>
              <p><span className="text-slate-400">Phone:</span> {task.outbound.recipientPhone}</p>
              <p className="leading-relaxed"><span className="text-slate-400">Address:</span> {task.outbound.recipientAddress}, {task.outbound.recipientCity}, {task.outbound.recipientProvince} {task.outbound.recipientPostcode}</p>
              <p><span className="text-slate-400">Courier:</span> <span className="uppercase text-indigo-500 font-extrabold">{task.outbound.courier?.name || 'SELF PICKUP'}</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Package Parameters</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Box Count Used</label>
                {showInputs ? (
                  <input
                    type="number"
                    min="1"
                    value={boxCount}
                    onChange={(e) => setBoxCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{task.boxCount || 1} Box(es)</p>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Physical Weight (kg)</label>
                {showInputs ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{task.weight || 0.0} kg</p>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes / Discrepancies</label>
                {showInputs ? (
                  <textarea
                    value={packNotes}
                    onChange={(e) => setPackNotes(e.target.value)}
                    placeholder="Fragile / Bubble wrapped..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-14 resize-none"
                  />
                ) : (
                  <p className="text-xs font-medium text-slate-500 leading-normal">{task.notes || '-'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {/* Start packing button */}
            {task.status === 'PENDING' && (
              <button
                onClick={() => handleAction('start')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start Packaging Process</span>
              </button>
            )}

            {/* Confirm packing button */}
            {task.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleAction('confirm')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Complete Packaging</span>
              </button>
            )}

            {/* AWB Label print triggers */}
            {task.status === 'COMPLETED' && (
              <button
                onClick={handlePrintLabel}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Download Shipping Label PDF</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
