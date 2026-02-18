"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/lib/auth-client"; // adjust to your better-auth client import
import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatStore } from "@/store/chatStore";
import { ConversationSidebar } from "./_components/ConversationSidebar";
import { ChatWindow } from "./_components/ChatWindow";
import { CreateGroupModal } from "./_components/CreateGroupModal";
import { NewDMModal } from "./_components/NewModal";
import { cn } from "@/lib/utils";
import { MessageSquare, WifiOff } from "lucide-react";

export default function MessagingPage() {
  const { data: session } = useSession();
  const user = session?.user as
    | { id: string; name: string; image?: string; role?: string }
    | undefined;

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { isConnected, setActiveConversation, activeConversationId } =
    useChatStore();

  const { openConversation, loadMoreMessages, openDM } = useChatSocket({
    userId: user?.id ?? "",
    userName: user?.name ?? "",
    userAvatar: user?.image,
  });

  const handleGroupCreated = useCallback(
    (conversationId: string) => {
      openConversation(conversationId);
      setMobileSidebarOpen(false);
    },
    [openConversation],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversation(id);
      openConversation(id);
      setMobileSidebarOpen(false);
    },
    [openConversation, setActiveConversation],
  );

  const handleOpenDM = useCallback(
    (userId: string, userName: string, userAvatar?: string) => {
      openDM(userId, userName, userAvatar);
      setMobileSidebarOpen(false);
    },
    [openDM],
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-slate-500">
        <div className="text-center space-y-3">
          <MessageSquare size={40} className="mx-auto text-slate-700" />
          <p>Please sign in to access messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Connection banner */}
      {!isConnected && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 py-2 text-amber-400 text-xs font-medium shrink-0">
          <WifiOff size={12} />
          Connecting to chat server...
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Mobile overlay ────────────────────────────────────── */}
        {mobileSidebarOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div
          className={cn(
            "w-72 shrink-0 flex flex-col transition-transform duration-200 z-30",
            // Mobile: slide in from left
            "absolute inset-y-0 left-0 lg:relative lg:translate-x-0",
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
          )}
        >
          <ConversationSidebar
            currentUserId={user.id}
            currentUserRole={user.role ?? "user"}
            onNewGroup={() => setShowGroupModal(true)}
            onNewDM={() => setShowDMModal(true)}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* ── Chat window ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile header button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="absolute top-3.5 left-4 z-10 lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <MessageSquare size={16} />
          </button>

          <ChatWindow
            currentUserId={user.id}
            currentUserName={user.name}
            currentUserAvatar={user.image}
            onLoadMore={loadMoreMessages}
          />
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupCreated}
        currentUserId={user.id}
      />

      <NewDMModal
        isOpen={showDMModal}
        onClose={() => setShowDMModal(false)}
        onSelectUser={handleOpenDM}
        currentUserId={user.id}
      />
    </div>
  );
}
