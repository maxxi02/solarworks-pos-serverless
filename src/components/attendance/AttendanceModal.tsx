"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
  hideFooter?: boolean;
}

export function AttendanceModal({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
  hideFooter = false,
}: AttendanceModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="p-6 space-y-4">{children}</div>
        )}

        {/* Footer */}
        {!hideFooter && (
          <div className="flex justify-end gap-3 p-6 pt-0">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Processing…" : confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
