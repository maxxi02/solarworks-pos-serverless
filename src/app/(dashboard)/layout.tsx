// app/(dashboard)/layout.tsx
"use client";

import React, { useState } from "react";
import DashboardLayout from "../DashboardLayout"; // assuming this is your existing layout wrapper
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Shadcn / UI components ──────────────────────────────────────
// Make sure these are installed & imported correctly
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Users, X, ChevronRight, Menu } from "lucide-react";

const HardcodedChatDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "groups">("recent");
  const [selectedChat, setSelectedChat] = useState<string | null>("1"); // Default to first chat
  const [showMobileChatList, setShowMobileChatList] = useState(true);

  // Fake data for demo
  const fakeConversations = [
    {
      id: "1",
      type: "private",
      name: "Maria Santos",
      avatar: "https://i.pravatar.cc/150?img=68",
      lastMessage: "Hey, can you cover my shift tomorrow?",
      time: "2m ago",
      unread: 3,
    },
    {
      id: "2",
      type: "private",
      name: "Juan Dela Cruz",
      avatar: "https://i.pravatar.cc/150?img=45",
      lastMessage: "Thanks for the coffee tips ☕",
      time: "1h ago",
      unread: 0,
    },
    {
      id: "3",
      type: "group",
      name: "Morning Shift Crew",
      avatar: null,
      lastMessage: "Don't forget to restock the pastries!",
      time: "15m ago",
      unread: 1,
    },
  ];

  const fakeMessages = [
    { id: "m1", sender: "Maria", content: "Hey boss, can I leave 30 mins early today?", isMe: false, time: "10:12 AM" },
    { id: "m2", sender: "You", content: "Sure, just finish closing the register first", isMe: true, time: "10:14 AM" },
    { id: "m3", sender: "Maria", content: "Thanks! 🙏", isMe: false, time: "10:15 AM" },
    { id: "m4", sender: "You", content: "No problem. See you tomorrow", isMe: true, time: "10:16 AM" },
  ];

  const selectedConversation = fakeConversations.find(c => c.id === selectedChat);

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <MessageCircle className="h-7 w-7" />
        <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px]">
          4
        </Badge>
      </button>

      {/* Full Screen Chat Drawer */}
      <div
        className={`fixed inset-0 z-50 bg-background transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Rendezvous Chat</h1>
              <Badge variant="outline" className="text-sm px-3 py-1">
                12 online
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Main Chat Area - Full Screen */}
          <div className="flex flex-1 overflow-hidden">
            {/* Chat List Sidebar - Hidden on mobile when chat is selected */}
            <div className={`${showMobileChatList ? "flex" : "hidden"
              } md:flex w-full md:w-80 lg:w-96 flex-col border-r bg-muted/10`}>
              {/* Search and Tabs */}
              <div className="p-4 space-y-4">
                <Input
                  placeholder="Search conversations..."
                  className="w-full"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab("recent")}
                    variant={activeTab === "recent" ? "default" : "ghost"}
                    className="flex-1"
                  >
                    Recent
                  </Button>
                  <Button
                    onClick={() => setActiveTab("groups")}
                    variant={activeTab === "groups" ? "default" : "ghost"}
                    className="flex-1"
                  >
                    Groups
                  </Button>
                </div>
              </div>

              {/* Conversation List */}
              <ScrollArea className="flex-1">
                <div className="px-2">
                  {fakeConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedChat(conv.id);
                        setShowMobileChatList(false); // Hide list on mobile when chat selected
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${selectedChat === conv.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                        }`}
                    >
                      <div className="relative">
                        {conv.avatar ? (
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conv.avatar} alt={conv.name} />
                            <AvatarFallback>{conv.name[0]}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {conv.unread > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-6 min-w-[1.5rem] rounded-full bg-red-500 p-0 text-xs leading-none">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-semibold">{conv.name}</p>
                          <span className={`ml-2 text-xs ${selectedChat === conv.id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                            }`}>{conv.time}</span>
                        </div>
                        <p className={`truncate text-sm ${selectedChat === conv.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                          }`}>{conv.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            {selectedConversation && (
              <div className={`flex-1 flex flex-col ${!showMobileChatList ? "flex" : "hidden md:flex"
                }`}>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 bg-background">
                  <div className="flex items-center gap-4">
                    {/* Mobile back button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setShowMobileChatList(true)}
                    >
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </Button>

                    <div className="flex items-center gap-3">
                      {selectedConversation.avatar ? (
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedConversation.avatar} />
                          <AvatarFallback>{selectedConversation.name[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-semibold">{selectedConversation.name}</h2>
                        <p className="text-sm text-green-600">● Active now</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {fakeMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-5 py-3 ${msg.isMe
                            ? "rounded-br-none bg-primary text-primary-foreground"
                            : "rounded-bl-none bg-muted"
                            }`}
                        >
                          <p className="text-base">{msg.content}</p>
                          <span className={`mt-1 block text-right text-xs ${msg.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-6 bg-background">
                  <form className="flex gap-3 max-w-4xl mx-auto">
                    <Input
                      placeholder="Type a message..."
                      className="flex-1 text-base py-6"
                    />
                    <Button size="lg" type="submit" className="px-6">
                      <Send className="h-5 w-5 mr-2" />
                      Send
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Empty State - No chat selected */}
            {!selectedConversation && (
              <div className="flex-1 hidden md:flex items-center justify-center bg-muted/5">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No chat selected</h3>
                  <p className="text-muted-foreground">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Hardcoded chat UI for now */}
        <HardcodedChatDemo />
      </QueryClientProvider>
    </DashboardLayout>
  );
}