"use client";

import * as React from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  PlusCircle,
  RefreshCw,
  Timer,
  UserCheck,
  XCircle,
  AlertTriangle,
  Zap,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { LeaveRequest } from "@/models/leave-request.model";

interface StaffEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  hasPin: boolean;
  isClockedIn: boolean;
  clockInTime: string | null;
  assignedShift?: string | null;
  shiftNotes?: string | null;
}

type Step = "grid" | "pin";

interface LastAction {
  type: "clock-in" | "clock-out";
  name: string;
  hoursWorked?: number;
  overtimeHours?: number;
  time: Date;
}

interface OvertimePrompt {
  hoursWorked: number;
  overtimeHours: number;
  pendingBody: Record<string, string>;
}

const AttendancePage = () => {
  const [staff, setStaff] = React.useState<StaffEntry[]>([]);
  const [loadingStaff, setLoadingStaff] = React.useState(true);
  const [selected, setSelected] = React.useState<StaffEntry | null>(null);
  const [step, setStep] = React.useState<Step>("grid");
  const [activeTab, setActiveTab] = React.useState("clockin");

  // PIN / password input
  const [pinDigits, setPinDigits] = React.useState(["", "", "", ""]);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<LastAction | null>(null);
  const [overtimePrompt, setOvertimePrompt] = React.useState<OvertimePrompt | null>(null);

  // Live elapsed time ticker (updates every 30s when in PIN view)
  const [elapsedHours, setElapsedHours] = React.useState<number | null>(null);

  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [leaveForm, setLeaveForm] = React.useState({ startDate: "", endDate: "", reason: "" });
  const [leaveSubmitting, setLeaveSubmitting] = React.useState(false);

  // ── Schedules ─────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = React.useState(false);
  const [selectedSchedule, setSelectedSchedule] = React.useState<any | null>(null);
  const [scheduleWeekStart, setScheduleWeekStart] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // ── fetch staff list ──────────────────────────────────────────────────────
  const loadStaff = React.useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/attendance/staff-list");
      const data = await res.json();
      if (data.success) setStaff(data.staff);
    } catch {
      toast.error("Failed to load staff list");
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // ── fetch leave requests ───────────────────────────────────────────────────
  const loadLeaveRequests = React.useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await fetch("/api/attendance/leave/my");
      const data = await res.json();
      if (data.success) setLeaveRequests(data.records || []);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "leave") loadLeaveRequests();
  }, [activeTab, loadLeaveRequests]);

  const loadSchedules = React.useCallback(async () => {
    setScheduleLoading(true);
    try {
      const start = scheduleWeekStart.toISOString().split("T")[0];
      const end = new Date(scheduleWeekStart);
      end.setDate(end.getDate() + 6);
      const res = await fetch(`/api/attendance/schedules?startDate=${start}&endDate=${end.toISOString().split("T")[0]}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleWeekStart]);

  React.useEffect(() => {
    if (activeTab === "schedules") loadSchedules();
  }, [activeTab, loadSchedules]);

  const handleSubmitLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/attendance/leave/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave request submitted successfully");
        setShowLeaveModal(false);
        setLeaveForm({ startDate: "", endDate: "", reason: "" });
        loadLeaveRequests();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Network error – please try again");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // ── select a staff card ───────────────────────────────────────────────────
  const handleSelect = (s: StaffEntry) => {
    setSelected(s);
    setPinDigits(["", "", "", ""]);
    setPassword("");
    setStep("pin");
    // Compute elapsed time if clocked in
    if (s.isClockedIn && s.clockInTime) {
      const elapsed = (Date.now() - new Date(s.clockInTime).getTime()) / (1000 * 60 * 60);
      setElapsedHours(Math.round(elapsed * 100) / 100);
    } else {
      setElapsedHours(null);
    }
    // autofocus first PIN box after render
    setTimeout(() => pinRefs.current[0]?.focus(), 50);
  };

  const handleBack = () => {
    setSelected(null);
    setStep("grid");
    setElapsedHours(null);
    setOvertimePrompt(null);
  };

  // ── PIN input helpers ─────────────────────────────────────────────────────
  const handlePinChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pinDigits];
    next[idx] = val;
    setPinDigits(next);
    if (val && idx < 3) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") handleSubmit();
  };

  const pinValue = pinDigits.join("").trim();
  const usePasswordMode = !selected?.hasPin;

  // ── submit (shared by normal and overtime confirm) ──────────────────────
  const doSubmit = async (extraBody: Record<string, unknown> = {}) => {
    if (!selected) return;

    const credential = usePasswordMode ? password : pinValue;
    if (!credential) {
      toast.error(usePasswordMode ? "Enter your password" : "Enter your PIN");
      return;
    }
    if (!usePasswordMode && credential.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    const action = selected.isClockedIn ? "clock-out" : "clock-in";
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        staffId: selected.id,
        action,
        ...extraBody,
      };
      if (usePasswordMode) body.password = credential;
      else body.pin = credential;

      const res = await fetch("/api/attendance/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.overtimeReached) {
        // Pause and show overtime dialog
        setOvertimePrompt({
          hoursWorked: data.hoursWorked,
          overtimeHours: data.overtimeHours,
          pendingBody: body as Record<string, string>,
        });
        return;
      }

      if (data.success) {
        toast.success(data.message);
        setLastAction({
          type: action,
          name: selected.name,
          hoursWorked: data.hoursWorked,
          overtimeHours: data.overtimeHours,
          time: new Date(),
        });
        // Refresh list and go back to grid
        await loadStaff();
        setStep("grid");
        setSelected(null);
        setElapsedHours(null);
        setOvertimePrompt(null);
      } else if (data.alreadyClockedIn) {
        toast.warning(data.message);
      } else {
        toast.error(data.message || "Something went wrong");
        // Clear PIN on error
        setPinDigits(["", "", "", ""]);
        setTimeout(() => pinRefs.current[0]?.focus(), 50);
      }
    } catch {
      toast.error("Network error – please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => doSubmit();

  const handleOvertimeConfirm = async (logOvertime: boolean) => {
    setOvertimePrompt(null);
    await doSubmit({ confirmOvertime: true });
  };

  const formatTime = (d: string | Date) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatElapsed = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const getElapsedColor = (h: number) => {
    if (h >= 8) return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" };
    if (h >= 7) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
    return { bar: "bg-green-500", text: "text-green-700 dark:text-green-400", bg: "bg-green-500/10 border-green-500/30" };
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-500">Pending</Badge>;
      case "approved": return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ── PIN view ───────────────────────────────────────────────────────────────
  if (step === "pin") {
    const isClockingOut = selected?.isClockedIn;
    const elapsedColors = elapsedHours !== null ? getElapsedColor(elapsedHours) : null;
    const progressPct = elapsedHours !== null ? Math.min((elapsedHours / 8) * 100, 100) : 0;

    return (
      <div className="min-h-screen flex items-start justify-center p-6 pt-16">
        <div className="w-full max-w-sm space-y-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to staff list
          </button>

          <Card>
            <CardContent className="flex items-center gap-4 pt-5 pb-5">
              {selected?.image ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                  <Image src={selected.image} alt={selected.name} fill className="object-cover" sizes="56px" />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {getInitials(selected?.name ?? "")}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selected?.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground capitalize">{selected?.role}</p>
                  {selected?.assignedShift && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      {selected.assignedShift}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={isClockingOut ? "default" : "secondary"}
                className={isClockingOut ? "bg-green-600 hover:bg-green-600 shrink-0" : "shrink-0"}
              >
                {isClockingOut ? "Clocked In" : "Not Clocked In"}
              </Badge>
            </CardContent>
          </Card>

          {/* Elapsed time bar — only shown when clocked in */}
          {isClockingOut && elapsedHours !== null && (
            <div className={`rounded-xl border p-4 space-y-2 ${elapsedColors!.bg}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={`flex items-center gap-1.5 font-medium ${elapsedColors!.text}`}>
                  <Timer className="h-4 w-4" />
                  Time on Shift
                </span>
                <span className={`font-bold ${elapsedColors!.text}`}>{formatElapsed(elapsedHours)}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${elapsedColors!.bar}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>0h</span>
                <span className={elapsedHours >= 8 ? elapsedColors!.text : ""}>
                  {elapsedHours >= 8 ? `+${formatElapsed(elapsedHours - 8)} overtime` : "8h limit"}
                </span>
              </div>
              {elapsedHours >= 8 && (
                <p className={`text-xs font-semibold flex items-center gap-1 ${elapsedColors!.text}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  You've reached the 8-hour limit. You'll be asked about overtime.
                </p>
              )}
            </div>
          )}

          <Card>
            <CardContent className="pt-6 pb-6 space-y-5">
              {usePasswordMode ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm font-medium">No PIN set</p>
                    <p className="text-xs text-muted-foreground">Enter your account password</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="att-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="att-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        disabled={isSubmitting}
                        autoFocus
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Enter your PIN</p>
                    <p className="text-xs text-muted-foreground">{selected?.hasPin ? "4-digit attendance PIN" : ""}</p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {pinDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { pinRefs.current[i] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(i, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(i, e)}
                        disabled={isSubmitting}
                        className="h-12 w-10 rounded-lg border bg-background text-center text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">Enter 4 digits</p>
                </div>
              )}

              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isClockingOut ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>
                {isClockingOut ? (
                  <><LogOut className="h-4 w-4 shrink-0" /> This will record your <strong className="ml-1">clock out</strong></>
                ) : (
                  <><LogIn className="h-4 w-4 shrink-0" /> This will record your <strong className="ml-1">clock in</strong></>
                )}
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || (usePasswordMode ? !password : pinValue.length !== 4)}
                variant={isClockingOut ? "destructive" : "default"}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                ) : isClockingOut ? (
                  <><LogOut className="mr-2 h-4 w-4" />Clock Out</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" />Clock In</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </CardContent>
          </Card>

          {/* ── Overtime Confirmation Modal ─────────────────────────────────── */}
          {overtimePrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOvertimePrompt(null)} />
              <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">8-Hour Limit Reached</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You've worked <strong>{formatElapsed(overtimePrompt.hoursWorked)}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <div className="rounded-xl bg-muted/40 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Regular hours</span>
                      <span className="font-semibold">8h 0m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overtime</span>
                      <span className="font-semibold text-amber-600">{formatElapsed(overtimePrompt.overtimeHours)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Overtime is paid at <strong>1.25× rate</strong>. Do you want to log the overtime and clock out, or just clock out now?
                  </p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 pt-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOvertimeConfirm(false)}
                    disabled={isSubmitting}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Clock Out Now
                  </Button>
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleOvertimeConfirm(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Log Overtime
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── GRID VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Manage your clock in/out and leave requests.</p>
        </div>
        {activeTab === "clockin" && (
          <Button variant="outline" size="sm" onClick={loadStaff} disabled={loadingStaff}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingStaff ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="clockin" className="gap-2">
            <Clock className="h-4 w-4" /> Clock In/Out
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Schedules
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <FileText className="h-4 w-4" /> Leave Requests
          </TabsTrigger>
        </TabsList>

        {/* ── Clock In/Out Tab ───────────────────────────────────────────────── */}
        <TabsContent value="clockin" className="space-y-6">
          {/* Last action result */}
          {lastAction && (
            <div className={`flex items-start gap-3 rounded-xl border p-4 ${lastAction.type === "clock-in" ? "border-green-500/30 bg-green-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
              {lastAction.type === "clock-in" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              )}
              <div className="text-sm">
                <p className="font-semibold">
                  {lastAction.name}{" "}
                  {lastAction.type === "clock-in" ? "clocked in" : "clocked out"}{" "}
                  at {formatTime(lastAction.time)}
                </p>
                {lastAction.hoursWorked !== undefined && (
                  <p className="text-muted-foreground">
                    Total: {formatElapsed(lastAction.hoursWorked)}
                    {(lastAction.overtimeHours ?? 0) > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">
                        · {formatElapsed(lastAction.overtimeHours!)} overtime
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Staff grid */}
          {loadingStaff ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className="group relative flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center transition-all hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="relative">
                    {s.image ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-full">
                        <Image src={s.image} alt={s.name} fill className="object-cover" sizes="56px" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                        {getInitials(s.name)}
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${s.isClockedIn ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                  <div className="w-full">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground capitalize">{s.role}</p>
                    {s.assignedShift ? (
                       <button
                         onClick={(e) => { e.stopPropagation(); toast.info(`Assigned Schedule: ${s.assignedShift}\nNotes: ${s.shiftNotes || "None"}`); }}
                         className="mt-1.5 truncate text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-2 py-0.5 transition-colors duration-200"
                       >
                         {s.assignedShift}
                       </button>
                    ) : (
                       <span className="mt-1.5 truncate text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                         No Shift
                       </span>
                    )}
                  </div>
                  <Badge
                    variant={s.isClockedIn ? "default" : "secondary"}
                    className={`text-xs ${s.isClockedIn ? "bg-green-600 hover:bg-green-600" : ""}`}
                  >
                    {s.isClockedIn ? `In ${s.clockInTime ? formatTime(s.clockInTime) : ""}` : "Not In"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Leave Requests Tab ─────────────────────────────────────────────── */}
        <TabsContent value="leave" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {leaveRequests.filter(r => r.status === "pending").length} pending
            </p>
            <Button size="sm" className="gap-2" onClick={() => setShowLeaveModal(true)}>
              <PlusCircle className="h-4 w-4" /> Request Leave
            </Button>
          </div>

          {leaveLoading ? (
            <div className="grid gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : leaveRequests.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <FileText className="mx-auto mb-5 h-14 w-14 text-muted-foreground/60" />
              <h3 className="text-lg font-semibold">No leave requests yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                Click &quot;Request Leave&quot; to submit a leave request for admin review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map(req => (
                <Card key={req._id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`}
                        </p>
                        {getLeaveStatusBadge(req.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.reason}</p>
                      {req.reviewNote && <p className="text-xs text-muted-foreground italic">Admin note: {req.reviewNote}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Schedules Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="schedules" className="space-y-5">

          {/* Week navigator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(scheduleWeekStart);
                d.setDate(d.getDate() - 7);
                setScheduleWeekStart(d);
              }}>← Prev</Button>
              <span className="text-sm font-semibold px-1">
                {scheduleWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {new Date(scheduleWeekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(scheduleWeekStart);
                d.setDate(d.getDate() + 7);
                setScheduleWeekStart(d);
              }}>Next →</Button>
            </div>
            <Button variant="ghost" size="sm" onClick={loadSchedules} disabled={scheduleLoading}>
              <RefreshCw className={`h-4 w-4 ${scheduleLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Content */}
          {scheduleLoading ? (
            <div className="space-y-2">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="mb-4 h-14 w-14 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No schedules this week</h3>
              <p className="mt-1 text-sm text-muted-foreground">Check another week or wait for the admin to assign your shifts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map((s: any) => {
                const dateLabel = new Date(s.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                });
                const dateShort = new Date(s.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                });
                const isToday = s.date === new Date().toISOString().split("T")[0];
                return (
                  <button
                    key={s._id}
                    onClick={() => setSelectedSchedule(s)}
                    className={`w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all hover:shadow-sm hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary ${
                      isToday
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/30"
                    }`}
                  >
                    {/* Date pill */}
                    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center ${
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">
                        {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-xl font-bold leading-tight">
                        {new Date(s.date + "T00:00:00").getDate()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{dateShort}</p>
                        {isToday && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Today</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {s.startTime} – {s.endTime}
                      </p>
                    </div>

                    {/* Arrow */}
                    <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}

          {/* Schedule Detail Dialog */}
          <Dialog open={!!selectedSchedule} onOpenChange={(open) => { if (!open) setSelectedSchedule(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Schedule Details
                </DialogTitle>
                <DialogDescription>
                  {selectedSchedule && new Date(selectedSchedule.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>

              {selectedSchedule && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                    <Clock className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-semibold text-base">{selectedSchedule.startTime} – {selectedSchedule.endTime}</p>
                    </div>
                  </div>

                  {selectedSchedule.notes && (
                    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                      <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notes from Admin</p>
                        <p className="text-sm mt-0.5 text-foreground">{selectedSchedule.notes}</p>
                      </div>
                    </div>
                  )}

                  <Button className="w-full" variant="outline" onClick={() => setSelectedSchedule(null)}>
                    Close
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </TabsContent>
      </Tabs>

      {/* ── Leave Request Modal ──────────────────────────────────────────────── */}
      <AttendanceModal
        open={showLeaveModal}
        title="Request Leave"
        description="Submit a leave request for admin approval"
        confirmLabel="Submit Request"
        isLoading={leaveSubmitting}
        onConfirm={handleSubmitLeave}
        onCancel={() => { setShowLeaveModal(false); setLeaveForm({ startDate: "", endDate: "", reason: "" }); }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leave-start">Start Date *</Label>
              <Input id="leave-start" type="date" value={leaveForm.startDate}
                onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">End Date *</Label>
              <Input id="leave-end" type="date" value={leaveForm.endDate}
                onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leave-reason">Reason *</Label>
            <Textarea
              id="leave-reason"
              placeholder="Explain the reason for your leave..."
              value={leaveForm.reason}
              onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </AttendanceModal>
    </div>
  );
};

export default AttendancePage;
