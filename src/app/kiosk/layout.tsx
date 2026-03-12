import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rendezvous Café — Kiosk",
  description: "Self-service ordering kiosk",
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
