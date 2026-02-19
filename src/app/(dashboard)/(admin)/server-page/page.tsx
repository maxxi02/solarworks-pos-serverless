"use client";

import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "./_components/ConversationList";
import { ChatWindow } from "./_components/ChatWindow";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails } from "@/types/messaging.types";

interface MessagingPageProps {
  currentUserId: string;
  currentUserName: string;
  currentUserImage?: string;
}

export default function MessagesPage({
  currentUserId,
  currentUserName,
  currentUserImage,
}: MessagingPageProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const { conversations, isLoading, startConversation } =
    useConversations(currentUserId);

  const activeConversation = conversations.find(
    (c) => c._id === activeConversationId
  ) as ConversationWithDetails | undefined;

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileView("chat");
  };

  const handleStartNewDM = async (targetUserId: string) => {
    const convId = await startConversation(targetUserId);
    if (convId) {
      setActiveConversationId(convId);
      setMobileView("chat");
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Sidebar - conversation list */}
      <aside
        className={cn(
          "w-full md:w-80 lg:w-72 xl:w-80 flex-shrink-0 h-full",
          // Mobile: show only when on list view
          mobileView === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}
      >
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onStartNewDM={handleStartNewDM}
          currentUserId={currentUserId}
        />
      </aside>

      {/* Main chat panel */}
      <main
        className={cn(
          "flex-1 h-full flex flex-col",
          // Mobile: show only when on chat view
          mobileView === "list" ? "hidden md:flex" : "flex"
        )}
      >
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserImage={currentUserImage}
            onBack={() => setMobileView("list")}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mb-1">Your messages</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Select a conversation from the sidebar or start a new one using the + button.
      </p>
    </div>
  );
}