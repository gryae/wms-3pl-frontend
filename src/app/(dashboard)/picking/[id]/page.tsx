'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Play, ShieldAlert, AlertCircle, MapPin, Barcode } from 'lucide-react';

interface PickTaskItem {
  id: string;
  productId: string;
  requiredQty: number;
  pickedQty: number;
  location?: string | null;
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

interface PickTaskDetails {
  id: string;
  pickNo: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  assignedTo?: {
    name: string;
  } | null;
  outbound: {
    outboundNo: string;
    recipientName: string;
    recipientAddress: string;
    seller: {
      name: string;
    };
    items: OutboundItem[];
  };
  items: PickTaskItem[];
}

export default function PickingDetailsPage() {
  const { t, user } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [task, setTask] = useState<PickTaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickedQtys, setPickedQtys] = useState<Record<string, number>>({});
  const router = useRouter();

  const fetchTaskDetails = () => {
    setLoading(true);
    api
      .get(`/picking/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setTask(details);
        
        // Populate inputs
        const initialPicked: Record<string, number> = {};
        details.items.forEach((item: PickTaskItem) => {
          initialPicked[item.productId] = item.pickedQty;
        });
        setPickedQtys(initialPicked);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleQtyChange = (productId: string, value: number, max: number) => {
    const validVal = Math.max(0, Math.min(max, value));
    setPickedQtys({ ...pickedQtys, [productId]: validVal });
  };

  const handleAction = async (action: 'start' | 'confirm') => {
    setError(null);
    try {
      if (action === 'start') {
        await api.post(`/picking/${id}/start`);
        alert('Picking session started. Timer is now active.');
      } else if (action === 'confirm') {
        const itemsPayload = task.items.map((item) => ({
          productId: item.productId,
          pickedQty: pickedQtys[item.productId] ?? 0,
        }));
        await api.post(`/picking/${id}/confirm`, { items: itemsPayload });
        alert(t('common.success'));
        router.push('/picking');
        return;
      }
      fetchTaskDetails();
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

  if (!task) return null;

  const showInputs = task.status === 'IN_PROGRESS';
  
  // Helper to resolve product details from outbound structure
  const getProductDetails = (productId: string) => {
    const match = task.outbound.items.find((item) => item.productId === productId);
    return match?.product || { sku: 'UNKNOWN', name: 'Unknown SKU', unit: 'pcs' };
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/picking')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Picker Terminal — {task.pickNo}
          </h2>
          <p className="text-xs text-slate-500">
            Assigned Picker: {task.assignedTo?.name || 'Unassigned'} | Target Order: {task.outbound.outboundNo}
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
        
        {/* Left Side: Items & Shelves coordinates */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Target Items Pick List</h3>
            
            <div className="space-y-4">
              {task.items.map((item) => {
                const prod = getProductDetails(item.productId);
                const isShortPicked = item.pickedQty < item.requiredQty && task.status === 'COMPLETED';

                return (
                  <div key={item.id} className="p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-1">
                      {/* Shelf Coordinate Tag */}
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold tracking-wider uppercase">
                        <MapPin className="w-3 h-3" />
                        <span>Shelf: {item.location || 'FLOOR-TEMP'}</span>
                      </div>
                      
                      <div className="pt-1.5">
                        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white uppercase flex items-center gap-1">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          {prod.sku}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">{prod.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Expected</p>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{item.requiredQty} {prod.unit}</p>
                      </div>

                      <div className="w-24">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 text-center">Actual Picked</p>
                        {showInputs ? (
                          <input
                            type="number"
                            min="0"
                            max={item.requiredQty}
                            value={pickedQtys[item.productId] ?? 0}
                            onChange={(e) => handleQtyChange(item.productId, Number(e.target.value), item.requiredQty)}
                            className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-bold focus:outline-none"
                          />
                        ) : (
                          <p className={`text-sm font-extrabold text-center mt-1 ${isShortPicked ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {item.pickedQty} {prod.unit}
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

        {/* Right Side: Operational Timers & Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Picking state</h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{task.status}</span>
            </div>

            {task.startedAt && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Started:</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300">
                  {new Date(task.startedAt).toLocaleTimeString()}
                </span>
              </div>
            )}

            {task.completedAt && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Completed:</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300">
                  {new Date(task.completedAt).toLocaleTimeString()}
                </span>
              </div>
            )}

            {task.notes && (
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                <p className="font-bold uppercase tracking-wider mb-0.5">Notes:</p>
                {task.notes}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Start picking button */}
            {task.status === 'PENDING' && (
              <button
                onClick={() => handleAction('start')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start Picking List</span>
              </button>
            )}

            {/* Confirm picking button */}
            {task.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleAction('confirm')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Picks</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
