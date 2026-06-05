'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  ArrowUpRight,
  ClipboardList,
  AlertTriangle,
  RotateCcw,
  Boxes,
  Activity,
  Layers,
} from 'lucide-react';

interface WarehouseStats {
  todayInbound: number;
  todayOutbound: number;
  pendingPicking: number;
  pendingPacking: number;
  pendingReturns: number;
  inventory: {
    totalSkus: number;
    available: number;
    reserved: number;
    damaged: number;
    reject: number;
  };
  stockAlerts: Array<{
    sku: string;
    name: string;
    seller: string;
    available: number;
  }>;
  topSellers: Array<{
    sellerName: string;
    sellerCode: string;
    orderCount: number;
  }>;
}

interface SellerStats {
  inventory: {
    totalSkus: number;
    available: number;
    reserved: number;
    damaged: number;
  };
  pendingInbound: number;
  pendingOutbound: number;
  recentReturns: Array<{
    id: string;
    returnNo: string;
    status: string;
    reason: string;
    date: string;
  }>;
  topProducts: Array<{
    sku: string;
    name: string;
    available: number;
    reserved: number;
    unit: string;
  }>;
}

export default function DashboardPage() {
  const { t, user } = useWmsStore();
  const router = useRouter();
  const [warehouseData, setWarehouseData] = useState<WarehouseStats | null>(null);
  const [sellerData, setSellerData] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .get('/dashboard')
      .then((resp) => {
        if (user.sellerId) {
          setSellerData(resp.data.data);
        } else {
          setWarehouseData(resp.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-slate-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSeller = !!user?.sellerId;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isSeller ? t('dashboard.seller_title') : t('dashboard.warehouse_title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Welcome back, <span className="font-bold text-slate-800 dark:text-white">{user?.name}</span>. Here is today's overview.
        </p>
      </div>

      {isSeller && sellerData ? (
        // =============================================
        // SELLER DASHBOARD VIEW
        // =============================================
        <>
          {/* Card Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{t('dashboard.available_stock')}</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{sellerData.inventory.available}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{t('dashboard.reserved_stock')}</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{sellerData.inventory.reserved}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Pending Inbounds</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{sellerData.pendingInbound}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Pending Outbounds</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{sellerData.pendingOutbound}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Products */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Top Inventory Balances</h4>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {sellerData.topProducts.map((p, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">{p.available} {p.unit}</p>
                      <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Reserved: {p.reserved}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Returns */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Recent Returns</h4>
              <div className="space-y-3">
                {sellerData.recentReturns.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-100 dark:border-zinc-800/50 flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{r.returnNo}</p>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">Reason: {r.reason}</p>
                    </div>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider leading-none">
                      {r.status}
                    </span>
                  </div>
                ))}
                {sellerData.recentReturns.length === 0 && (
                  <div className="py-8 text-center text-xs font-bold text-slate-400">No returns filed</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        // =============================================
        // WAREHOUSE DASHBOARD VIEW
        // =============================================
        <>
          {/* Card Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => router.push('/inbound')}>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Receive Inbound</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{warehouseData?.todayInbound ?? 0}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => router.push('/fulfillment')}>
              <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Pick & Pack</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{(warehouseData?.pendingPicking ?? 0) + (warehouseData?.pendingPacking ?? 0)}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => router.push('/outbound')}>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Ready to Dispatch</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{warehouseData?.todayOutbound ?? 0}</h3>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => router.push('/returns')}>
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-lg">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Open Returns</p>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">{warehouseData?.pendingReturns ?? 0}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Low Inventory alerts */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t('dashboard.stock_alerts')}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 font-bold">SKU</th>
                      <th className="pb-2 font-bold">Product</th>
                      <th className="pb-2 font-bold">Seller</th>
                      <th className="pb-2 font-bold text-right">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {(warehouseData?.stockAlerts || []).map((alert, idx) => (
                      <tr key={idx} className="text-slate-700 dark:text-zinc-300">
                        <td className="py-2.5 font-mono text-[10px] text-slate-900 dark:text-white">{alert.sku}</td>
                        <td className="py-2.5">{alert.name}</td>
                        <td className="py-2.5 text-slate-400">{alert.seller}</td>
                        <td className="py-2.5 text-right font-extrabold text-red-500">{alert.available}</td>
                      </tr>
                    ))}
                    {(warehouseData?.stockAlerts || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">All SKUs have sufficient stock levels</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Sellers */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                {t('dashboard.top_sellers')}
              </h4>
              <div className="space-y-4">
                {(warehouseData?.topSellers || []).map((seller, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{seller.sellerName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Code: {seller.sellerCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-slate-950 dark:text-white">{seller.orderCount}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">orders</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(warehouseData?.topSellers || []).length === 0 && (
                  <div className="py-8 text-center text-xs font-bold text-slate-400">No outbound transactions recorded</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
