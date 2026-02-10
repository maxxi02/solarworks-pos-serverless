// hooks/use-presence.ts
"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { socketClient } from "@/lib/socket-client"; 

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ACTIVITY_DEBOUNCE = 5000; // 5 seconds

export function usePresence(): void {
  const { data: session } = authClient.useSession();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!session?.user?.id || isInitialized.current) return;

    isInitialized.current = true;

    // ─── Connect to Socket.IO ────────────────────────────────────

    const socket = socketClient.connect(session.user.id);

    // ─── Emit Online Status ──────────────────────────────────────

    const handleConnect = (): void => {
      // Only emit if socket is connected
      if (socketClient.isConnected()) {
        socketClient.emitOnline();
        console.log("📡 User status set to ONLINE");
      }
    };

    socket.on("connect", handleConnect);

    // Emit initial online status if already connected
    if (socketClient.isConnected()) {
      handleConnect();
    }

    // ─── Heartbeat ───────────────────────────────────────────────

    heartbeatRef.current = setInterval(() => {
      if (socketClient.isConnected()) {
        socketClient.emitActivity();
        console.log("💓 Heartbeat sent");
      }
    }, HEARTBEAT_INTERVAL);

    // ─── Activity Tracking ───────────────────────────────────────

    const handleActivity = (): void => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      activityTimeoutRef.current = setTimeout(() => {
        if (socketClient.isConnected()) {
          socketClient.emitActivity();
          console.log("👆 User activity detected");
        }
      }, ACTIVITY_DEBOUNCE);
    };

    // ─── Page Visibility ─────────────────────────────────────────

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        console.log("👀 Tab hidden");
      } else {
        console.log("👀 Tab visible again");
        // Check if connected before emitting
        if (socketClient.isConnected()) {
          socketClient.emitOnline();
        }
      }
    };

    // ─── Event Listeners ─────────────────────────────────────────

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ─── Cleanup ─────────────────────────────────────────────────

    return () => {
      console.log("🧹 Cleaning up presence hook");

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      socketClient.disconnect();
      isInitialized.current = false;
    };
  }, [session?.user?.id]);
}