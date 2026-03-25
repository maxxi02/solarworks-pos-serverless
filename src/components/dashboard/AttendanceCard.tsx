"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Timer } from "lucide-react";

interface TodayAttendance {
  _id: string;
  date: string;
  shift: string;
  clockInTime: string;
  clockOutTime?: string;
  hoursWorked?: number;
  status: string;
}

interface HistoryRecord {
  _id: string;
  date: string;
  shift?: string;
  clockInTime: string;
  clockOutTime?: string;
  hoursWorked?: number;
  status: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function AttendanceCard() {
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [statusRes, historyRes] = await Promise.all([
          fetch("/api/attendance/status"),
          fetch("/api/attendance/history?limit=5"),
        ]);
        const statusData = await statusRes.json();
        const historyData = await historyRes.json();

        if (statusData.success && statusData.attendance) {
          setToday(statusData.attendance);
        }
        if (historyData.success) {
          setHistory(historyData.history || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live timer — only ticks when clocked in and not yet clocked out
  useEffect(() => {
    if (today?.clockInTime && !today.clockOutTime) {
      const tick = () => {
        setElapsed(Date.now() - new Date(today.clockInTime).getTime());
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [today]);

  const isClockedIn = !!today?.clockInTime && !today.clockOutTime;
  const isClockedOut = !!today?.clockInTime && !!today.clockOutTime;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Your Attendance</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Today's shift banner */}
            {today ? (
              <div className={`rounded-lg border p-3 space-y-2 ${isClockedIn ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Today · {today.shift} shift
                  </span>
                  <Badge
                    variant={isClockedIn ? "default" : "secondary"}
                    className={isClockedIn ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20" : ""}
                  >
                    {isClockedIn ? "Active" : today.status}
                  </Badge>
                </div>

                {/* Clock-in time */}
                <div className="flex items-center gap-2 text-sm">
                  <LogIn className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">Started at</span>
                  <span className="font-semibold">{formatTime(today.clockInTime)}</span>
                </div>

                {/* Clock-out time (if done) */}
                {isClockedOut && (
                  <div className="flex items-center gap-2 text-sm">
                    <LogOut className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Ended at</span>
                    <span className="font-semibold">{formatTime(today.clockOutTime!)}</span>
                  </div>
                )}

                {/* Live duration or total hours */}
                <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${isClockedIn ? "bg-emerald-500/10" : "bg-muted/40"}`}>
                  <Timer className={`h-3.5 w-3.5 shrink-0 ${isClockedIn ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className={`font-mono font-bold text-sm ml-auto ${isClockedIn ? "text-emerald-400" : "text-foreground"}`}>
                    {isClockedIn
                      ? formatDuration(elapsed)
                      : today.hoursWorked != null
                        ? `${today.hoursWorked.toFixed(2)}h`
                        : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Not clocked in today</p>
              </div>
            )}

            {/* Recent history */}
            {history.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
                {history.slice(0, 4).map((rec) => (
                  <div key={rec._id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-xs font-medium">
                        {new Date(rec.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                        {rec.shift && <span className="text-muted-foreground ml-1">· {rec.shift}</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(rec.clockInTime)}
                        {rec.clockOutTime ? ` → ${formatTime(rec.clockOutTime)}` : " · Active"}
                        {rec.hoursWorked != null && ` · ${rec.hoursWorked.toFixed(1)}h`}
                      </p>
                    </div>
                    <Badge
                      variant={rec.status === "confirmed" || rec.status === "present" || rec.status === "on-time" ? "default" : "secondary"}
                      className="text-[9px] h-4 py-0"
                    >
                      {rec.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
