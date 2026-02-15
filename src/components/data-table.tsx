"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconGripVertical,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Drag Handle ──────────────────────────────────────────────────────────────
interface DragHandleProps {
  id: UniqueIdentifier;
}

function DragHandle({ id }: DragHandleProps) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <IconGripVertical className="size-3" />
    </Button>
  );
}

// ── Draggable Row ────────────────────────────────────────────────────────────
interface DraggableRowProps<TData> {
  row: Row<TData>;
}

function DraggableRow<TData>({ row }: DraggableRowProps<TData>) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="data-[state=selected]:bg-muted/50"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Main Props ───────────────────────────────────────────────────────────────
export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  /** Enable row drag & drop reordering */
  enableDragAndDrop?: boolean;

  /** Enable checkbox row selection */
  enableRowSelection?: boolean;

  /** Show pagination controls */
  enablePagination?: boolean;

  /** Allow column sorting */
  enableSorting?: boolean;

  // Loading & Empty states
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;

  // Pagination (client or server-side)
  manualPagination?: boolean;
  pageCount?: number;           // required when manualPagination = true
  totalCount?: number;          // total rows count (for display)
  pagination?: PaginationState; // controlled pagination state (for manualPagination)
  onPaginationChange?: OnChangeFn<PaginationState>;

  // Selection
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  // Sorting
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;

  // Column filters
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;

  // Column visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;

  // Drag & drop callback (called with new order)
  onDragEnd?: (reorderedData: TData[]) => void;

  // Required when rows don't have `id` property or you want custom ID
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;

  // Pagination settings
  pageSizeOptions?: number[];
  initialPageSize?: number;

  // Optional custom footer
  renderFooter?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  enableDragAndDrop = false,
  enableRowSelection = false,
  enablePagination = true,
  enableSorting = true,
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No results.",
  manualPagination = false,
  pageCount,
  totalCount,
  pagination: controlledPagination,
  onPaginationChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  sorting: controlledSorting,
  onSortingChange,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  onDragEnd,
  getRowId,
  pageSizeOptions = [10, 15, 25, 50],
  initialPageSize = 15,
  renderFooter,
}: DataTableProps<TData, TValue>) {
  // ── Internal state (fallback when not controlled) ─────────────────────────
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: initialPageSize,
    });

  // ── Resolve controlled vs internal state ──────────────────────────────────
  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const sorting = controlledSorting ?? internalSorting;
  const columnFilters = controlledColumnFilters ?? internalColumnFilters;
  const columnVisibility = controlledColumnVisibility ?? internalColumnVisibility;
  const effectivePagination = manualPagination
    ? (controlledPagination ?? internalPagination)
    : internalPagination;
  const setPagination = manualPagination
    ? onPaginationChange
    : setInternalPagination;

  // ── Sensors for drag and drop ─────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );

  // ── Table instance ────────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: effectivePagination,
    },
    pageCount: manualPagination ? pageCount : undefined,
    manualPagination,
    getRowId,
    enableRowSelection,
    enableSorting,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ── Drag & drop logic ─────────────────────────────────────────────────────
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const oldIndex = data.findIndex((row, index) => {
        const rowId = getRowId ? getRowId(row, index) : String(index);
        return rowId === activeId;
      });

      const newIndex = data.findIndex((row, index) => {
        const rowId = getRowId ? getRowId(row, index) : String(index);
        return rowId === overId;
      });

      if (oldIndex === -1 || newIndex === -1) return;

      const newData = arrayMove(data, oldIndex, newIndex);
      onDragEnd?.(newData);
    },
    [data, getRowId, onDragEnd],
  );

  // ── Row IDs for DND (strings to match TanStack) ───────────────────────────
  const rowIds = React.useMemo(() => {
    return data.map((row, index) => {
      return getRowId ? getRowId(row, index) : String(index);
    });
  }, [data, getRowId]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const displayedTotal = totalCount ?? data.length;

  return (
    <div className="space-y-4">
      {/* Table wrapper */}
      <div className="rounded-lg border overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={enableDragAndDrop ? [restrictToVerticalAxis] : []}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    {loadingMessage}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                enableDragAndDrop ? (
                  <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="data-[state=selected]:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination & info */}
      {enablePagination && (
        <div className="flex items-center justify-between px-2 flex-wrap gap-4">
          <div className="text-sm text-muted-foreground hidden md:block">
            {enableRowSelection && selectedCount > 0 && (
              <>
                {selectedCount} of {table.getFilteredRowModel().rows.length} selected •{" "}
              </>
            )}
            Total: {displayedTotal}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end w-full md:w-auto">
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft className="size-4" />
              </Button>

              <span className="text-sm font-medium mx-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hidden sm:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {renderFooter?.(table)}
    </div>
  );
}

export { DragHandle };