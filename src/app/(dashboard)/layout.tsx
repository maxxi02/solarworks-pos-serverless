"use client";

import React from "react";
import DashboardLayout from "../DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { SocketProvider } from "@/hooks/useSocket";

const queryClient = new QueryClient();
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const userId = currentUser?.id;
  
  console.log("CURRENT USER ID:", JSON.stringify(userId));
  // Don't render SocketProvider until we have a user
  if (isPending || !currentUser) {
    return (
      <DashboardLayout>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </DashboardLayout>
    );
  }

  return (
    <SocketProvider
      userId={currentUser.id}
      userName={currentUser.name ?? ""}
      userAvatar={currentUser.image ?? ""}
    >
      <DashboardLayout>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </DashboardLayout>
    </SocketProvider>
  );
}