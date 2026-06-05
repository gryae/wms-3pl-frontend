'use strict';
'use client';

import React from 'react';
import Link from 'next/link';
import { useWmsStore } from '@/store/useWmsStore';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Boxes,
  Truck,
  Inbox,
  ArrowUpRight,
  ScanBarcode,
  PackageCheck,
  RotateCcw,
  ClipboardList,
  Binary,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  History,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { t, user, logout } = useWmsStore();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const role = user.role;

  // Define WMS Navigation Menu items
  const menuItems = [
    { href: '/dashboard', label: t('menu.dashboard'), icon: LayoutDashboard, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/sellers', label: t('menu.sellers'), icon: Users, roles: ['WAREHOUSE_ADMIN'] },
    { href: '/products', label: t('menu.products'), icon: Boxes, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/couriers', label: t('menu.couriers'), icon: Truck, roles: ['WAREHOUSE_ADMIN'] },
    
    // Inventory
    { href: '/inventory', label: t('menu.inventory'), icon: Layers, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/inventory/ledger', label: t('menu.ledger'), icon: History, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    
    // Operational flows
    { href: '/inbound', label: t('menu.inbound'), icon: Inbox, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/outbound', label: t('menu.outbound'), icon: ArrowUpRight, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/fulfillment', label: t('menu.fulfillment'), icon: ScanBarcode, roles: ['WAREHOUSE_ADMIN'] },
    { href: '/returns', label: t('menu.returns'), icon: RotateCcw, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/manifests', label: t('menu.manifests'), icon: ClipboardList, roles: ['WAREHOUSE_ADMIN'] },
    { href: '/stock-opname', label: t('menu.opname'), icon: Binary, roles: ['WAREHOUSE_ADMIN'] },
    
    // Management
    { href: '/reports', label: t('menu.reports'), icon: FileSpreadsheet, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/users', label: t('menu.users'), icon: Users, roles: ['WAREHOUSE_ADMIN', 'SELLER'] },
    { href: '/roles', label: t('menu.roles'), icon: ShieldCheck, roles: ['WAREHOUSE_ADMIN'] },
    { href: '/audit-logs', label: t('menu.audit'), icon: ClipboardList, roles: ['WAREHOUSE_ADMIN'] },
    { href: '/settings', label: t('menu.wms_configs'), icon: SlidersHorizontal, roles: ['WAREHOUSE_ADMIN'] },
  ];

  const visibleMenu = menuItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className={`bg-slate-950 text-slate-400 flex flex-col justify-between border-r border-slate-900 transition-all duration-300 z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div>
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-extrabold text-slate-950 text-sm shadow-md">
              3P
            </div>
            {!collapsed && (
              <span className="font-extrabold text-white text-xs tracking-wider uppercase">
                WMS Enterprise
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-slate-900 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable nav menu */}
        <nav className="p-3 space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto">
          {visibleMenu.map((item, idx) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <button
                key={idx}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'hover:bg-slate-900 hover:text-slate-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Row */}
      <div className="p-3 border-t border-slate-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title={collapsed ? t('common.logout') : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-red-400" />
          {!collapsed && <span className="truncate">{t('common.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
