"use client";

import { useRef, useCallback } from "react";
import { X, Download, Printer } from "lucide-react";
import QRCode from "react-qr-code";

interface QRPreviewModalProps {
    url: string;
    label: string;
    onClose: () => void;
}

export function QRPreviewModal({ url, label, onClose }: QRPreviewModalProps) {
    const qrRef = useRef<HTMLDivElement>(null);

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

    const handlePrint = useCallback(() => {
        const printWindow = window.open("", "_blank");
        if (!printWindow || !qrRef.current) return;

        const svg = qrRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${label} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: sans-serif;
              margin: 0;
              padding: 20px;
            }
            .qr-container { margin-bottom: 24px; }
            h1 { font-size: 28px; margin: 0 0 8px; }
            p { color: #666; font-size: 16px; margin: 0; }
            .url { font-family: monospace; font-size: 11px; color: #999; margin-top: 16px; word-break: break-all; max-width: 300px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="qr-container">${svgData}</div>
          <h1>${label}</h1>
          <p>Scan to order</p>
          <p class="url">${url}</p>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
        printWindow.document.close();
    }, [label, url]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
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
                    className="flex items-center justify-center bg-white rounded-xl p-8 mb-4"
                >
                    <QRCode value={url} size={256} level="H" />
                </div>

                {/* URL */}
                <p className="text-xs text-muted-foreground font-mono text-center break-all mb-6">
                    {url}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-accent transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
}
