import { useEffect } from "react";
import { socketClient, UserStatusUpdate } from "@/lib/socket-client";

export function useUserStatus(
  onStatusChange: (data: UserStatusUpdate) => void,
) {
  useEffect(() => {
    console.log("Attaching status listener...");
    socketClient.onStatusChanged(onStatusChange);

    return () => {
      console.log("Removing status listener");
      socketClient.offStatusChanged(onStatusChange);
    };
  }, [onStatusChange]);
}
