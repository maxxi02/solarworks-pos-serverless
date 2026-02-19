// hooks/use-user-status.ts
import { UserStatusUpdate, useSocket } from "@/hooks/useSocket";
import { useEffect, useRef } from "react";

export function useUserStatus(
  onStatusChange: (data: UserStatusUpdate) => void,
) {
  const { onStatusChanged, offStatusChanged } = useSocket();

  const callbackRef = useRef(onStatusChange);

  useEffect(() => {
    callbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const stableCallback = (data: UserStatusUpdate) => {
      callbackRef.current(data);
    };

    console.log("Attaching status listener...");
    onStatusChanged(stableCallback);

    return () => {
      console.log("Removing status listener");
      offStatusChanged(stableCallback);
    };
  }, [onStatusChanged, offStatusChanged]);
}