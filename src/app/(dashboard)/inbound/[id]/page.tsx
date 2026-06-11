'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, ClipboardCheck, Play, ShieldAlert, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InboundItem {
  id: string;
  productId: string;
  expectedQty: number;
  receivedQty: number;
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

interface InboundDetails {
  id: string;
  inboundNo: string;
  type: string;
  status: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
  cancelReason?: string;
  seller: {
    name: string;
    code: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  receivedBy?: {
    name: string;
  };
  items: InboundItem[];
  timelines: TimelineEvent[];
}

export default function InboundDetailsPage() {
  const { t, user } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [inbound, setInbound] = useState<InboundDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'timeline'>('items');
  const router = useRouter();

  // Quantities input state
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [rejectQtys, setRejectQtys] = useState<Record<string, number>>({});

  // Cancel dialog state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchInboundDetails = () => {
    setLoading(true);
    api
      .get(`/inbounds/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setInbound(details);
        
        // Populate inputs
        const initialReceived: Record<string, number> = {};
        const initialReject: Record<string, number> = {};
        details.items.forEach((item: InboundItem) => {
          initialReceived[item.productId] = item.receivedQty;
          initialReject[item.productId] = item.rejectQty;
        });
        setReceivedQtys(initialReceived);
        setRejectQtys(initialReject);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInboundDetails();
  }, [id]);

  const handleQtyChange = (productId: string, field: 'received' | 'reject', value: number) => {
    if (field === 'received') {
      setReceivedQtys({ ...receivedQtys, [productId]: value });
    } else {
      setRejectQtys({ ...rejectQtys, [productId]: value });
    }
  };

  const handleAction = async (action: 'submit' | 'start' | 'save_receives' | 'complete' | 'cancel') => {
    setError(null);
    try {
      if (action === 'submit') {
        await api.post(`/inbounds/${id}/submit`);
      } else if (action === 'start') {
        await api.post(`/inbounds/${id}/start`);
      } else if (action === 'save_receives') {
        const itemsPayload = inbound.items.map((item) => ({
          productId: item.productId,
          receivedQty: receivedQtys[item.productId] || 0,
          rejectQty: rejectQtys[item.productId] || 0,
        }));
        await api.post(`/inbounds/${id}/receive`, { items: itemsPayload });
        alert(t('common.success'));
      } else if (action === 'complete') {
        // Frontend validation: at least one item must have recorded qty
        const hasAnyQty = inbound.items.some(
          (item) => (receivedQtys[item.productId] || 0) > 0 || (rejectQtys[item.productId] || 0) > 0
        );
        if (!hasAnyQty) {
          setError('Tidak bisa finalize: isi receivedQty atau rejectQty minimal untuk satu item sebelum menyelesaikan inbound.');
          return;
        }
        await api.post(`/inbounds/${id}/complete`);
      } else if (action === 'cancel') {
        if (!cancelReason) {
          setError('Please provide a cancellation reason');
          return;
        }
        await api.post(`/inbounds/${id}/cancel`, { reason: cancelReason });
        setCancelOpen(false);
      }
      fetchInboundDetails();
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

  if (!inbound) return null;

  const isWmsUser = !user?.sellerId;
  const showReceiveInputs = inbound.status === 'RECEIVING' && isWmsUser;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/inbound')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {inbound.inboundNo}
          </h2>
          <p className="text-xs text-slate-500">
            Created Date: {new Date(inbound.createdAt).toLocaleDateString()} | Seller partner: {inbound.seller.name}
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
        
        {/* Left Side Details / Items list */}
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
              Operation Timeline
            </button>
          </div>

          {activeTab === 'items' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Product Description</th>
                    <th className="pb-2 text-center">Expected Qty</th>
                    <th className="pb-2 text-center">Received Good</th>
                    <th className="pb-2 text-center">Received Bad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {inbound.items.map((item) => (
                    <tr key={item.id} className="text-slate-700 dark:text-zinc-300">
                      <td className="py-3 font-mono text-[10px] text-slate-900 dark:text-white uppercase">{item.product.sku}</td>
                      <td className="py-3">{item.product.name}</td>
                      <td className="py-3 text-center">{item.expectedQty} {item.product.unit}</td>
                      
                      {/* Received Qty */}
                      <td className="py-3 text-center">
                        {showReceiveInputs ? (
                          <input
                            type="number"
                            min="0"
                            value={receivedQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, 'received', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <span>{item.receivedQty} {item.product.unit}</span>
                        )}
                      </td>

                      {/* Reject Qty */}
                      <td className="py-3 text-center">
                        {showReceiveInputs ? (
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

              {/* Physical check save bar */}
              {showReceiveInputs && (
                <button
                  onClick={() => handleAction('save_receives')}
                  className="w-full py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 mt-4 flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Physical Count Sheets</span>
                </button>
              )}
            </div>
          ) : (
            // TIMELINE COMPONENT
            <div className="relative pl-6 border-l border-slate-200 dark:border-zinc-800 space-y-6 py-2">
              {inbound.timelines.map((evt) => (
                <div key={evt.id} className="relative">
                  {/* node dot */}
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
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Inbound parameters</h4>
            
            {/* Status indicators */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{inbound.status}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Ref PO:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{inbound.referenceNo || '-'}</span>
            </div>

            {inbound.cancelReason && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-medium text-red-600 dark:text-red-400 leading-normal">
                <p className="font-bold uppercase tracking-wider mb-0.5">Cancellation Reason:</p>
                {inbound.cancelReason}
              </div>
            )}
          </div>

          {/* Action buttons matching lifecycle transitions */}
          <div className="space-y-2">
            {/* 1. Seller draft submit */}
            {inbound.status === 'DRAFT' && (
              <button
                onClick={() => handleAction('submit')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Submit to Warehouse</span>
              </button>
            )}

            {/* 2. Warehouse supervisor start receiving */}
            {inbound.status === 'SUBMITTED' && isWmsUser && (
              <button
                onClick={() => handleAction('start')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start physical receiving</span>
              </button>
            )}

            {/* 3. Warehouse finalize completion receipt */}
            {inbound.status === 'RECEIVING' && isWmsUser && (
              <button
                onClick={() => handleAction('complete')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Finalize Receipt & Restock</span>
              </button>
            )}

            {/* 4. Cancellation triggers */}
            {inbound.status !== 'COMPLETED' && inbound.status !== 'CANCELLED' && (
              <button
                onClick={() => setCancelOpen(true)}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel shipment</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Cancel dialog box overlay */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Cancel shipment</h4>
              <button onClick={() => setCancelOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-800 dark:text-amber-400 font-semibold leading-normal">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Cancelling this inbound cannot be undone.</span>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Cancellation</label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Carrier lost shipment / PO updated..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold h-20 focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={() => handleAction('cancel')}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                CONFIRM CANCELLATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
