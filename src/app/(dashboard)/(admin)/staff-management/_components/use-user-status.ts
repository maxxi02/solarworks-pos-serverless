// hooks/use-user-status.ts
import { useEffect, useRef } from "react";
import { socketClient, UserStatusUpdate } from "@/lib/socket-client";

export function useUserStatus(
  onStatusChange: (data: UserStatusUpdate) => void,
) {
  // Stabilize the callback reference
  const callbackRef = useRef(onStatusChange);
  
  useEffect(() => {
    callbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const stableCallback = (data: UserStatusUpdate) => {
      callbackRef.current(data);
    };

    console.log("Attaching status listener...");
    socketClient.onStatusChanged(stableCallback);

    return () => {
      console.log("Removing status listener");
      socketClient.offStatusChanged(stableCallback);
    };
  }, []); // Now dependency array is stable
}