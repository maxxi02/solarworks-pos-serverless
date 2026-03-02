"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CreateTableModalProps {
    onClose: () => void;
    onCreate: (label: string, qrType: string) => void;
}

export function CreateTableModal({ onClose, onCreate }: CreateTableModalProps) {
    const [label, setLabel] = useState("");
    const [qrType] = useState("dine-in");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) return;

        setIsSubmitting(true);
        try {
            await onCreate(label.trim(), qrType);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-foreground">Create New Table</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-accent transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-foreground block mb-1.5">
                            Table Label
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder='e.g. "Table #1"'
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                            autoFocus
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        A QR code will be generated automatically. Customers scan it to order
                        directly from their phone.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!label.trim() || isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating..." : "Create Table"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
