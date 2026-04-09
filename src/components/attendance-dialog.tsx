"use client";

import * as React from "react";
import { toast } from "sonner";
import { 
  Clock, 
  Eye, 
  EyeOff, 
  Loader2, 
  LogIn, 
  LogOut, 
  UserCheck, 
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  hasPin: boolean;
  isClockedIn: boolean;
  clockInTime: string | null;
}

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Module-level cache so re-opening the dialog doesn't re-fetch if data is fresh
let staffCache: StaffMember[] = [];
let staffCacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export function AttendanceDialog({ open, onOpenChange }: AttendanceDialogProps) {
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
  const [pin, setPin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingStaff, setIsFetchingStaff] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [overtimePrompt, setOvertimePrompt] = React.useState<{
    hoursWorked: number;
    overtimeHours: number;
    pendingBody: Record<string, unknown>;
  } | null>(null);

  // Fetch staff list when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchStaff();
    } else {
      // Reset state on close
      setSelectedStaff(null);
      setPin("");
      setPassword("");
      setShowPassword(false);
      setSearchTerm("");
      setOvertimePrompt(null);
    }
  }, [open]);

  const fetchStaff = async (force = false) => {
    const now = Date.now();
    const isFresh = staffCache.length > 0 && now - staffCacheTime < CACHE_TTL_MS;

    if (isFresh && !force) {
      // Serve from cache instantly — no loading state
      setStaffList(staffCache);
      return;
    }

    // If we have stale data, show it immediately while refetching silently
    if (staffCache.length > 0) {
      setStaffList(staffCache);
    } else {
      setIsFetchingStaff(true);
    }

    try {
      const res = await fetch("/api/attendance/staff-list");
      const data = await res.json();
      if (data.success) {
        staffCache = data.staff;
        staffCacheTime = Date.now();
        setStaffList(data.staff);
      }
    } catch {
      toast.error("Failed to load staff list");
    } finally {
      setIsFetchingStaff(false);
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const doSubmit = async (extraBody: Record<string, unknown> = {}) => {
    if (!selectedStaff) return;

    if (selectedStaff.hasPin && pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    if (!selectedStaff.hasPin && !password) {
      toast.error("Please enter your password");
      return;
    }

    const action = selectedStaff.isClockedIn ? "clock-out" : "clock-in";

    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          staffId: selectedStaff.id, 
          pin: selectedStaff.hasPin ? pin : undefined,
          password: !selectedStaff.hasPin ? password : undefined,
          action,
          ...extraBody,
        }),
      });

      const data = await res.json();

      if (data.overtimeReached) {
        setOvertimePrompt({
          hoursWorked: data.hoursWorked,
          overtimeHours: data.overtimeHours,
          pendingBody: extraBody,
        });
        return;
      }

      if (data.success) {
        toast.success(data.message);
        // Invalidate cache so next dialog open shows updated status
        staffCacheTime = 0;
        onOpenChange(false);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Network error – please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit();
  };

  const handleOvertimeConfirm = async () => {
    setOvertimePrompt(null);
    await doSubmit({ confirmOvertime: true });
  };

  const handlePinChange = (val: string) => {
    const sanitized = val.replace(/\D/g, "").slice(0, 4);
    setPin(sanitized);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-6 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Clock className="h-6 w-6" />
              Staff Attendance
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {selectedStaff 
                ? `Verifying attendance for ${selectedStaff.name}`
                : "Select your name from the list to clock in or out."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {!selectedStaff ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 bg-muted/30 border-none shadow-inner"
                />
              </div>

              <ScrollArea className="h-[300px] pr-4">
                {isFetchingStaff ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading staff members...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredStaff.map((staff) => (
                      <button
                        key={staff.id}
                        onClick={() => setSelectedStaff(staff)}
                        className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/50 transition-all text-left shadow-sm group"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={staff.image || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {staff.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {staff.isClockedIn && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                            {staff.name}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            {staff.role}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-primary/10">
                <Avatar className="h-14 w-14 border-4 border-background shadow-md">
                  <AvatarImage src={selectedStaff.image || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold text-primary">
                    {selectedStaff.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedStaff.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedStaff.isClockedIn ? "default" : "secondary"} className={selectedStaff.isClockedIn ? "bg-green-600 hover:bg-green-600" : ""}>
                      {selectedStaff.isClockedIn ? "Clocked In" : "Not Clocked In"}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto rounded-full hover:bg-background"
                  onClick={() => {
                    setSelectedStaff(null);
                    setPin("");
                    setPassword("");
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {selectedStaff.hasPin ? (
                  <div className="space-y-3">
                    <Label htmlFor="pin" className="text-center block text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      Enter 4-Digit PIN
                    </Label>
                    <div className="flex justify-center gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                            pin[i] ? "border-primary bg-primary/5 text-primary scale-105 shadow-md" : "border-muted bg-muted/20"
                          }`}
                        >
                          {pin[i] ? "•" : ""}
                        </div>
                      ))}
                    </div>
                    <Input
                      id="pin"
                      type="tel"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      className="opacity-0 absolute h-0 w-0"
                      autoFocus
                    />
                    <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                      Type your 4-digit PIN to verify
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="att-password">Account Password</Label>
                    <div className="relative">
                      <Input
                        id="att-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-12 pr-12 bg-muted/30 border-none shadow-inner"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium italic">
                      You haven't set a PIN yet. Please use your account password.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className={`w-full h-14 text-lg font-bold shadow-lg transition-all active:scale-95 ${
                  selectedStaff.isClockedIn 
                    ? "bg-destructive hover:bg-destructive/90 text-white shadow-destructive/20" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                }`}
                disabled={
                  isLoading || 
                  (selectedStaff.hasPin ? pin.length !== 4 : !password)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {selectedStaff.isClockedIn ? (
                      <><LogOut className="mr-2 h-5 w-5" /> Clock Out</>
                    ) : (
                      <><LogIn className="mr-2 h-5 w-5" /> Clock In</>
                    )}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Overtime Confirmation Modal (rendered outside Dialog to avoid z-index issues) */}
    {overtimePrompt && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOvertimePrompt(null)} />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-base">8-Hour Limit Reached</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Worked <strong>{Math.floor(overtimePrompt.hoursWorked)}h {Math.round((overtimePrompt.hoursWorked % 1) * 60)}m</strong>
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Regular hours</span>
                <span className="font-semibold">8h 0m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overtime</span>
                <span className="font-semibold text-amber-600">
                  {Math.floor(overtimePrompt.overtimeHours)}h {Math.round((overtimePrompt.overtimeHours % 1) * 60)}m
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Overtime is paid at <strong>1.25× rate</strong>. Log overtime or clock out now?
            </p>
          </div>
          <div className="flex gap-3 p-5 pt-0">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleOvertimeConfirm}
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Clock Out Now
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleOvertimeConfirm}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Log Overtime
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
