'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion";

interface Column {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  keyField: string;
  className?: string;
  emptyMessage?: string;
}

export function DataTable({ columns, data, keyField, className, emptyMessage = "No results found" }: DataTableProps) {
  return (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn("text-xs font-semibold text-muted-foreground h-10 tracking-wider uppercase",
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 justify-center text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={row[keyField]}
                  className="hover:bg-primary/[0.03] transition-colors duration-200 cursor-default"
                  style={{
                    animation: `fadeSlideIn 0.3s ease-out ${index * 0.04}s both`,
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={`${row[keyField]}-${col.key}`}
                      className={cn("text-sm py-3 transition-colors duration-200",
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      )}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
