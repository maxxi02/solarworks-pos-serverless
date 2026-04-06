"use client";

import { useState, useEffect } from "react";
import { QrCode, Banknote, CheckCircle, Loader2, ArrowLeft, Copy, CheckCheck } from "lucide-react";

type PaymentMethod = "cash" | "gcash";

interface GCashInfo {
  accountName: string;
  accountNumber: string;
  qrImage: string | null;
}

interface KioskPaymentPanelProps {
  total: number;
  customerName: string;
  onBack: () => void;
  onSuccess: (method: PaymentMethod) => void;
  onConfirmOrder: (method: PaymentMethod) => Promise<{ orderId: string; orderNumber: string }>;
}

export function KioskPaymentPanel({
  total,
  customerName,
  onBack,
  onSuccess,
  onConfirmOrder,
}: KioskPaymentPanelProps) {
  const [step, setStep] = useState<"select" | "cash" | "gcash" | "success">("select");
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [gcashInfo, setGcashInfo] = useState<GCashInfo | null>(null);
  const [gcashRef, setGcashRef] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch GCash info once on mount
  useEffect(() => {
    fetch("/api/kiosk/gcash-info")
      .then((r) => r.json())
      .then(setGcashInfo)
      .catch(() => {});
  }, []);

  const handleCashConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await onConfirmOrder("cash");
      setOrderNumber(result.orderNumber);
      setStep("success");
      onSuccess("cash");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGcashConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await onConfirmOrder("gcash");
      setOrderNumber(result.orderNumber);
      setStep("success");
      onSuccess("gcash");
    } finally {
      setIsLoading(false);
    }
  };

  const copyNumber = () => {
    if (!gcashInfo?.accountNumber) return;
    navigator.clipboard.writeText(gcashInfo.accountNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-foreground">Order Placed!</h2>
          {orderNumber && (
            <p className="text-muted-foreground mt-2 text-lg">
              Order # <span className="font-bold text-primary">{orderNumber}</span>
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-sm">
            {customerName ? `Thank you, ${customerName}!` : "Thank you for your order!"}
          </p>
        </div>
        <div className="bg-muted/30 border border-border rounded-2xl px-6 py-4">
          <p className="text-sm text-muted-foreground">Please wait while we prepare your order.</p>
          <p className="font-bold text-foreground mt-1">Check the display board for your number.</p>
        </div>
      </div>
    );
  }

  // ── GCash step ─────────────────────────────────────────────────────────────
  if (step === "gcash") {
    const hasQR = !!gcashInfo?.qrImage;
    const hasNumber = !!gcashInfo?.accountNumber;

    return (
      <div className="flex flex-col h-full p-6 gap-4 overflow-y-auto">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">Pay via GCash</h2>
          <p className="text-4xl font-black text-primary mt-1">₱{total.toFixed(2)}</p>
        </div>

        {/* QR + manual side by side or stacked */}
        <div className="flex flex-col items-center gap-4">

          {/* QR image */}
          {hasQR ? (
            <div className="bg-white rounded-2xl p-4 shadow-xl border-4 border-[#0070BA]/20">
              <img src={gcashInfo!.qrImage!} alt="GCash QR" className="w-52 h-52 object-contain" />
            </div>
          ) : (
            <div className="w-52 h-52 flex items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
              <div className="text-center space-y-2">
                <QrCode className="w-14 h-14 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground px-4">No QR set up.<br />Use the number below.</p>
              </div>
            </div>
          )}

          {/* Account info */}
          {(hasNumber || gcashInfo?.accountName) && (
            <div className="w-full rounded-2xl border border-border bg-card p-4 space-y-3">
              {gcashInfo?.accountName && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Name</p>
                  <p className="font-black text-lg text-foreground mt-0.5">{gcashInfo.accountName}</p>
                </div>
              )}
              {hasNumber && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">GCash Number</p>
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <p className="font-black text-2xl tracking-widest text-[#0070BA]">
                      {gcashInfo!.accountNumber}
                    </p>
                    <button
                      onClick={copyNumber}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No info configured */}
          {!hasQR && !hasNumber && !gcashInfo?.accountName && (
            <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
              <p className="text-sm font-semibold text-amber-600">GCash not configured</p>
              <p className="text-xs text-muted-foreground mt-1">Ask staff to assist with payment.</p>
            </div>
          )}
        </div>

        {/* Optional reference input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            GCash Reference No. <span className="normal-case text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="text"
            value={gcashRef}
            onChange={(e) => setGcashRef(e.target.value)}
            placeholder="e.g. 1234567890"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#0070BA]/60 focus:ring-1 focus:ring-[#0070BA]/20 transition-colors"
          />
          <p className="text-xs text-muted-foreground">Enter the reference number from your GCash receipt after paying.</p>
        </div>

        <div className="flex gap-3 mt-auto">
          <button
            onClick={() => setStep("select")}
            className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors font-semibold"
          >
            Back
          </button>
          <button
            onClick={handleGcashConfirm}
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-xl bg-[#0070BA] text-white font-bold hover:bg-[#005fa3] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            I've Paid
          </button>
        </div>
      </div>
    );
  }

  // ── Cash step ──────────────────────────────────────────────────────────────
  if (step === "cash") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Banknote className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground">Pay with Cash</h2>
          <p className="text-4xl font-black text-primary mt-2">₱{total.toFixed(2)}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-4 max-w-xs">
          <p className="text-amber-400 font-semibold text-sm">Please proceed to the counter to pay in cash.</p>
          <p className="text-muted-foreground text-xs mt-1">Your order will be queued once confirmed by staff.</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => setStep("select")}
            className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors font-semibold"
          >
            Back
          </button>
          <button
            onClick={handleCashConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // ── Method select ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-foreground">Choose Payment</h2>
        <p className="text-4xl font-black text-primary mt-1">₱{total.toFixed(2)}</p>
        {customerName && (
          <p className="text-muted-foreground text-sm mt-1">for {customerName}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 justify-center">
        {/* GCash */}
        <button
          onClick={() => setStep("gcash")}
          className="flex items-center gap-5 p-6 rounded-2xl border-2 border-border bg-card hover:border-[#0070BA]/60 hover:bg-[#0070BA]/5 active:scale-[0.98] transition-all"
        >
          <div className="p-3 rounded-xl bg-[#0070BA]/10">
            <QrCode className="w-8 h-8 text-[#0070BA]" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg text-foreground">GCash</p>
            <p className="text-sm text-muted-foreground">Scan QR or send to number</p>
          </div>
        </button>

        {/* Cash */}
        <button
          onClick={() => setStep("cash")}
          className="flex items-center gap-5 p-6 rounded-2xl border-2 border-border bg-card hover:border-emerald-500/60 hover:bg-emerald-500/5 active:scale-[0.98] transition-all"
        >
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Banknote className="w-8 h-8" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg text-foreground">Cash</p>
            <p className="text-sm text-muted-foreground">Pay at the counter</p>
          </div>
        </button>
      </div>

      <button
        onClick={onBack}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>
    </div>
  );
}
