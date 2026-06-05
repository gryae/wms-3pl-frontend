'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Play, ShieldAlert, AlertTriangle, ShieldCheck, Barcode } from 'lucide-react';

interface ReturnItem {
  id: string;
  productId: string;
  quantity: number;
  goodQty: number;
  damagedQty: number;
  rejectQty: number;
  product: {
    sku: string;
    name: string;
    unit: string;
  };
}

interface TimelineEvent {
  id: string;
  action: string;
  notes?: string;
  createdAt: string;
  userName?: string;
}

interface ReturnDetails {
  id: string;
  returnNo: string;
  reason: string;
  status: string;
  notes?: string;
  createdAt: string;
  seller: {
    name: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  inspectedBy?: {
    name: string;
  } | null;
  items: ReturnItem[];
  timelines: TimelineEvent[];
}

export default function ReturnDetailsPage() {
  const { t, user } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [retObj, setRetObj] = useState<ReturnDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'timeline'>('items');
  const router = useRouter();

  // Inspect state
  const [goodQtys, setGoodQtys] = useState<Record<string, number>>({});
  const [damagedQtys, setDamagedQtys] = useState<Record<string, number>>({});
  const [rejectQtys, setRejectQtys] = useState<Record<string, number>>({});

  const fetchReturnDetails = () => {
    setLoading(true);
    api
      .get(`/returns/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setRetObj(details);

        // Populate inspect states
        const initialGood: Record<string, number> = {};
        const initialDamaged: Record<string, number> = {};
        const initialReject: Record<string, number> = {};
        
        details.items.forEach((item: ReturnItem) => {
          initialGood[item.productId] = item.goodQty || 0;
          initialDamaged[item.productId] = item.damagedQty || 0;
          initialReject[item.productId] = item.rejectQty || 0;
        });

        setGoodQtys(initialGood);
        setDamagedQtys(initialDamaged);
        setRejectQtys(initialReject);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReturnDetails();
  }, [id]);

  const handleQtyChange = (productId: string, field: 'good' | 'damaged' | 'reject', value: number) => {
    const val = Math.max(0, value);
    if (field === 'good') {
      setGoodQtys({ ...goodQtys, [productId]: val });
    } else if (field === 'damaged') {
      setDamagedQtys({ ...damagedQtys, [productId]: val });
    } else {
      setRejectQtys({ ...rejectQtys, [productId]: val });
    }
  };

  const handleAction = async (action: 'start' | 'inspect') => {
    setError(null);
    try {
      if (action === 'start') {
        await api.post(`/returns/${id}/start`);
        alert('QC Quality Control inspection log started.');
      } else if (action === 'inspect') {
        // Validate each item: sum must equal declared return qty
        for (const item of retObj.items) {
          const g = goodQtys[item.productId] ?? 0;
          const d = damagedQtys[item.productId] ?? 0;
          const r = rejectQtys[item.productId] ?? 0;
          if (g + d + r !== item.quantity) {
            setError(`Physical Qty Mismatch for SKU: ${item.product.sku}. Physical sum (${g + d + r}) must equal expected total return quantity (${item.quantity})`);
            return;
          }
        }

        const itemsPayload = retObj.items.map((item) => ({
          productId: item.productId,
          goodQty: goodQtys[item.productId] ?? 0,
          damagedQty: damagedQtys[item.productId] ?? 0,
          rejectQty: rejectQtys[item.productId] ?? 0,
        }));

        await api.post(`/returns/${id}/inspect`, { items: itemsPayload });
        alert(t('common.success'));
      }
      fetchReturnDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!retObj) return null;

  const isWmsUser = !user?.sellerId;
  const showInspectInputs = retObj.status === 'INSPECTING' && isWmsUser;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/returns')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {retObj.returnNo}
          </h2>
          <p className="text-xs text-slate-500">
            Filed Date: {new Date(retObj.createdAt).toLocaleDateString()} | Seller: {retObj.seller.name}
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
        
        {/* Left Side: Items Inspection / Timeline */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex border-b border-slate-100 dark:border-zinc-800 pb-2 gap-4">
            <button
              onClick={() => setActiveTab('items')}
              className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all ${
                activeTab === 'items'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
              Declares items Summary
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all ${
                activeTab === 'timeline'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
              QC Timeline logs
            </button>
          </div>

          {activeTab === 'items' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Declared Qty</th>
                    <th className="pb-2 text-center">Passed Good</th>
                    <th className="pb-2 text-center">Damaged</th>
                    <th className="pb-2 text-center">Scrap Reject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {retObj.items.map((item) => (
                    <tr key={item.id} className="text-slate-700 dark:text-zinc-300">
                      <td className="py-3 font-mono text-[10px] text-slate-900 dark:text-white uppercase flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        {item.product.sku}
                      </td>
                      <td className="py-3">{item.product.name}</td>
                      <td className="py-3 text-center">{item.quantity} {item.product.unit}</td>
                      
                      {/* Good Qty */}
                      <td className="py-3 text-center">
                        {showInspectInputs ? (
                          <input
                            type="number"
                            min="0"
                            value={goodQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, 'good', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{item.goodQty} {item.product.unit}</span>
                        )}
                      </td>

                      {/* Damaged Qty */}
                      <td className="py-3 text-center">
                        {showInspectInputs ? (
                          <input
                            type="number"
                            min="0"
                            value={damagedQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, 'damaged', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <span className="text-amber-500 font-bold">{item.damagedQty} {item.product.unit}</span>
                        )}
                      </td>

                      {/* Reject Qty */}
                      <td className="py-3 text-center">
                        {showInspectInputs ? (
                          <input
                            type="number"
                            min="0"
                            value={rejectQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, 'reject', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <span className="text-red-500 font-bold">{item.rejectQty} {item.product.unit}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // TIMELINE COMPONENT
            <div className="relative pl-6 border-l border-slate-200 dark:border-zinc-800 space-y-6 py-2">
              {retObj.timelines.map((evt) => (
                <div key={evt.id} className="relative">
                  <span className="absolute -left-[30px] top-0.5 w-4.5 h-4.5 rounded-full border-2 border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white"></span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{evt.action}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{evt.notes}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Logged by: {evt.userName || 'System'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Workflow States & Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Return Parameters</h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{retObj.status}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Reason:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{retObj.reason}</span>
            </div>

            {retObj.notes && (
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                <p className="font-bold uppercase tracking-wider mb-0.5">Notes:</p>
                {retObj.notes}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Start inspect */}
            {retObj.status === 'SUBMITTED' && isWmsUser && (
              <button
                onClick={() => handleAction('start')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start QC Inspection</span>
              </button>
            )}

            {/* Complete physically restocked */}
            {retObj.status === 'INSPECTING' && isWmsUser && (
              <button
                onClick={() => handleAction('inspect')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Finalize QC & Restock</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
