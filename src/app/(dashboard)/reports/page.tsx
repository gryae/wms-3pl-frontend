'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Calendar, Download, RefreshCw, Barcode, Clipboard } from 'lucide-react';

type ReportTab = 'inventory' | 'inbound' | 'outbound' | 'returns' | 'manifests' | 'movements' | 'opnames';

export default function ReportsPage() {
  const { t, user } = useWmsStore();
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data list states
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchReportData = () => {
    setLoading(true);
    let url = `/reports/${activeTab}?page=${page}&limit=10`;
    if (activeTab !== 'inventory') {
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
    }
    
    // Add seller context
    const activeSellerFilter = user?.sellerId || '';
    if (activeSellerFilter) {
      url += `&sellerId=${activeSellerFilter}`;
    }

    api
      .get(url)
      .then((resp) => {
        const payload = resp.data.data;
        setData(payload.data || payload || []);
        setTotalPages(payload.meta?.totalPages || 1);
      })
      .catch((err) => {
        console.error(err);
        setData([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [page]);

  const handleExportExcel = async () => {
    try {
      let url = `/reports/export/${activeTab}`;
      const params: string[] = [];
      if (activeTab !== 'inventory') {
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
      }
      const activeSellerFilter = user?.sellerId || '';
      if (activeSellerFilter) {
        params.push(`sellerId=${activeSellerFilter}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dlUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = `report_${activeTab}_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download Excel report spreadsheet.');
    }
  };

  // COLUMNS DEFINITIONS
  const getColumns = () => {
    switch (activeTab) {
      case 'inventory':
        return [
          {
            header: 'SKU',
            accessor: (item: any) => (
              <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                {item.product?.sku || item.sku || 'SKU'}
              </span>
            ),
          },
          { header: 'Product Name', accessor: (item: any) => <span>{item.product?.name || item.name || '-'}</span> },
          { header: 'Available', accessor: (item: any) => <span className="font-bold text-emerald-500">{item.available ?? 0}</span> },
          { header: 'Reserved', accessor: (item: any) => <span className="font-bold text-indigo-500">{item.reserved ?? 0}</span> },
          { header: 'Damaged', accessor: (item: any) => <span className="font-bold text-amber-500">{item.damaged ?? 0}</span> },
          { header: 'Reject Scrap', accessor: (item: any) => <span className="font-bold text-red-500">{item.reject ?? 0}</span> },
        ];
      case 'inbound':
        return [
          { header: 'Inbound No', accessor: (item: any) => <span className="font-mono font-bold text-[10px] uppercase text-slate-900 dark:text-white">{item.inboundNo}</span> },
          { header: 'Seller', accessor: (item: any) => <span>{item.seller?.name || '-'}</span> },
          { header: 'Reference PO', accessor: (item: any) => <span>{item.referenceNo || '-'}</span> },
          { header: 'Type', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600">{item.type}</span> },
          { header: 'Status', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{item.status}</span> },
          { header: 'Received Date', accessor: (item: any) => <span>{item.receivedAt ? new Date(item.receivedAt).toLocaleDateString() : '-'}</span> },
        ];
      case 'outbound':
        return [
          { header: 'Outbound No', accessor: (item: any) => <span className="font-mono font-bold text-[10px] uppercase text-slate-900 dark:text-white">{item.outboundNo}</span> },
          { header: 'Seller', accessor: (item: any) => <span>{item.seller?.name || '-'}</span> },
          { header: 'Recipient', accessor: (item: any) => <span>{item.recipientName}</span> },
          { header: 'Courier Brand', accessor: (item: any) => <span className="uppercase font-bold text-[10px] text-indigo-500">{item.courier?.name || 'SELF PICKUP'}</span> },
          { header: 'AWB resi', accessor: (item: any) => <span className="font-mono font-bold text-[10px]">{item.trackingNumber || '-'}</span> },
          { header: 'Status', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{item.status}</span> },
        ];
      case 'returns':
        return [
          { header: 'Return No', accessor: (item: any) => <span className="font-mono font-bold text-[10px] uppercase text-slate-900 dark:text-white">{item.returnNo}</span> },
          { header: 'Seller', accessor: (item: any) => <span>{item.seller?.name || '-'}</span> },
          { header: 'Reason', accessor: (item: any) => <span>{item.reason}</span> },
          { header: 'Status', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{item.status}</span> },
          { header: 'Inspection Date', accessor: (item: any) => <span>{item.inspectedAt ? new Date(item.inspectedAt).toLocaleDateString() : '-'}</span> },
        ];
      case 'manifests':
        return [
          { header: 'Manifest No', accessor: (item: any) => <span className="font-mono font-bold text-[10px] uppercase text-slate-900 dark:text-white">{item.manifestNo}</span> },
          { header: 'Courier Brand', accessor: (item: any) => <span className="uppercase font-extrabold text-indigo-500">{item.courier?.name}</span> },
          { header: 'Status', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{item.status}</span> },
          { header: 'Handover Date', accessor: (item: any) => <span>{new Date(item.date).toLocaleDateString()}</span> },
          { header: 'Closed Date', accessor: (item: any) => <span>{item.closedAt ? new Date(item.closedAt).toLocaleDateString() : '-'}</span> },
        ];
      case 'movements':
        return [
          { header: 'Movement ID', accessor: (item: any) => <span className="font-mono text-[9px] uppercase text-slate-400">{item.id}</span> },
          {
            header: 'SKU',
            accessor: (item: any) => (
              <span className="font-mono font-bold text-[10px] text-slate-900 dark:text-white uppercase">
                {item.product?.sku || 'SKU'}
              </span>
            ),
          },
          { header: 'Type', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600">{item.movementType}</span> },
          { header: 'Qty Adjusted', accessor: (item: any) => <span className="font-extrabold">{item.quantity}</span> },
          { header: 'From Channel', accessor: (item: any) => <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">{item.fromStatus || '-'}</span> },
          { header: 'To Channel', accessor: (item: any) => <span className="text-indigo-500 text-[10px] uppercase tracking-wider font-extrabold">{item.toStatus || '-'}</span> },
          { header: 'Recorded Date', accessor: (item: any) => <span>{new Date(item.createdAt).toLocaleDateString()}</span> },
        ];
      default:
        return [
          { header: 'Opname No', accessor: (item: any) => <span className="font-mono font-bold text-[10px] uppercase text-slate-900 dark:text-white">{item.opnameNo}</span> },
          { header: 'Status', accessor: (item: any) => <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{item.status}</span> },
          { header: 'Audited Date', accessor: (item: any) => <span>{item.completedAt ? new Date(item.completedAt).toLocaleDateString() : '-'}</span> },
        ];
    }
  };

  const getTabLabel = (tab: ReportTab) => {
    switch (tab) {
      case 'inventory': return 'Inventory Summary';
      case 'inbound': return 'Inbound Receipts';
      case 'outbound': return 'Outbound Orders';
      case 'returns': return 'Customer Returns';
      case 'manifests': return 'Courier Manifests';
      case 'movements': return 'Stock Ledger Movements';
      case 'opnames': return 'Opname History';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action panel */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.reports')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Unified spreadsheets portal. Filter, preview system databases, and run physical Excel downloads.
          </p>
        </div>

        <div className="flex gap-2.5 items-center flex-wrap">
          {/* Date Picker (Not for inventory Tab) */}
          {activeTab !== 'inventory' && (
            <div className="flex gap-1.5 items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs"
              />
              <span className="text-slate-350 font-extrabold uppercase tracking-widest text-[9px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs"
              />
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={fetchReportData}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Download button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('common.export_excel')}</span>
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-zinc-800">
        {(['inventory', 'inbound', 'outbound', 'returns', 'manifests', 'movements', 'opnames'] as ReportTab[]).map((tab) => {
          // Hide manifest reports for seller users
          if (tab === 'manifests' && user?.sellerId) return null;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shrink-0 ${
                activeTab === tab
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          );
        })}
      </div>

      {/* Preview Table */}
      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <DataTable
          columns={getColumns()}
          data={data}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
