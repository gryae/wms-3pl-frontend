'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Play, ShieldAlert, X, AlertTriangle, FileDown, Truck, Package, Clock } from 'lucide-react';

interface OutboundItem {
  id: string;
  productId: string;
  quantity: number;
  pickedQty: number;
  packedQty: number;
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

interface OutboundDetails {
  id: string;
  outboundNo: string;
  type: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientProvince?: string;
  recipientPostcode?: string;
  trackingNumber?: string;
  shippingCost?: number;
  codAmount?: number;
  notes?: string;
  createdAt: string;
  cancelReason?: string;
  seller: {
    name: string;
  };
  courier?: {
    name: string;
  };
  createdBy: {
    name: string;
  };
  items: OutboundItem[];
  timelines: TimelineEvent[];
}

export default function OutboundDetailsPage() {
  const { t, user } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [outbound, setOutbound] = useState<OutboundDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'timeline'>('items');
  const router = useRouter();

  // Ship order resi state
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Cancel state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOutboundDetails = () => {
    setLoading(true);
    api
      .get(`/outbounds/${id}`)
      .then((resp) => {
        setOutbound(resp.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOutboundDetails();
  }, [id]);

  const handleAction = async (action: 'submit' | 'ship' | 'complete' | 'cancel') => {
    setError(null);
    try {
      if (action === 'submit') {
        await api.post(`/outbounds/${id}/submit`);
      } else if (action === 'ship') {
        if (!trackingNumber) {
          setError('Tracking airwaybill number is required');
          return;
        }
        await api.post(`/outbounds/${id}/ship`, { trackingNumber });
        setShipOpen(false);
      } else if (action === 'complete') {
        await api.post(`/outbounds/${id}/complete`);
      } else if (action === 'cancel') {
        if (!cancelReason) {
          setError('Cancellation reason is required');
          return;
        }
        await api.post(`/outbounds/${id}/cancel`, { reason: cancelReason });
        setCancelOpen(false);
      }
      fetchOutboundDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleDownloadLabel = async () => {
    if (!outbound) return;
    try {
      const response = await api.get(`/shipping-label/${id}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${outbound.outboundNo}.pdf`;
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

  if (!outbound) return null;

  const isWmsUser = !user?.sellerId;
  const showLabelButton = ['READY_TO_SHIP', 'SHIPPED', 'COMPLETED'].includes(outbound.status);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/outbound')}
            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {outbound.outboundNo}
            </h2>
            <p className="text-xs text-slate-500">
              Seller Partner: {outbound.seller.name} | Courier: {outbound.courier?.name || 'SELF PICKUP'}
            </p>
          </div>
        </div>

        {/* Download shipping label */}
        {showLabelButton && (
          <button
            onClick={handleDownloadLabel}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Shipping Label</span>
          </button>
        )}
      </div>

      {/* Visual Status Pipeline */}
      {(() => {
        const getPipelineStep = (status: string) => {
          if (['DRAFT', 'SUBMITTED'].includes(status)) return 0;
          if (['ALLOCATED', 'PICKING', 'PACKING'].includes(status)) return 1;
          if (['READY_TO_SHIP'].includes(status)) return 2;
          if (['SHIPPED', 'COMPLETED'].includes(status)) return 3;
          return -1; // CANCELLED
        };

        const currentStep = getPipelineStep(outbound.status);
        const steps = [
          { label: 'Pending', desc: 'Order submitted' },
          { label: 'Processing', desc: 'Picking & Packing' },
          { label: 'Ready to Ship', desc: 'Package sealed' },
          { label: 'Dispatched', desc: 'Sent via courier' }
        ];

        if (currentStep === -1) return null;

        return (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="relative flex justify-between items-center max-w-xl mx-auto">
              {/* Connecting progress lines */}
              <div className="absolute left-4 right-4 top-[14px] h-0.5 bg-slate-100 dark:bg-zinc-850 z-0">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>

              {steps.map((step, idx) => {
                const active = idx <= currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7.5 h-7.5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCurrent
                          ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-900 text-white shadow-lg shadow-indigo-600/30'
                          : active
                          ? 'bg-indigo-500 border-indigo-100 dark:border-indigo-850 text-white'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 text-slate-400'
                      }`}
                      style={{ width: '28px', height: '28px' }}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[9px] font-bold mt-2 uppercase tracking-wider ${
                        isCurrent
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : active
                          ? 'text-slate-800 dark:text-zinc-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Items & timeline */}
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
              Order items lists
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all ${
                activeTab === 'timeline'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
              Order timelines
            </button>
          </div>

          {activeTab === 'items' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Product Description</th>
                    <th className="pb-2 text-center">Qty Ordered</th>
                    <th className="pb-2 text-center">Qty Picked</th>
                    <th className="pb-2 text-center">Qty Packed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {outbound.items.map((item) => (
                    <tr key={item.id} className="text-slate-700 dark:text-zinc-300">
                      <td className="py-3 font-mono text-[10px] text-slate-900 dark:text-white uppercase">{item.product.sku}</td>
                      <td className="py-3">{item.product.name}</td>
                      <td className="py-3 text-center">{item.quantity} {item.product.unit}</td>
                      <td className="py-3 text-center text-indigo-500 font-bold">{item.pickedQty} {item.product.unit}</td>
                      <td className="py-3 text-center text-emerald-500 font-bold">{item.packedQty} {item.product.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // TIMELINE COMPONENT
            <div className="relative pl-6 border-l border-slate-200 dark:border-zinc-800 space-y-6 py-2">
              {outbound.timelines.map((evt) => (
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
                    <p className="text-[10px] text-slate-500 mt-0.5">{evt.notes}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Logged by: {evt.userName || 'System'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: details and workflow actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Shipping parameters</h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{outbound.status}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Recipient Name:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{outbound.recipientName}</span>
            </div>

            <div className="flex justify-between items-start text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-4">Address:</span>
              <span className="font-medium text-slate-600 dark:text-zinc-400 text-right leading-relaxed">
                {outbound.recipientAddress}, {outbound.recipientCity}, {outbound.recipientProvince} {outbound.recipientPostcode}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tracking resi No:</span>
              <span className="font-mono text-slate-800 dark:text-zinc-200">{outbound.trackingNumber || 'PENDING'}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">COD Billing:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                Rp {outbound.codAmount ? Number(outbound.codAmount).toLocaleString('id-ID') : '0'}
              </span>
            </div>

            {outbound.cancelReason && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-medium text-red-600 dark:text-red-400 leading-normal">
                <p className="font-bold uppercase tracking-wider mb-0.5">Cancellation Reason:</p>
                {outbound.cancelReason}
              </div>
            )}
          </div>

          {/* Action buttons matching outbound lifecycle transitions */}
          <div className="space-y-2">
            {/* 1. Seller draft submit & reserve */}
            {outbound.status === 'DRAFT' && (
              <button
                onClick={() => handleAction('submit')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Submit & Reserve Stock</span>
              </button>
            )}

            {/* 2. Dispatch carrier handover tracking resi */}
            {outbound.status === 'READY_TO_SHIP' && isWmsUser && (
              <button
                onClick={() => setShipOpen(true)}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch Ship Order</span>
              </button>
            )}

            {/* 3. WMS/Seller complete delivery mark */}
            {outbound.status === 'SHIPPED' && (
              <button
                onClick={() => handleAction('complete')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Mark Delivered / Complete</span>
              </button>
            )}

            {/* 4. Cancellation triggers */}
            {!['SHIPPED', 'COMPLETED', 'CANCELLED'].includes(outbound.status) && (
              <button
                onClick={() => setCancelOpen(true)}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Dispatch Ship Resi Dialog */}
      {shipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Ship Dispatch Handover</h4>
              <button onClick={() => setShipOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Courier Tracking Airwaybill (Resi)</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="JT12993881"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleAction('ship')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-lg transition-colors"
              >
                DISPATCH DISPATCH ORDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel dialog box overlay */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Cancel Order</h4>
              <button onClick={() => setCancelOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-800 dark:text-amber-400 font-semibold leading-normal">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Order cancellation will release allocated reserved stock back to available warehouse pool automatically.</span>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Cancellation</label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Customer request / stock discrepancy..."
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
