'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { Search, Eye, Plus, ShieldAlert, FileText, Printer, Check, X, ClipboardList } from 'lucide-react';

interface ManifestHeader {
  id: string;
  manifestNo: string;
  courierId: string;
  courier: {
    name: string;
  };
  status: string;
  date: string;
  closedAt?: string | null;
  createdBy: {
    name: string;
  };
}

interface ManifestItem {
  id: string;
  outboundId: string;
  outbound: {
    id: string;
    outboundNo: string;
    recipientName: string;
    trackingNumber?: string | null;
    status: string;
    seller: {
      name: string;
    };
  };
}

interface ManifestDetails extends ManifestHeader {
  notes?: string | null;
  items: ManifestItem[];
}

interface CourierSummary {
  id: string;
  name: string;
}

interface OutboundOrder {
  id: string;
  outboundNo: string;
  recipientName: string;
  status: string;
  courierId?: string | null;
  seller: {
    name: string;
  };
}

export default function ManifestsPage() {
  const { t, user } = useWmsStore();
  const [manifests, setManifests] = useState<ManifestHeader[]>([]);
  const [selectedManifest, setSelectedManifest] = useState<ManifestDetails | null>(null);
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [readyOutbounds, setReadyOutbounds] = useState<OutboundOrder[]>([]);
  
  // Selection check list
  const [selectedOutboundIds, setSelectedOutboundIds] = useState<string[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal create
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [manifestNotes, setManifestNotes] = useState('');

  const fetchManifests = () => {
    api
      .get(`/manifests?page=${page}&limit=10&search=${encodeURIComponent(query)}`)
      .then((resp) => {
        setManifests(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  const fetchCouriers = () => {
    api.get('/couriers?limit=100').then((resp) => {
      setCouriers(resp.data.data.data || []);
    });
  };

  // Load shipments that can be added (courier matches and status READY_TO_SHIP)
  const fetchAvailableOutbounds = (courierId: string) => {
    api.get('/outbounds?limit=1000').then((resp) => {
      const all: OutboundOrder[] = resp.data.data.data || [];
      // Filter locally for READY_TO_SHIP orders matching courierId
      const filtered = all.filter((o) => o.courierId === courierId && o.status === 'READY_TO_SHIP');
      setReadyOutbounds(filtered);
      setSelectedOutboundIds([]);
    });
  };

  const selectManifest = (id: string) => {
    setLoading(true);
    setError(null);
    api
      .get(`/manifests/${id}`)
      .then((resp) => {
        const details = resp.data.data;
        setSelectedManifest(details);
        if (details.status === 'OPEN') {
          fetchAvailableOutbounds(details.courierId);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManifests();
    fetchCouriers();
  }, [page, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await api.post('/manifests', {
        courierId: selectedCourierId,
        notes: manifestNotes || undefined,
      });
      alert(t('common.success'));
      setCreateOpen(false);
      setSelectedCourierId('');
      setManifestNotes('');
      fetchManifests();
      selectManifest(resp.data.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleAddShipments = async () => {
    if (!selectedManifest || selectedOutboundIds.length === 0) return;
    setError(null);
    try {
      await api.post(`/manifests/${selectedManifest.id}/add`, { outboundIds: selectedOutboundIds });
      alert('Shipments successfully assigned to manifest.');
      selectManifest(selectedManifest.id);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleCloseManifest = async () => {
    if (!selectedManifest) return;
    setError(null);
    try {
      await api.post(`/manifests/${selectedManifest.id}/close`);
      alert('Manifest closed and finalized. Handover complete.');
      selectManifest(selectedManifest.id);
      fetchManifests();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handlePrintPDF = async () => {
    if (!selectedManifest) return;
    try {
      const response = await api.get(`/manifests/${selectedManifest.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manifest_${selectedManifest.manifestNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate courier manifest PDF.');
    }
  };

  const toggleSelectOutbound = (id: string) => {
    if (selectedOutboundIds.includes(id)) {
      setSelectedOutboundIds(selectedOutboundIds.filter((item) => item !== id));
    } else {
      setSelectedOutboundIds([...selectedOutboundIds, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.manifests')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Open daily handover manifests per courier brand and assign packaged outbounds for carrier pickup.
          </p>
        </div>

        <div className="flex gap-2">
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

          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('manifests.create_btn')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Split Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane: Manifest List */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Handover sheets</h3>
          
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {manifests.length > 0 ? (
              manifests.map((m) => (
                <div
                  key={m.id}
                  onClick={() => selectManifest(m.id)}
                  className={`py-3 px-2.5 rounded-lg cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-zinc-850 flex justify-between items-center ${
                    selectedManifest?.id === m.id ? 'bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800' : 'border border-transparent'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white uppercase">
                      {m.manifestNo}
                    </span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Courier: <span className="uppercase text-indigo-500 font-bold">{m.courier.name}</span>
                    </p>
                  </div>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(m.status)}`}>
                    {m.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400 font-semibold">{t('common.no_data')}</p>
            )}
          </div>
        </div>

        {/* Right Pane: Manifest detail / assignment sheet */}
        <div className="lg:col-span-7">
          {selectedManifest ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
              
              {/* Header Box */}
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white uppercase">
                      {selectedManifest.manifestNo}
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusBadge(selectedManifest.status)}`}>
                      {selectedManifest.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Courier Brand: <span className="uppercase text-indigo-500 font-bold">{selectedManifest.courier.name}</span> | Handover Date: {new Date(selectedManifest.date).toLocaleDateString()}
                  </p>
                  {selectedManifest.notes && (
                    <p className="text-[10px] text-slate-400 mt-2 italic bg-slate-50 dark:bg-zinc-950 p-2 rounded border border-slate-150 dark:border-zinc-850">
                      Notes: {selectedManifest.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Download PDF Handover sheet */}
                  <button
                    onClick={handlePrintPDF}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>PDF</span>
                  </button>

                  {/* Close manifest */}
                  {selectedManifest.status === 'OPEN' && selectedManifest.items.length > 0 && (
                    <button
                      onClick={handleCloseManifest}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Finalize Handover</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Assigned Shipments ({selectedManifest.items.length})</h4>
                
                <div className="border border-slate-150 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {selectedManifest.items.length > 0 ? (
                    selectedManifest.items.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white uppercase">{item.outbound.outboundNo}</span>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Recipient: {item.outbound.recipientName} | Seller: {item.outbound.seller.name}</p>
                        </div>
                        <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">
                          AWB: {item.outbound.trackingNumber || 'PENDING'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="w-8 h-8 text-slate-350 animate-bounce" />
                      <span>No shipments assigned. Add packages below to generate handover document.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assign Ready Outbounds (If manifest is OPEN) */}
              {selectedManifest.status === 'OPEN' && (
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Add Shipments to Manifest</h4>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-150 dark:border-zinc-850 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950">
                    {readyOutbounds.length > 0 ? (
                      readyOutbounds.map((order) => {
                        const isAssigned = selectedManifest.items.some((i) => i.outboundId === order.id);
                        if (isAssigned) return null;

                        return (
                          <div
                            key={order.id}
                            onClick={() => toggleSelectOutbound(order.id)}
                            className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-150 dark:border-zinc-800 cursor-pointer text-xs transition-colors hover:border-slate-400"
                          >
                            <input
                              type="checkbox"
                              checked={selectedOutboundIds.includes(order.id)}
                              onChange={() => {}} // handled by click div
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <span className="font-mono font-bold text-slate-900 dark:text-white uppercase">{order.outboundNo}</span>
                              <p className="text-[9px] text-slate-400 font-semibold">Recipient: {order.recipientName} | Seller: {order.seller.name}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-4 text-center text-xs text-slate-400 font-semibold">No ready to ship orders available for {selectedManifest.courier.name}.</p>
                    )}
                  </div>

                  {selectedOutboundIds.length > 0 && (
                    <button
                      onClick={handleAddShipments}
                      className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign Selected Packages ({selectedOutboundIds.length})</span>
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2 h-64 shadow-sm">
              <FileText className="w-8 h-8 text-slate-350" />
              <span>Select a dispatch handover sheet from the left pane to view details and compile packages.</span>
            </div>
          )}
        </div>

      </div>

      {/* Open Manifest Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Open Courier Manifest</h4>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Courier Brand Partner</label>
                <select
                  required
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="">Select Courier...</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Internal Notes (Optional)</label>
                <textarea
                  value={manifestNotes}
                  onChange={(e) => setManifestNotes(e.target.value)}
                  placeholder="SiCepat pickup driver manifest sheet..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
              >
                OPEN NEW MANIFEST
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
