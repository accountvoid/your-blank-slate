import { ReactNode, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number | boolean | null | undefined;
  sortable?: boolean;
}

interface AdminTableProps<T> {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  getRowId: (row: T) => string;
  searchKeys?: (keyof T | ((row: T) => string))[];
  pageSize?: number;
  onCreate?: () => void;
  actions?: (row: T) => ReactNode;
  emptyMessage?: string;
  headerRight?: ReactNode;
}

type SortDir = 'asc' | 'desc' | null;

export function AdminTable<T>({
  title,
  description,
  rows,
  columns,
  loading,
  getRowId,
  searchKeys,
  pageSize = 20,
  onCreate,
  actions,
  emptyMessage = 'No records found.',
  headerRight,
}: AdminTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    const keys = searchKeys ?? [];
    return rows.filter((row) => {
      if (keys.length === 0) {
        return JSON.stringify(row).toLowerCase().includes(q);
      }
      return keys.some((k) => {
        const v = typeof k === 'function' ? k(row) : (row as Record<string, unknown>)[k as string];
        return String(v ?? '').toLowerCase().includes(q);
      });
    });
  }, [rows, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const acc = col.accessor ?? ((r: T) => (r as Record<string, unknown>)[sortKey] as string);
    return [...filtered].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') setSortDir('desc');
    else if (sortDir === 'desc') {
      setSortDir(null);
      setSortKey(null);
    } else setSortDir('asc');
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-border/40">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-8 h-9 w-48 bg-background/50"
            />
          </div>
          {headerRight}
          {onCreate && (
            <Button size="sm" onClick={onCreate} className="gap-1">
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              {columns.map((c) => {
                const active = sortKey === c.key;
                return (
                  <TableHead key={c.key} className={cn('text-xs uppercase tracking-wider', c.className)}>
                    {c.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {c.header}
                        {active && sortDir === 'asc' && <ArrowUp className="h-3 w-3" />}
                        {active && sortDir === 'desc' && <ArrowDown className="h-3 w-3" />}
                        {!active && <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
              {actions && <TableHead className="text-right text-xs uppercase tracking-wider">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin inline-block text-primary" />
                </TableCell>
              </TableRow>
            )}
            {!loading && paged.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              paged.map((row) => (
                <TableRow key={getRowId(row)} className="border-border/30">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1 justify-end">{actions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between p-3 border-t border-border/40 text-xs text-muted-foreground">
        <div>
          <Badge variant="outline" className="border-border/50">
            {sorted.length} record{sorted.length === 1 ? '' : 's'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span>
            Page {currentPage} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
