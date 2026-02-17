"use client";

import React, { useState } from "react";

import DashboardLayout from "../DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Bell, X } from "lucide-react";

import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";
import { useSession } from "@/lib/auth-client";

// ─── Notifications section (unchanged — kept as-is) ───────────────
// Import and use your existing notification component here.
// Omitted for brevity; slot it in below where indicated.

const queryClient = new QueryClient();

// ─── Inner component — needs to be inside QueryClientProvider ─────

function ChatAndNotifications() {
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "notifications">("chats");
  const [showMobileList, setShowMobileList] = useState(true);

  const chat = useChat();

  // When selecting a conversation on mobile, hide the list to show the window
  const handleSelectConversation = (id: string) => {
    chat.selectConversation(id);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setShowMobileList(true);
  };

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
        {chat.totalUnread > 0 && (
          <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white">
            {chat.totalUnread > 9 ? "9+" : chat.totalUnread}
          </Badge>
        )}
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
                {chat.totalUnread > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {chat.totalUnread}
                  </Badge>
                )}
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
            <div className="flex h-full w-full">
              {/* Conversation list sidebar */}
              <div
                className={`${showMobileList ? "flex" : "hidden"
                  } md:flex w-full md:w-72 lg:w-80 flex-col border-r shrink-0`}
              >
                <ConversationList
                  conversations={chat.conversations}
                  selectedId={chat.selectedConversationId}
                  localUnread={chat.localUnread}
                  allUsers={chat.allUsers}
                  isLoadingUsers={chat.isLoadingUsers}
                  currentUserId={currentUser.id}
                  isLoadingConversations={chat.isLoadingConversations}
                  getDisplayName={chat.getDisplayName}
                  getOtherUserAvatar={chat.getOtherUserAvatar}
                  onSelect={handleSelectConversation}
                  onStartDM={chat.startDM}
                />
              </div>

              {/* Chat window or empty state */}
              <div
                className={`${!showMobileList ? "flex" : "hidden"
                  } md:flex flex-1 flex-col min-w-0`}
              >
                {chat.selectedConversation ? (
                  <ChatWindow
                    conversation={chat.selectedConversation}
                    messages={
                      chat.messages[chat.selectedConversationId ?? ""] ?? []
                    }
                    typingUsers={
                      chat.typingUsers[chat.selectedConversationId ?? ""] ?? []
                    }
                    hasMore={
                      chat.hasMoreMessages[chat.selectedConversationId ?? ""] ??
                      false
                    }
                    isLoadingMessages={chat.isLoadingMessages}
                    currentUserId={currentUser.id}
                    getDisplayName={chat.getDisplayName}
                    getOtherUserAvatar={chat.getOtherUserAvatar}
                    onSendMessage={chat.sendMessage}
                    onLoadMore={chat.loadMoreMessages}
                    onUpdateTyping={chat.updateTyping}
                    onBack={handleBack}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <MessageCircle className="h-14 w-14 text-muted-foreground/40" />
                    <div>
                      <p className="font-semibold">No conversation selected</p>
                      <p className="text-sm text-muted-foreground">
                        Pick a channel or start a direct message
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ── Slot your existing Notifications component here ──
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