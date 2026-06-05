'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { DataTable } from '@/components/DataTable';
import { Bell, Check, Trash2, ShieldAlert } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { t } = useWmsStore();
  const [data, setData] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = () => {
    api
      .get(`/notifications?page=${page}&limit=10`)
      .then((resp) => {
        setData(resp.data.data.data || []);
        setTotalPages(resp.data.data.meta.totalPages || 1);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm_desc'))) return;
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'Alert Title',
      accessor: (n: NotificationItem) => (
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-indigo-500 animate-pulse'}`}></span>
          <div>
            <span className={`text-xs ${n.isRead ? 'text-slate-500' : 'font-extrabold text-slate-900 dark:text-white'}`}>{n.title}</span>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-0.5">{n.message}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Notification Type',
      accessor: (n: NotificationItem) => (
        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          {n.type}
        </span>
      ),
    },
    {
      header: 'Alert Time',
      accessor: (n: NotificationItem) => (
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {new Date(n.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('common.actions'),
      accessor: (n: NotificationItem) => (
        <div className="flex gap-1 justify-end shrink-0">
          {!n.isRead && (
            <button
              onClick={() => handleMarkAsRead(n.id)}
              className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors flex items-center gap-1 text-[10px] font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Read</span>
            </button>
          )}
          <button
            onClick={() => handleDelete(n.id)}
            className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-500" />
            {t('menu.notifications')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Chronological system alert logs. Keep track of stock thresholds, picker queues, and order fulfillment updates.
          </p>
        </div>

        <div>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
