"use client";

import * as React from "react";
import { toast } from "sonner";
import { Clock, Eye, EyeOff, Loader2, LogIn, LogOut, UserCheck } from "lucide-react";
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

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatusResult {
  found: boolean;
  name?: string;
  isClockedIn: boolean;
}

export function AttendanceDialog({ open, onOpenChange }: AttendanceDialogProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);
  const [status, setStatus] = React.useState<StatusResult | null>(null);
  const [emailError, setEmailError] = React.useState("");
  const checkTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setStatus(null);
      setEmailError("");
      setIsLoading(false);
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    }
  }, [open]);

  // Auto-check status when a valid email is typed (debounced)
  React.useEffect(() => {
    if (checkTimeout.current) clearTimeout(checkTimeout.current);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus(null);
      setEmailError(trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? "Enter a valid email" : "");
      return;
    }

    setEmailError("");
    checkTimeout.current = setTimeout(() => {
      checkStatus(trimmed);
    }, 500);

    return () => {
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    };
  }, [email]);

  const checkStatus = async (e: string) => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/attendance/staff-action?email=${encodeURIComponent(e)}`);
      const data = await res.json();
      if (data.success) {
        setStatus({ found: data.found, name: data.name, isClockedIn: data.isClockedIn });
      }
    } catch {
      // silently fail – user will get feedback on submit
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    if (!status?.found) {
      toast.error("Staff account not found");
      return;
    }

    const action = status.isClockedIn ? "clock-out" : "clock-in";

    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, action }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        onOpenChange(false);
      } else if (data.alreadyClockedIn) {
        toast.warning(data.message);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Network error – please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const actionLabel = status?.isClockedIn ? "Clock Out" : "Clock In";
  const ActionIcon = status?.isClockedIn ? LogOut : LogIn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Staff Attendance
          </DialogTitle>
          <DialogDescription>
            Enter your credentials to clock in or clock out.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="att-email">Email</Label>
            <div className="relative">
              <Input
                id="att-email"
                type="email"
                autoComplete="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={emailError ? "border-destructive" : ""}
              />
              {isCheckingStatus && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>

          {/* Status badge */}
          {status && !isCheckingStatus && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  status.isClockedIn ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium">
                {status.found ? status.name : "Not found"}
              </span>
              {status.found && (
                <Badge
                  variant={status.isClockedIn ? "default" : "secondary"}
                  className={`ml-auto text-xs ${
                    status.isClockedIn
                      ? "bg-green-600 hover:bg-green-600"
                      : ""
                  }`}
                >
                  {status.isClockedIn ? "Clocked In" : "Not Clocked In"}
                </Badge>
              )}
            </div>
          )}

          {/* Password */}
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
                disabled={isLoading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              isCheckingStatus ||
              !status?.found ||
              !password
            }
            variant={status?.isClockedIn ? "destructive" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <ActionIcon className="mr-2 h-4 w-4" />
                {actionLabel}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
