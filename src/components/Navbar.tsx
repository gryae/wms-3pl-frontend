'use strict';
'use client';

import React, { useState } from 'react';
import { useWmsStore } from '@/store/useWmsStore';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDrawer } from './NotificationDrawer';
import { HelpModal } from './HelpModal';
import { Globe, HelpCircle, Sun, Moon, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Navbar({ collapsed, setCollapsed }: NavbarProps) {
  const { t, language, setLanguage, theme, toggleTheme, user } = useWmsStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'ID' : 'EN');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'WAREHOUSE_ADMIN':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20';
      case 'WAREHOUSE_SUPERVISOR':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
      case 'PICKER':
      case 'PACKER':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-6 z-20 shrink-0 sticky top-0">
      
      {/* Left items */}
      <div className="flex items-center gap-4">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <GlobalSearch />
      </div>

      {/* Right items */}
      <div className="flex items-center gap-2">
        {/* Help button */}
        <button
          onClick={() => setHelpOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          title={t('common.help')}
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          title="Switch Language"
        >
          <Globe className="w-4 h-4" />
          <span>{language}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notification bell */}
        <NotificationDrawer />

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 mx-2"></div>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-1">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
              {user.name}
            </p>
            <span className={`inline-block text-[8px] font-extrabold tracking-wider px-1.5 py-0.5 rounded uppercase mt-1 leading-none ${getRoleBadgeColor(user.role)}`}>
              {user.role.replace('_', ' ')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
