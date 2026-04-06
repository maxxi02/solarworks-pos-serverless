"use client";

import { Clock, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffCardProps {
  staffId: string;
  name: string;
  role: string;
  image: string | null;
  status: "present" | "absent" | "late";
  isCurrentlyIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  shift: string | null;
  hoursWorked: number | null;
  onClockIn: (staffId: string, name: string) => void;
  onClick: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  staff: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffCard({
  staffId,
  name,
  role,
  image,
  status,
  isCurrentlyIn,
  clockInTime,
  clockOutTime,
  shift,
  hoursWorked,
  onClockIn,
  onClick,
}: StaffCardProps) {
  const isIn = status === "present" || status === "late";

  const statusConfig = isCurrentlyIn
    ? { label: "Clocked In", pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" }
    : status === "late"
    ? { label: "Late", pill: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-400" }
    : { label: "Not In", pill: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", dot: "bg-zinc-500" };

  const shiftLabel = shift
    ? shift === "morning"
      ? "12:00 AM – 11:59 AM"
      : "12:00 PM – 11:59 PM"
    : "No Shift";

  return (
    <div
      className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#161616] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#1c1c1c] hover:shadow-xl hover:shadow-black/40 cursor-pointer"
      onClick={onClick}
    >
      {/* Top row: avatar + status dot */}
      <div className="flex items-start justify-between">
        <div className="relative">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-600/30 to-red-800/20 ring-2 ring-white/10 text-sm font-bold text-red-300">
              {getInitials(name)}
            </div>
          )}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#161616]",
              statusConfig.dot
            )}
          />
        </div>

        {/* Status pill */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            statusConfig.pill
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
          {statusConfig.label}
        </span>
      </div>

      {/* Name + role */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-white leading-tight">{name}</p>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize",
            ROLE_COLORS[role] ?? ROLE_COLORS.staff
          )}
        >
          {role}
        </span>
      </div>

      {/* Shift + hours */}
      <div className="space-y-1.5 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{shiftLabel}</span>
        </div>
        {clockInTime && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <LogIn className="h-3 w-3 shrink-0 text-emerald-500" />
            <span>
              In {formatTime(clockInTime)}
              {clockOutTime && ` · Out ${formatTime(clockOutTime)}`}
              {hoursWorked != null && ` · ${hoursWorked.toFixed(1)}h`}
            </span>
          </div>
        )}
      </div>

      {/* Clock In button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClockIn(staffId, name);
        }}
        className={cn(
          "mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-150",
          isCurrentlyIn
            ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            : "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/30"
        )}
      >
        <LogIn className="h-3.5 w-3.5" />
        {isCurrentlyIn ? "Clock Out" : "Clock In"}
      </button>
    </div>
  );
}
