"use client";
import React, { useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const layout = ({ children }: { children: React.ReactNode }) => {

  const [queryClient] = useState(() => new QueryClient());
  return <DashboardLayout>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>

  </DashboardLayout>;
};

export default layout;
