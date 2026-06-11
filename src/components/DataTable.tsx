'use strict';
'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useWmsStore } from '@/store/useWmsStore';

interface Column<T> {
  header: React.ReactNode;
  accessor: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  const { t } = useWmsStore();

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-semibold">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-slate-400 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="px-5 py-3 font-bold">
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-5 py-3 font-bold text-right">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850 transition-colors text-slate-700 dark:text-zinc-300">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-5 py-3.5 align-middle">
                      {col.accessor(item)}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-5 py-3.5 align-middle text-right space-x-1 shrink-0">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-12 text-center text-slate-400">
                  {t('common.no_data')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination control footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
