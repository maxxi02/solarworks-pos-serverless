"use client";

import React from "react";
import DashboardLayout from "../DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { SocketProvider } from "@/provider/socket-provider";

const queryClient = new QueryClient();
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  // Always mount SocketProvider — pass empty strings while session is loading.
  // The provider guards `if (!userId) return` internally, so no socket fires
  // until the real userId arrives. This prevents useSocket() from returning
  // the dead defaultContext (where userName is always "") on initial render.
  return (
    <SocketProvider
      userId={currentUser?.id ?? ""}
      userName={currentUser?.name ?? ""}
      userAvatar={currentUser?.image ?? ""}
    >
      <DashboardLayout>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </DashboardLayout>
    </SocketProvider>
  );
}
