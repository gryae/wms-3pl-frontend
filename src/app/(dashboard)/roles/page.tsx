'use strict';
'use client';

import React from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { Shield, Check, X } from 'lucide-react';

interface PermissionMapping {
  capability: string;
  module: string;
  admin: boolean;
  seller: boolean;
}

export default function RolesMatrixPage() {
  const { t } = useWmsStore();

  const permissions: PermissionMapping[] = [
    { capability: 'sellers.manage', module: 'Sellers', admin: true, seller: false },
    { capability: 'products.manage', module: 'Products Catalog', admin: true, seller: true },
    { capability: 'inventory.view', module: 'Stock Balances', admin: true, seller: true },
    { capability: 'inventory.adjust', module: 'Variance Adjust', admin: true, seller: false },
    { capability: 'inbound.create', module: 'PO Receipts', admin: true, seller: true },
    { capability: 'inbound.receive', module: 'PO QC Receiving', admin: true, seller: false },
    { capability: 'outbound.create', module: 'Order Dispatch', admin: true, seller: true },
    { capability: 'picking.manage', module: 'Picking Tasks', admin: true, seller: false },
    { capability: 'packing.manage', module: 'Packing Tasks', admin: true, seller: false },
    { capability: 'return.create', module: 'Customer Return File', admin: true, seller: true },
    { capability: 'return.inspect', module: 'Return Physical QC', admin: true, seller: false },
    { capability: 'manifest.manage', module: 'Courier Handover', admin: true, seller: false },
    { capability: 'opname.manage', module: 'Physical Count Sessions', admin: true, seller: false },
    { capability: 'reports.view', module: 'Analytics Reports', admin: true, seller: true },
    { capability: 'users.manage', module: 'User Accounts CRUD', admin: true, seller: true },
    { capability: 'roles.manage', module: 'RBAC Matrix', admin: true, seller: false },
    { capability: 'auditlog.view', module: 'Audit Delta Trails', admin: true, seller: false },
    { capability: 'help.manage', module: 'Bilingual Articles CRUD', admin: true, seller: false },
  ];

  const renderIndicator = (val: boolean) => {
    return val ? (
      <div className="flex justify-center items-center">
        <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <Check className="w-3.5 h-3.5" />
        </span>
      </div>
    ) : (
      <div className="flex justify-center items-center">
        <span className="p-1 rounded-full bg-red-500/10 text-red-500/30">
          <X className="w-3.5 h-3.5" />
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" />
          {t('menu.roles')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Visual RBAC matrix mapping capabilities, tenant boundaries, and dashboard screens against default enterprise roles.
        </p>
      </div>

      {/* Grid Visualizer Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider text-center">
                <th className="px-5 py-3.5 font-extrabold text-left">Capability (Prisma Key)</th>
                <th className="px-5 py-3.5 font-extrabold text-left">Module Group</th>
                <th className="px-5 py-3.5 font-extrabold">Warehouse Admin</th>
                <th className="px-5 py-3.5 font-extrabold">Seller Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {permissions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850 transition-colors text-slate-700 dark:text-zinc-300">
                  <td className="px-5 py-3 font-mono text-[10px] text-slate-900 dark:text-white uppercase text-left">{p.capability}</td>
                  <td className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[9px]">{p.module}</td>
                  <td className="px-5 py-3">{renderIndicator(p.admin)}</td>
                  <td className="px-5 py-3">{renderIndicator(p.seller)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
