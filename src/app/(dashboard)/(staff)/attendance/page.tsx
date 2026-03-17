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
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
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
}

type Step = "grid" | "pin";

interface LastAction {
  type: "clock-in" | "clock-out";
  name: string;
  hoursWorked?: number;
  time: Date;
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

  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [leaveForm, setLeaveForm] = React.useState({ startDate: "", endDate: "", reason: "" });
  const [leaveSubmitting, setLeaveSubmitting] = React.useState(false);

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
    // autofocus first PIN box after render
    setTimeout(() => pinRefs.current[0]?.focus(), 50);
  };

  const handleBack = () => {
    setSelected(null);
    setStep("grid");
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

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
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
      const body: Record<string, string> = {
        staffId: selected.id,
        action,
      };
      if (usePasswordMode) body.password = credential;
      else body.pin = credential;

      const res = await fetch("/api/attendance/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setLastAction({
          type: action,
          name: selected.name,
          hoursWorked: data.hoursWorked,
          time: new Date(),
        });
        // Refresh list and go back to grid
        await loadStaff();
        setStep("grid");
        setSelected(null);
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

  const formatTime = (d: string | Date) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

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
                <p className="text-sm text-muted-foreground capitalize">{selected?.role}</p>
              </div>
              <Badge
                variant={isClockingOut ? "default" : "secondary"}
                className={isClockingOut ? "bg-green-600 hover:bg-green-600 shrink-0" : "shrink-0"}
              >
                {isClockingOut ? "Clocked In" : "Not Clocked In"}
              </Badge>
            </CardContent>
          </Card>

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
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="clockin" className="gap-2">
            <Clock className="h-4 w-4" /> Clock In/Out
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
                  <p className="text-muted-foreground">Hours worked: {lastAction.hoursWorked.toFixed(2)}h</p>
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
