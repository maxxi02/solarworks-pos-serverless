// lib/use-notification-sound.ts
import { useCallback, useRef, useEffect } from "react";

type NotificationType = "success" | "error" | "order";

const audioCache: Record<string, HTMLAudioElement> = {};

export function useNotificationSound() {
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      hasUserInteracted.current = true;
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

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

    if (!audioCache[fileName]) {
      audioCache[fileName] = new Audio(`/audio/${fileName}`);
      audioCache[fileName].volume = 0.45;
    }

    const audio = audioCache[fileName];
    audio.currentTime = 0;

    audio.play().catch((err) => {
      if (!hasUserInteracted.current) {
        console.log("Waiting for user interaction to play audio");
      } else {
        console.warn("Audio play failed:", err);
      }
    });
  }, []);

  return {
    playSuccess: () => play("success"),
    playError: () => play("error"),
    playOrder: () => play("order"),
  };
}

export function preloadNotificationSounds() {
  const sounds = ["success-notification.mp3", "error-notification.mp3", "order-notification.mp3"];
  sounds.forEach(fileName => {
    const audio = new Audio(`/audio/${fileName}`);
    audio.load();
    audioCache[fileName] = audio;
  });
}