// lib/use-notification-sound.ts
import { useCallback } from "react";

type NotificationType = "success" | "error" | "order";

export function useNotificationSound() {
  const play = useCallback((type: NotificationType) => {
    let fileName: string;

    switch (type) {
      case "success":
        fileName = "success-notification.mp3";
        break;
      case "error":
        fileName = "error-notification.mp3";
        break;
      case "order":
        fileName = "order-notification.mp3";
        break;
      default:
        return;
    }

    // Create fresh Audio instance each time → avoids overlap/locking issues
    const audio = new Audio(`/audio/${fileName}`);

    // Optional: lower volume for notifications (0–1)
    audio.volume = 0.45;

    audio.play().catch((err) => {
      console.warn("Audio play failed:", err);
      // Most common reasons: autoplay policy or user hasn't interacted yet
    });
  }, []);

  return {
    playSuccess: () => play("success"),
    playError: () => play("error"),
    playOrder: () => play("order"),
  };
}
