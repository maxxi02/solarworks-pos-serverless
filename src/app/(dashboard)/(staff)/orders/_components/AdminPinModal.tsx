"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AdminPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function AdminPinModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Admin Authorization Required",
  description = "Please enter an administrator PIN to authorize this action.",
}: AdminPinModalProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) setPin("");
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) { toast.error("Please enter a 4-digit PIN"); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-admin-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Authorized");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.message || "Invalid Admin PIN");
        setPin("");
      }
    } catch {
      toast.error("Network error – please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (val: string) => {
    setPin(val.replace(/\D/g, "").slice(0, 4));
  };

  useEffect(() => {
    if (pin.length === 4 && !isLoading) handleSubmit();
  }, [pin]);

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-primary/5 border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          <div className="space-y-3">
            <Label className="text-center block text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Enter 4-Digit Admin PIN
            </Label>
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                    pin[i]
                      ? "border-primary bg-primary/5 text-primary scale-105 shadow-md"
                      : "border-muted bg-muted/20"
                  }`}
                >
                  {pin[i] ? "•" : ""}
                </div>
              ))}
            </div>
            <Input
              id="admin-pin"
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
          <p className="text-xs text-center text-muted-foreground font-medium italic">
            Authorization is required for quantity reductions or item removal.
          </p>
        </DialogBody>

        <DialogFooter className="border-t pt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 font-bold"
            onClick={() => handleSubmit()}
            disabled={isLoading || pin.length !== 4}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
