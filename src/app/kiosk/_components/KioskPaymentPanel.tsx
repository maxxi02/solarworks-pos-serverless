"use client";

import { useState, useEffect } from "react";
import { QrCode, Banknote, CheckCircle, Clock, Loader2, ArrowLeft } from "lucide-react";

type PaymentMethod = "cash" | "qrph";

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
  const [step, setStep] = useState<"select" | "cash" | "qrph" | "qrph_pending" | "success">("select");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Poll for QR PH payment status
  useEffect(() => {
    if (step !== "qrph_pending" || !orderId) return;
    if (pollCount > 120) return; // 2 min timeout
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kiosk/orders/status?orderId=${orderId}`);
        const data = await res.json();
        if (data.queueStatus === "queueing") {
          setStep("success");
          onSuccess("qrph");
        } else {
          setPollCount((c) => c + 1);
        }
      } catch {
        setPollCount((c) => c + 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, orderId, pollCount, onSuccess]);

  const handleCashSelect = async () => {
    setStep("cash");
  };

  const handleCashConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await onConfirmOrder("cash");
      setOrderId(result.orderId);
      setOrderNumber(result.orderNumber);
      setStep("success");
      onSuccess("cash");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQrphSelect = async () => {
    setIsLoading(true);
    try {
      // Create order first (pending_payment)
      const result = await onConfirmOrder("qrph");
      setOrderId(result.orderId);
      setOrderNumber(result.orderNumber);

      // Create PayMongo source
      const sourceRes = await fetch("/api/kiosk/paymongo/create-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          description: `Kiosk Order ${result.orderNumber}`,
        }),
      });
      const sourceData = await sourceRes.json();
      if (sourceData.qrCode) {
        setQrCode(sourceData.qrCode);
        setStep("qrph_pending");
      } else {
        // PayMongo not configured — show mock QR
        setQrCode(null);
        setStep("qrph_pending");
      }
    } catch {
      setStep("qrph");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-foreground">Order Placed!</h2>
          {orderNumber && (
            <p className="text-muted-foreground mt-2 text-lg">Order # <span className="font-bold text-primary">{orderNumber}</span></p>
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

  if (step === "qrph_pending") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-6">
        <h2 className="text-2xl font-black text-foreground">Scan to Pay via QR PH</h2>
        <p className="text-4xl font-black text-primary">₱{total.toFixed(2)}</p>

        {/* QR Code area */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-4 border-primary/20">
          {qrCode ? (
            <img src={qrCode} alt="QR Code" className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center bg-muted rounded-xl">
              <div className="text-center space-y-2">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground px-4">QR PH unavailable.<br/>Ask staff to assist.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          <span>Waiting for payment confirmation…</span>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/20 rounded-xl px-4 py-2">
          Open your banking app → scan the QR code → confirm payment
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Go Back
        </button>
      </div>
    );
  }

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
            onClick={onBack}
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

  // Default: select payment method
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
        {/* QR PH */}
        <button
          onClick={handleQrphSelect}
          disabled={isLoading}
          className="flex items-center gap-5 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all group"
        >
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg text-foreground">QR PH</p>
            <p className="text-sm text-muted-foreground">Scan & pay via your banking app</p>
          </div>
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground ml-auto" />}
        </button>

        {/* Cash */}
        <button
          onClick={handleCashSelect}
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
