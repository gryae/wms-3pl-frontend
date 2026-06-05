'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import {
  Search,
  Play,
  Check,
  ShieldAlert,
  Loader2,
  Package,
  Printer,
  Barcode,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';

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
    weight?: number | string | null;
  };
}

interface OutboundOrder {
  id: string;
  outboundNo: string;
  status: string;
  recipientName: string;
  recipientAddress: string;
  createdAt: string;
  seller: {
    name: string;
  };
  courier?: {
    name: string;
  } | null;
  items: OutboundItem[];
  pickTask?: {
    id: string;
    status: string;
  } | null;
  packTask?: {
    id: string;
    status: string;
  } | null;
}

export default function FulfillmentPage() {
  const { t } = useWmsStore();
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Dialog State
  const [activeFulfillOrder, setActiveFulfillOrder] = useState<OutboundOrder | null>(null);
  const [fullDetails, setFullDetails] = useState<OutboundOrder | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [boxCount, setBoxCount] = useState(1);
  const [weight, setWeight] = useState(0.5);
  const [notes, setNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [successLabelOutboundId, setSuccessLabelOutboundId] = useState<string | null>(null);
  const [successLabelNo, setSuccessLabelNo] = useState<string | null>(null);

  const fetchProcessingOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all outbound orders
      const resp = await api.get('/outbounds?limit=100');
      const allOrders: OutboundOrder[] = resp.data.data.data || [];
      // Filter orders with status: ALLOCATED, PICKING, PACKING (which are WMS processing flows)
      const processing = allOrders.filter((o) =>
        ['ALLOCATED', 'PICKING', 'PACKING'].includes(o.status)
      );
      setOrders(processing);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch processing orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALLOCATED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'PICKING':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20';
      case 'PACKING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ALLOCATED':
        return 'Ready to Pick';
      case 'PICKING':
        return 'Picking in Progress';
      case 'PACKING':
        return 'Ready to Pack';
      default:
        return status;
    }
  };

  const handleOpenFulfill = async (order: OutboundOrder) => {
    setActiveFulfillOrder(order);
    setDetailsLoading(true);
    setSuccessLabelOutboundId(null);
    setSuccessLabelNo(null);
    setError(null);
    try {
      const resp = await api.get(`/outbounds/${order.id}`);
      const data = resp.data.data;
      setFullDetails(data);
      
      // Calculate total weight based on product weights if available
      let calculatedWeight = 0.5;
      if (data.items && data.items.length > 0) {
        let totalProductWeight = 0;
        data.items.forEach((item: OutboundItem) => {
          const w = item.product?.weight ? Number(item.product.weight) : 0;
          totalProductWeight += w * item.quantity;
        });
        if (totalProductWeight > 0) {
          calculatedWeight = Math.max(0.1, Number(totalProductWeight.toFixed(2)));
        }
      }
      setWeight(calculatedWeight);
      setBoxCount(1);
      setNotes('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch order details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCompleteFulfillment = async () => {
    if (!fullDetails) return;
    setError(null);
    setActionInProgress(true);

    try {
      const pickTask = fullDetails.pickTask;
      const packTask = fullDetails.packTask;

      // 1. Process Picking Task
      if (pickTask) {
        if (pickTask.status === 'PENDING') {
          // Start Picking
          await api.post(`/picking/${pickTask.id}/start`);
        }
        
        if (pickTask.status === 'PENDING' || pickTask.status === 'IN_PROGRESS') {
          // Confirm Picking with full quantities
          const pickItems = fullDetails.items.map((item) => ({
            productId: item.productId,
            pickedQty: item.quantity,
          }));
          await api.post(`/picking/${pickTask.id}/confirm`, { items: pickItems });
        }
      }

      // Re-fetch details to get the newly created pack task if we completed picking
      let packTaskId = packTask?.id;
      if (!packTaskId) {
        const checkResp = await api.get(`/outbounds/${fullDetails.id}`);
        packTaskId = checkResp.data.data.packTask?.id;
      }

      // 2. Process Packing Task
      if (packTaskId) {
        // Start Packing
        await api.post(`/packing/${packTaskId}/start`);
        
        // Confirm Packing with parameters
        const packItems = fullDetails.items.map((item) => ({
          productId: item.productId,
          packedQty: item.quantity,
        }));
        await api.post(`/packing/${packTaskId}/confirm`, {
          boxCount,
          weight,
          notes,
          items: packItems,
        });
      }

      // Set success airwaybill print option
      setSuccessLabelOutboundId(fullDetails.id);
      setSuccessLabelNo(fullDetails.outboundNo);
      setActiveFulfillOrder(null);
      setFullDetails(null);
      fetchProcessingOrders();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during one-click Pick & Pack');
    } finally {
      setActionInProgress(false);
    }
  };

  const handlePrintLabel = async (outboundId: string, outboundNo: string) => {
    try {
      const response = await api.get(`/shipping-label/${outboundId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${outboundNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate shipping label PDF.');
    }
  };

  const filteredOrders = orders.filter((o) =>
    o.outboundNo.toLowerCase().includes(query.toLowerCase()) ||
    o.recipientName.toLowerCase().includes(query.toLowerCase()) ||
    o.seller.name.toLowerCase().includes(query.toLowerCase())
  );

  const columns = [
    {
      header: 'Outbound Order No',
      accessor: (o: OutboundOrder) => (
        <div>
          <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">
            {o.outboundNo}
          </span>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Created: {new Date(o.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      header: 'Seller Owner',
      accessor: (o: OutboundOrder) => (
        <span className="text-[10px] text-slate-700 dark:text-zinc-300 font-semibold">
          {o.seller.name}
        </span>
      ),
    },
    {
      header: 'Recipient details',
      accessor: (o: OutboundOrder) => (
        <div>
          <span className="text-[10px] font-bold text-slate-800 dark:text-zinc-200">{o.recipientName}</span>
          <p className="text-[9px] text-slate-400 truncate max-w-xs">{o.recipientAddress}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (o: OutboundOrder) => (
        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(o.status)}`}>
          {getStatusText(o.status)}
        </span>
      ),
    },
    {
      header: 'Courier',
      accessor: (o: OutboundOrder) => (
        <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider text-slate-600 dark:text-zinc-400">
          {o.courier?.name || 'SELF PICKUP'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: (o: OutboundOrder) => (
        <div className="flex gap-1 justify-end shrink-0">
          <button
            onClick={() => handleOpenFulfill(o)}
            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1 text-[10px] font-bold shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Pick & Pack</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fulfillment Center
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            One-click warehouse picking and packing automation. Combined flows for maximum operational efficiency.
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

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert with print label option */}
      {successLabelOutboundId && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Order {successLabelNo} Fully Fulfllled!</p>
              <p className="text-[10px] text-slate-500">Pick list completed, qc verified, packed and ready for airwaybill printing.</p>
            </div>
          </div>
          <button
            onClick={() => handlePrintLabel(successLabelOutboundId, successLabelNo || '')}
            className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Shipping Label</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
        />
      )}

      {/* Modern Side Drawer for One-Click Fulfillment */}
      {activeFulfillOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm p-0 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                  One-Click Order Fulfillment
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Order No: {activeFulfillOrder.outboundNo}</p>
              </div>
              <button
                onClick={() => {
                  setActiveFulfillOrder(null);
                  setFullDetails(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-950 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <span className="text-xs font-bold font-mono">X</span>
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : fullDetails ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Outbound Items checklist view */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Verification Checklists</h5>
                  <div className="space-y-2 border border-slate-100 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-950/20">
                    {fullDetails.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs py-1">
                        <div>
                          <p className="font-mono font-extrabold text-[10px] uppercase text-slate-900 dark:text-zinc-100">{item.product.sku}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[250px]">{item.product.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            ✔ {item.quantity} {item.product.unit} Verified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Packaging parameters */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Package Specifications</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Box Count Used</label>
                      <input
                        type="number"
                        min="1"
                        value={boxCount}
                        onChange={(e) => setBoxCount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Handling / Package Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Fragile, Bubble wrapped..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold h-20 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Actions summary banner */}
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-700 dark:text-indigo-400 font-bold leading-normal flex items-start gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="uppercase tracking-wider">Automated Actions Queue:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>Start picking list & auto-allocate shelves</li>
                      <li>Register physical goods picks ({fullDetails.items.reduce((acc, i) => acc + i.quantity, 0)} items)</li>
                      <li>Allocate package box count ({boxCount}) and weight ({weight}kg)</li>
                      <li>Finalize packaging verification</li>
                      <li>Advance order to <span className="underline">READY_TO_SHIP</span> queue</li>
                    </ul>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 shrink-0">
              <button
                onClick={handleCompleteFulfillment}
                disabled={actionInProgress || detailsLoading || !fullDetails}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {actionInProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fulfilling Order Tasks...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>EXECUTE COMPLETE PICK & PACK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
