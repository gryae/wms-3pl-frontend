'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { useWmsStore } from '@/store/useWmsStore';
import { useRouter } from 'next/navigation';
import { Bell, Check, Trash2, ShieldAlert, AlertCircle, Inbox, ArrowUpRight, ClipboardList } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDrawer() {
  const { t } = useWmsStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const [listResp, countResp] = await Promise.all([
        api.get('/notifications?limit=10'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(listResp.data.data.data || []);
      setUnreadCount(countResp.data.data.count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications count every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkRead = async (id: string, link?: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      await fetchNotifications();
      if (link) {
        setOpen(false);
        router.push(link);
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INBOUND_SUBMITTED':
      case 'INBOUND_COMPLETED':
        return Inbox;
      case 'OUTBOUND_SUBMITTED':
      case 'SHIPMENT_COMPLETED':
        return ArrowUpRight;
      case 'PICKING_ASSIGNED':
      case 'PACKING_ASSIGNED':
        return ClipboardList;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Drawer */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 glass overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Alert Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n.link)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${
                      !n.isRead ? 'bg-indigo-500/[0.02]' : ''
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        !n.isRead
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className={`text-xs truncate ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-500 dark:text-zinc-400'}`}>
                          {n.title}
                        </p>
                        <span className="text-[8px] text-slate-400 font-bold tracking-wider shrink-0 uppercase">
                          {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">All caught up! No alerts.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
