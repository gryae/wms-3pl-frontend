'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, Play, ShieldAlert, AlertTriangle, ShieldCheck, Barcode } from 'lucide-react';

interface OpnameItem {
  id: string;
  productId: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  reason?: string | null;
  product: {
    sku: string;
    name: string;
    unit: string;
  };
}

interface OpnameDetails {
  id: string;
  opnameNo: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  items: OpnameItem[];
}

export default function OpnameDetailsPage() {
  const { t, user } = useWmsStore();
  const { id } = useParams() as { id: string };
  const [opname, setOpname] = useState<OpnameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Inputs
  const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const fetchOpnameDetails = () => {
    setLoading(true);
    api
      .get(`/stock-opnames/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setOpname(details);

        // Populate counts
        const initialPhys: Record<string, number> = {};
        const initialReasons: Record<string, string> = {};
        details.items.forEach((item: OpnameItem) => {
          initialPhys[item.productId] = item.physicalQty;
          initialReasons[item.productId] = item.reason || '';
        });
        setPhysicalQtys(initialPhys);
        setReasons(initialReasons);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOpnameDetails();
  }, [id]);

  const handleQtyChange = (productId: string, value: number) => {
    const val = Math.max(0, value);
    setPhysicalQtys({ ...physicalQtys, [productId]: val });
  };

  const handleReasonChange = (productId: string, val: string) => {
    setReasons({ ...reasons, [productId]: val });
  };

  const handleAction = async (action: 'start' | 'save' | 'complete' | 'cancel') => {
    setError(null);
    try {
      if (action === 'start') {
        await api.post(`/stock-opnames/${id}/start`);
        alert('Stock opname counting phase is now active.');
      } else if (action === 'save') {
        const itemsPayload = opname.items.map((item) => ({
          productId: item.productId,
          physicalQty: physicalQtys[item.productId] ?? 0,
          reason: reasons[item.productId] || undefined,
        }));
        await api.post(`/stock-opnames/${id}/count`, { items: itemsPayload });
        alert('Counts successfully saved.');
      } else if (action === 'complete') {
        await api.post(`/stock-opnames/${id}/complete`);
        alert('Discrepancy variances successfully resolved & restocked.');
        router.push('/stock-opname');
        return;
      } else if (action === 'cancel') {
        await api.post(`/stock-opnames/${id}/cancel`);
        alert('Opname count session cancelled.');
      }
      fetchOpnameDetails();
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

  if (!opname) return null;

  const isWmsUser = !user?.sellerId;
  const showInputs = opname.status === 'COUNTING' && isWmsUser;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/stock-opname')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Terminal — {opname.opnameNo}
          </h2>
          <p className="text-xs text-slate-500">
            Created Date: {new Date(opname.createdAt).toLocaleDateString()} | Auditor: {opname.createdBy.name}
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
        
        {/* Left Side: Items grid */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Opname Count Sheets</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">System Qty</th>
                  <th className="pb-2 text-center">Physical Qty</th>
                  <th className="pb-2 text-center">Variance</th>
                  <th className="pb-2">Discrepancy Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {opname.items.map((item) => {
                  const currentPhys = physicalQtys[item.productId] ?? 0;
                  const currentVar = currentPhys - item.systemQty;

                  // color
                  let varColor = 'text-slate-500';
                  let varPrefix = '';
                  if (currentVar > 0) {
                    varColor = 'text-emerald-500 font-extrabold';
                    varPrefix = '+';
                  } else if (currentVar < 0) {
                    varColor = 'text-red-500 font-extrabold';
                  }

                  return (
                    <tr key={item.id} className="text-slate-700 dark:text-zinc-300">
                      <td className="py-3 font-mono text-[10px] text-slate-900 dark:text-white uppercase flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        {item.product.sku}
                      </td>
                      <td className="py-3">{item.product.name}</td>
                      <td className="py-3 text-center">{item.systemQty} {item.product.unit}</td>
                      
                      {/* Physical Input */}
                      <td className="py-3 text-center">
                        {showInputs ? (
                          <input
                            type="number"
                            min="0"
                            value={currentPhys}
                            onChange={(e) => handleQtyChange(item.productId, Number(e.target.value))}
                            className="w-16 px-1.5 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-xs font-bold focus:outline-none"
                          />
                        ) : (
                          <span className="font-bold">{item.physicalQty} {item.product.unit}</span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className={`py-3 text-center ${varColor}`}>
                        {showInputs ? (
                          <span>{varPrefix}{currentVar}</span>
                        ) : (
                          <span>{item.variance > 0 ? '+' : ''}{item.variance}</span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3">
                        {showInputs ? (
                          <input
                            type="text"
                            value={reasons[item.productId] ?? ''}
                            onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                            placeholder="Stolen / Lost..."
                            className="w-32 px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-xs focus:outline-none"
                          />
                        ) : (
                          <span className="text-slate-500 text-[10px] leading-normal">{item.reason || '-'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Save counts */}
            {showInputs && (
              <button
                onClick={() => handleAction('save')}
                className="w-full py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 mt-4 flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Save Physical Count Sheets</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side operational actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Session parameters</h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{opname.status}</span>
            </div>

            {opname.notes && (
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                <p className="font-bold uppercase tracking-wider mb-0.5">Notes:</p>
                {opname.notes}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Start count */}
            {opname.status === 'DRAFT' && isWmsUser && (
              <button
                onClick={() => handleAction('start')}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start Session Count</span>
              </button>
            )}

            {/* Complete counting */}
            {opname.status === 'COUNTING' && isWmsUser && (
              <>
                <button
                  onClick={() => handleAction('complete')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Apply Discrepancies & Close</span>
                </button>

                <button
                  onClick={() => handleAction('cancel')}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="text-xs font-bold font-mono">X</span>
                  <span>Cancel session</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
