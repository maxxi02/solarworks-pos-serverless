"use client";

import { LogIn, LogOut, X } from "lucide-react";

interface ClockInModalProps {
  open: boolean;
  staffName: string;
  isClockOut?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClockInModal({ open, staffName, isClockOut = false, onConfirm, onCancel }: ClockInModalProps) {
  if (!open) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#161616] shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isClockOut ? "bg-zinc-700" : "bg-red-600/20"}`}>
              {isClockOut
                ? <LogOut className="h-4 w-4 text-zinc-300" />
                : <LogIn className="h-4 w-4 text-red-400" />
              }
            </div>
            <h2 className="text-base font-semibold text-white">
              {isClockOut ? "Confirm Clock Out" : "Confirm Clock In"}
            </h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600/30 to-red-800/20 text-sm font-bold text-red-300">
                {staffName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{staffName}</p>
                <p className="text-xs text-zinc-500">Staff Member</p>
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-3 space-y-1">
              <p className="text-2xl font-bold tabular-nums text-white">{timeStr}</p>
              <p className="text-xs text-zinc-500">{dateStr}</p>
            </div>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            {isClockOut
              ? "This will record the clock-out time for this staff member."
              : "This will record the clock-in time for this staff member."}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
              isClockOut
                ? "bg-zinc-700 hover:bg-zinc-600"
                : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30"
            }`}
          >
            {isClockOut ? "Clock Out" : "Clock In"}
          </button>
        </div>
      </div>
    </div>
  );
}
