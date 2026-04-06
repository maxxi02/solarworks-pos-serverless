"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, CalendarOff } from "lucide-react";

interface AttendanceSummaryBarProps {
  total: number;
  clockedIn: number;
  notIn: number;
  onLeave: number;
}

export function AttendanceSummaryBar({
  total,
  clockedIn,
  notIn,
  onLeave,
}: AttendanceSummaryBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: "Total Staff", value: total, icon: Users, color: "text-zinc-300", bg: "bg-zinc-800" },
    { label: "Clocked In", value: clockedIn, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Not In", value: notIn, icon: UserX, color: "text-zinc-400", bg: "bg-zinc-700/50" },
    { label: "On Leave", value: onLeave, icon: CalendarOff, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/[0.06] bg-[#161616] px-5 py-4">
      {/* Live clock */}
      <div className="space-y-0.5">
        <p className="text-2xl font-bold tabular-nums text-white tracking-tight">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="text-xs text-zinc-500">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 ${bg}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <div>
              <p className={`text-lg font-bold leading-none tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
