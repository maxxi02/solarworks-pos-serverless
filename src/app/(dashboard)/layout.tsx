"use client";

import React, { useState } from "react";

import DashboardLayout from "../DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Bell, X } from "lucide-react";

import { useSession } from "@/lib/auth-client";

const queryClient = new QueryClient();

function ChatAndNotifications() {
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "notifications">("chats");

  if (!currentUser) return null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Toggle messages"
      >
        <MessageCircle className="h-6 w-6" />
        {/* Unread count removed */}
      </button>

      {/* Full-screen drawer — CSS transform so hook state persists when closed */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3 shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "chats" | "notifications")}
          >
            <TabsList className="grid w-65 grid-cols-2">
              <TabsTrigger value="chats" className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                Chats
                {/* Unread badge removed */}
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-1.5"
              >
                <Bell className="h-4 w-4" />
                Alerts
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-9 w-9"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {activeTab === "chats" ? (
            // ── Placeholder for Chats panel ──
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Chats panel (slot your existing component here)
            </div>
          ) : (
            // ── Placeholder for Notifications panel ──
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Alerts panel (slot your existing component here)
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <QueryClientProvider client={queryClient}>
        {children}
        <ChatAndNotifications />
      </QueryClientProvider>
    </DashboardLayout>
  );
}