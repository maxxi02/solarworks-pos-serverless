"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { X, Download } from "lucide-react";
import QRCode from "react-qr-code";
import { useSocket } from "@/provider/socket-provider";
import { CompanionPrintButton } from "@/components/ui/companion-print-button";
import { toast } from "sonner";

interface QRPreviewModalProps {
  url: string;
  label: string;
  onClose: () => void;
}

export function QRPreviewModal({ url, label, onClose }: QRPreviewModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected, companionStatus } = useSocket();
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [printTarget, setPrintTarget] = useState<"receipt" | "kitchen">(
    "receipt",
  );
  useEffect(() => {
    // Default to whichever printer is actually available.
    // Don't assume USB=receipt or BT=kitchen — the companion assigns roles independently.
    if (!companionStatus.usb && companionStatus.bt) {
      setPrintTarget("kitchen");
    } else {
      setPrintTarget("receipt");
    }
  }, [companionStatus.usb, companionStatus.bt]);

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 512;
    canvas.height = 600;

    img.onload = () => {
      if (!ctx) return;

      // White background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR code
      const qrSize = 400;
      const qrX = (canvas.width - qrSize) / 2;
      ctx.drawImage(img, qrX, 30, qrSize, qrSize);

      // Label text
      ctx.font = "bold 28px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(label, canvas.width / 2, 480);

      // Subtitle
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText("Scan to order", canvas.width / 2, 510);

      // URL
      ctx.font = "12px monospace";
      ctx.fillStyle = "#999999";
      ctx.fillText(url.slice(0, 50), canvas.width / 2, 550);

      // Download
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${label.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  }, [label, url]);

  const handlePrintViaCompanion = useCallback(async () => {
    if (!socket) return; // socket null-check for TypeScript

    // Determine the actual target — prefer the selected one,
    // but fallback to whichever is available since the companion
    // handles role assignment regardless of connection type.
    let actualTarget = printTarget;

    // If the selected target's typical connection type isn't available,
    // try the other target role.
    const receiptAvailable = companionStatus.usb || companionStatus.bt;
    const kitchenAvailable = companionStatus.bt || companionStatus.usb;

    if (actualTarget === "receipt" && !receiptAvailable) {
      actualTarget = "kitchen";
    } else if (actualTarget === "kitchen" && !kitchenAvailable) {
      actualTarget = "receipt";
    }

    setIsPrinting(true);

    const jobId = `qr-${Date.now()}`;

    // Listen for result
    const handleResult = (result: {
      jobId: string;
      success: boolean;
      error?: string;
    }) => {
      if (result.jobId !== jobId) return;
      socket.off("print:job:result", handleResult);
      setIsPrinting(false);
      if (result.success) {
        setHasPrinted(true);
        toast.success("QR Code printed!", {
          description: `${label} sent to ${actualTarget === "receipt" ? "receipt" : "kitchen"} printer.`,
        });
      } else {
        toast.error("Print failed", {
          description: result.error || "Unknown error",
        });
      }
    };

    socket.on("print:job:result", handleResult);

    // Emit the QR print job with target
    socket.emit("print:qr", { url, label, jobId, target: actualTarget });

    // Timeout fallback
    setTimeout(() => {
      socket.off("print:job:result", handleResult);
      if (isPrinting) {
        setIsPrinting(false);
        toast("QR sent to companion", {
          description: "No acknowledgment received but job was dispatched.",
        });
      }
    }, 6000);
  }, [
    socket,
    isConnected,
    url,
    label,
    isPrinting,
    printTarget,
    companionStatus.usb,
    companionStatus.bt,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">{label}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* QR Code */}
        <div
          ref={qrRef}
          className="flex items-center justify-center bg-white rounded-xl p-8 mb-4 shadow-inner"
        >
          <QRCode value={url} size={320} level="H" />
        </div>

        {/* URL */}
        <p className="text-xs text-muted-foreground font-mono text-center break-all mb-4">
          {url}
        </p>

        {/* Companion status indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-400"}`}
          />
          <span className="text-xs text-muted-foreground">
            Companion {isConnected ? "connected" : "disconnected"}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-2 mb-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
        <CompanionPrintButton
          onClick={handlePrintViaCompanion}
          isPrinting={isPrinting}
          hasPrinted={hasPrinted}
          label="Print QR"
        />
      </div>
    </div>
  );
}
