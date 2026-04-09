"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface StaffPinClockInProps {
  staffId: string;
  staffName: string;
  onSuccess: () => void;
  playSuccess: () => void;
  playError: () => void;
}

export function StaffPinClockIn({ 
  staffId, 
  staffName, 
  onSuccess,
  playSuccess,
  playError
}: StaffPinClockInProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-submit when pin reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      handleClockIn();
    }
  }, [pin]);

  const handleClockIn = async () => {
    if (pin.length !== 4) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance/staff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          staffId, 
          pin, 
          action: "clock-in" 
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `${staffName} clocked in successfully`);
        playSuccess();
        onSuccess();
      } else {
        toast.error(data.message || "Invalid PIN");
        playError();
        setPin("");
      }
    } catch (error) {
      toast.error("Network error – please try again");
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (val: string) => {
    const sanitized = val.replace(/\D/g, "").slice(0, 4);
    setPin(sanitized);
  };

  return (
    <div className="min-h-[80vh] bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
          <div className="bg-primary/5 p-8 text-center border-b">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-5 relative">
              <UserCheck className="h-10 w-10 text-primary" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-card rounded-full" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome, {staffName}</h2>
            <p className="text-muted-foreground mt-2 font-medium">
              Please enter your 4-digit PIN to clock in.
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="staff-pin" className="text-center block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Shift Authorization
                </Label>
                <div className="flex justify-center gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all duration-200 ${
                        pin[i] ? "border-primary bg-primary/5 text-primary scale-105 shadow-md" : "border-muted bg-muted/20"
                      }`}
                      onClick={() => document.getElementById("staff-pin")?.focus()}
                    >
                      {pin[i] ? "•" : ""}
                    </div>
                  ))}
                </div>
                <Input
                  id="staff-pin"
                  type="tel"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  className="opacity-0 absolute h-0 w-0"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Clocking in starts your shift tracking. Make sure you are at your assigned station and ready to begin.
                </p>
              </div>

              <Button
                type="button"
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleClockIn}
                disabled={isLoading || pin.length !== 4}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Confirm Clock In"
                )}
              </Button>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 text-center border-t">
            <p className="text-xs text-muted-foreground font-medium">
              Forgot your PIN? Contact your administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
